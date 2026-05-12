<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * CheckTrialStatus — Guardián del ciclo de vida del trial.
 *
 * Se aplica sobre el grupo auth:sanctum para proteger TODAS las rutas
 * autenticadas EXCEPTO la de perfil (/api/user) y cambio de contraseña.
 *
 * Lógica:
 *   - SUPER_ADMIN siempre tiene paso libre (gestión del SaaS).
 *   - Si trial_ends_at es null → plan activo/pagado → paso libre.
 *   - Si now() <= trial_ends_at → trial vigente → paso libre.
 *   - Si now() > trial_ends_at → BLOQUEADO → HTTP 402 con error=TRIAL_EXPIRED.
 *
 * El frontend detecta el código 402 y muestra el TrialExpiredGuard.
 *
 * Registro en bootstrap/app.php:
 *   $middleware->alias(['trial' => CheckTrialStatus::class]);
 *   Luego aplicar al grupo: ->middleware('trial') dentro del grupo auth:sanctum.
 */
class CheckTrialStatus
{
    /**
     * Rutas que siempre se permiten aunque el trial haya expirado.
     * Se comparan contra el path completo de la request.
     */
    private const ALLOWED_PATHS = [
        'api/user',
        'api/auth/change-password',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Sin usuario autenticado: dejar pasar (Sanctum lo rechazará después)
        if (!$user) {
            return $next($request);
        }

        // SUPER_ADMIN nunca se bloquea
        if ($user->role === 'SUPER_ADMIN') {
            return $next($request);
        }

        // Rutas de perfil siempre accesibles
        foreach (self::ALLOWED_PATHS as $path) {
            if ($request->is($path)) {
                return $next($request);
            }
        }

        // Cargar el store del usuario
        $store = $user->store;

        // Sin store o sin trial configurado → plan pagado/activo → libre
        if (!$store || $store->trial_ends_at === null) {
            return $next($request);
        }

        // Verificar si el trial expiró
        if (Carbon::now()->greaterThan($store->trial_ends_at)) {

            // Actualizar status en BD (lazy update — no bloquea si ya está actualizado)
            if ($store->status !== 'trial_expired') {
                $store->update(['status' => 'trial_expired']);
            }

            $daysExpired = (int) Carbon::now()->diffInDays($store->trial_ends_at);

            return response()->json([
                'error'       => 'TRIAL_EXPIRED',
                'message'     => 'Tu período de prueba ha expirado. Contacta al soporte para continuar.',
                'expired_at'  => $store->trial_ends_at->toISOString(),
                'days_ago'    => $daysExpired,
            ], 402); // 402 Payment Required — semántica correcta para "necesitas pagar"
        }

        return $next($request);
    }
}
