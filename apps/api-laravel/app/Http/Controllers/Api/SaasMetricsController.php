<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * SaasMetricsController — Centro de Comando del SaaS.
 *
 * Ruta:  GET /api/saas/metrics
 * Guard: auth:sanctum + role:SUPER_ADMIN
 *
 * Devuelve métricas de negocio en tiempo real para el Master Dashboard.
 */
class SaasMetricsController extends Controller
{
    public function metrics(): JsonResponse
    {
        // ── 1. Conteos globales ───────────────────────────────────────────
        $totalStores = Store::count();

        // Tiendas en periodo de prueba activo (trial_ends_at en el futuro)
        $trialActive = Store::whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', Carbon::now())
            ->count();

        // Tiendas con trial expirado (trial_ends_at en el pasado)
        $trialExpired = Store::whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', Carbon::now())
            ->count();

        // Tiendas activas (is_active = true)
        $activeStores = Store::where('is_active', true)->count();

        // Tiendas suspendidas (is_active = false)
        $suspendedStores = Store::where('is_active', false)->count();

        // Nuevas tiendas en los últimos 30 días
        $newThisMonth = Store::where('created_at', '>=', Carbon::now()->subDays(30))->count();

        // ── 2. Últimas 5 tiendas registradas ─────────────────────────────
        $recentStores = Store::orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function (Store $store) {
                // Intentar obtener el admin de la tienda
                $owner = $store->users()
                    ->whereIn('role', ['ADMIN', 'STORE_ADMIN'])
                    ->orderBy('created_at')
                    ->first();

                // Determinar estado del trial
                $trialStatus = 'none';
                $trialDaysLeft = null;
                if ($store->trial_ends_at) {
                    if (Carbon::now()->lessThan($store->trial_ends_at)) {
                        $trialStatus = 'active';
                        $trialDaysLeft = (int) Carbon::now()->diffInDays($store->trial_ends_at);
                    } else {
                        $trialStatus = 'expired';
                        $trialDaysLeft = 0;
                    }
                }

                // Última actividad (basada en la última venta)
                $lastSale = \App\Models\Sale::where('tenant_id', $store->id)
                    ->orderBy('sale_time', 'desc')
                    ->first();
                $lastActivityAt = $lastSale ? $lastSale->sale_time->toISOString() : null;

                return [
                    'id'            => $store->id,
                    'name'          => $store->name,
                    'ownerEmail'    => $store->owner_email ?? $owner?->email ?? 'N/A',
                    'ownerName'     => $owner ? $owner->full_name : 'N/A',
                    'plan'          => $store->plan ?? 'STANDARD',
                    'isActive'      => $store->is_active,
                    'trialStatus'   => $trialStatus,
                    'trialDaysLeft' => $trialDaysLeft,
                    'trialEndsAt'   => $store->trial_ends_at?->toISOString(),
                    'registeredAt'  => $store->created_at->toISOString(),
                    'lastActivityAt'=> $lastActivityAt,
                ];
            });

        // ── 3. Distribución por plan ──────────────────────────────────────
        $byPlan = Store::selectRaw('plan, count(*) as total')
            ->groupBy('plan')
            ->pluck('total', 'plan')
            ->toArray();

        return response()->json([
            'summary' => [
                'totalStores'     => $totalStores,
                'activeStores'    => $activeStores,
                'suspendedStores' => $suspendedStores,
                'trialActive'     => $trialActive,
                'trialExpired'    => $trialExpired,
                'newThisMonth'    => $newThisMonth,
            ],
            'byPlan'       => $byPlan,
            'recentStores' => $recentStores,
            'generatedAt'  => Carbon::now()->toISOString(),
        ]);
    }
}
