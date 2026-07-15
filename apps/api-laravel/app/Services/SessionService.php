<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Plan;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * SessionService — Control de dispositivos y sesiones activas.
 *
 * Problema: si un cajero se conecta desde su casa con el mismo
 * username/password, ¿cómo evitarlo?
 *
 * Solución:
 *   1. Cada login genera un "device fingerprint" único (hash IP + User-Agent)
 *   2. Se cuentan las sesiones activas con fingerprint DISTINTO del tenant
 *   3. Si el plan tiene max_devices = 1 y ya hay una sesión desde otro dispositivo,
 *      se rechaza el nuevo login
 *   4. Mismo dispositivo (mismo fingerprint) = nueva sesión sin consumir cupo
 *      (la sesión anterior del mismo fingerprint se revoca automáticamente)
 *   5. Sesiones inactivas > 30 min no cuentan para el límite
 *
 * Flujo:
 *   Login → SessionService::authorizeDevice($store, $request)
 *       → ¿Hay cupo? → Sí: crear token con metadata → continuar
 *       → ¿No hay cupo? → 403 "Límite de dispositivos alcanzado"
 */
class SessionService
{
    /** Ventana de inactividad para considerar una sesión como "viva" */
    private const ACTIVE_WINDOW_MINUTES = 30;

    // ─── Public API ─────────────────────────────────────────

    /**
     * Verifica si este dispositivo puede iniciar sesión en este tenant.
     * Si puede, devuelve el fingerprint. Si no, lanza excepción.
     *
     * @throws \RuntimeException con mensaje descriptivo si se excede el límite
     */
    public function authorizeDevice(Store $store, Request $request): string
    {
        $fingerprint = $this->fingerprint($request);
        $deviceName  = $request->header('X-Device-Name', $request->userAgent() ?? 'Desconocido');

        $plan = Plan::tryFrom($store->plan) ?? Plan::TRIAL;
        $maxDevices = $plan->maxDevices();

        if ($maxDevices <= 0) {
            throw new \RuntimeException('El plan actual no permite dispositivos.');
        }

        // Contar dispositivos ÚNICOS activos en este tenant
        $activeFingerprints = $this->countActiveDevices($store->id);

        // ¿Ya existe una sesión activa con este fingerprint? (mismo dispositivo)
        $existingSession = PersonalAccessToken::where('tokenable_type', 'App\Models\User')
            ->where('device_fingerprint', $fingerprint)
            ->where('last_activity_at', '>=', now()->subMinutes(self::ACTIVE_WINDOW_MINUTES))
            ->first();

        if ($existingSession) {
            // Mismo dispositivo — revocar la sesión anterior y permitir
            $existingSession->delete();
        } elseif ($activeFingerprints >= $maxDevices) {
            // Dispositivo nuevo y ya se alcanzó el límite
            throw new \RuntimeException(
                "Límite de dispositivos alcanzado ({$activeFingerprints}/{$maxDevices}). " .
                "Cierra sesión en otro dispositivo o actualiza tu plan. " .
                "Plan actual: {$plan->label()} ({$plan->price()}$/mes)."
            );
        }

        return $fingerprint;
    }

    /**
     * Cuenta cuántos dispositivos ÚNICOS están activos para un tenant.
     * Solo cuentan sesiones con actividad en los últimos 30 min.
     */
    public function countActiveDevices(string $tenantId): int
    {
        return PersonalAccessToken::where('tokenable_type', 'App\Models\User')
            ->whereHas('tokenable', fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereNotNull('device_fingerprint')
            ->where('last_activity_at', '>=', now()->subMinutes(self::ACTIVE_WINDOW_MINUTES))
            ->distinct('device_fingerprint')
            ->count('device_fingerprint');
    }

    /**
     * Lista las sesiones activas de un tenant (para el panel SUPER_ADMIN).
     */
    public function getActiveSessions(string $tenantId): array
    {
        return PersonalAccessToken::where('tokenable_type', 'App\Models\User')
            ->whereHas('tokenable', fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('last_activity_at', '>=', now()->subMinutes(self::ACTIVE_WINDOW_MINUTES))
            ->with('tokenable:id,tenant_id,username,first_name,last_name,role')
            ->get()
            ->map(fn ($token) => [
                'id'           => $token->id,
                'user'         => $token->tokenable?->username ?? 'N/A',
                'user_name'    => $token->tokenable
                    ? trim($token->tokenable->first_name . ' ' . $token->tokenable->last_name)
                    : 'N/A',
                'role'         => $token->tokenable?->role ?? 'N/A',
                'device_name'  => $token->device_name ?? 'Sin nombre',
                'fingerprint'  => Str::mask($token->device_fingerprint ?? '', '*', 8, 16),
                'ip_address'   => $token->ip_address ?? 'N/A',
                'last_activity'=> $token->last_activity_at?->diffForHumans() ?? 'N/A',
                'created_at'   => $token->created_at?->toISOString(),
            ])
            ->toArray();
    }

    /**
     * Revocar una sesión específica por ID de token.
     */
    public function revokeSession(string $tokenId): void
    {
        PersonalAccessToken::findOrFail($tokenId)?->delete();
    }

    /**
     * Actualizar last_activity_at de un token (llamado en cada request autenticado).
     */
    public function touchSession(PersonalAccessToken $token, Request $request): void
    {
        $token->update([
            'last_activity_at' => now(),
            'ip_address'       => $request->ip(),
        ]);
    }

    // ─── Private ────────────────────────────────────────────

    /**
     * Genera un fingerprint único a partir de IP + User-Agent.
     * Mismo dispositivo (misma IP + mismo navegador) = mismo fingerprint.
     */
    private function fingerprint(Request $request): string
    {
        $components = implode('|', [
            $request->ip(),
            $request->userAgent() ?? 'unknown',
        ]);

        return hash('sha256', $components);
    }
}
