<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard/summary
     *
     * Resumen financiero del día + deuda pendiente global para el Dashboard.
     *
     * Lógica de ingresos reales de caja:
     *   revenue = ventas_pagadas_hoy + abonos_recibidos_hoy
     *
     * Los fiados nuevos (status=FIADO) NO cuentan como ingreso hasta
     * que se registra un SalePayment sobre ellos.
     *
     * Secciones del response:
     *   today        — métricas del día actual
     *   debt         — deuda pendiente global (todas las fechas)
     *   stock        — alertas de inventario
     *   breakdown    — desglose por método de pago (hoy)
     */
    public function summary(Request $request): JsonResponse
    {
        $tenantId = Auth::user()->tenant_id;
        $tz       = config('app.timezone', 'America/Caracas');
        $today    = Carbon::today($tz);
        $tomorrow = $today->copy()->addDay();

        // ═══════════════════════════════════════════════════════════
        //  TODAY — Métricas del día
        // ═══════════════════════════════════════════════════════════

        $sales = Sale::where('tenant_id', $tenantId)
            ->whereBetween('sale_time', [$today, $tomorrow])
            ->whereNotIn('status', ['ANULADO'])
            ->with('saleItems')
            ->get();

        // Ventas completamente cobradas en el mismo día
        $directRevenue = $sales->where('status', 'PAGADO')->sum('total');

        // Fiados generados hoy (deuda nueva — no es ingreso de caja)
        $newDebtAmount = $sales->whereIn('status', ['FIADO', 'PENDIENTE'])->sum('total');
        $newDebtCount  = $sales->whereIn('status', ['FIADO', 'PENDIENTE'])->count();

        // Abonos recibidos HOY sobre fiados de cualquier fecha
        $debtPaymentsToday = SalePayment::where('tenant_id', $tenantId)
            ->whereBetween('paid_at', [$today, $tomorrow])
            ->whereNull('deleted_at')
            ->sum('amount');

        // Ingreso total real de caja
        $totalRevenue = (float) $directRevenue + (float) $debtPaymentsToday;

        // Unidades vendidas (soporta decimales para peso)
        $unitsSold = $sales->sum(function ($sale) {
            return $sale->saleItems->sum('quantity_purchased');
        });

        // ═══════════════════════════════════════════════════════════
        //  DEBT — Deuda pendiente global (todas las fechas)
        // ═══════════════════════════════════════════════════════════

        $debtQuery = Sale::where('tenant_id', $tenantId)
            ->whereIn('status', ['FIADO', 'PENDIENTE'])
            ->where('payment_method', 'FIADO');

        $totalDebt = (float) $debtQuery->sum(DB::raw('total - COALESCE(paid_amount, 0)'));

        $customersWithDebt = $debtQuery->clone()->distinct('customer_id')
            ->whereNotNull('customer_id')
            ->count('customer_id');

        // Ticket más antiguo en mora (para badge de urgencia)
        $oldestDebtSale = $debtQuery->orderBy('sale_time')->first();
        $oldestDebtDays = $oldestDebtSale
            ? max(0, (int) Carbon::now($tz)->diffInDays($oldestDebtSale->sale_time))
            : 0;

        // ═══════════════════════════════════════════════════════════
        //  STOCK — Alertas de inventario
        // ═══════════════════════════════════════════════════════════

        $lowStockCount = Item::whereNotNull('min_stock_alert')
            ->whereColumn('stock', '<=', 'min_stock_alert')
            ->count();

        $outOfStockCount = Item::where('stock', '<=', 0)->count();

        $totalItems = Item::count();

        // ═══════════════════════════════════════════════════════════
        //  BREAKDOWN — Desglose por método de pago (hoy)
        // ═══════════════════════════════════════════════════════════

        $breakdown = $sales
            ->groupBy('payment_method')
            ->map(function ($group, $method) {
                return [
                    'method'       => $method,
                    'count'        => $group->count(),
                    'total'        => round((float) $group->sum('total'), 2),
                    'percentage'   => 0, // calculado abajo
                ];
            })
            ->values()
            ->toArray();

        // Calcular porcentajes
        if ($totalRevenue > 0) {
            foreach ($breakdown as &$b) {
                $b['percentage'] = round(($b['total'] / max(1, $totalRevenue)) * 100, 1);
            }
        }

        // ═══════════════════════════════════════════════════════════
        //  RESPONSE
        // ═══════════════════════════════════════════════════════════

        return response()->json([
            // ── Today ──────────────────────────────────────────
            'today' => [
                'date'              => $today->toDateString(),
                'revenue'           => round($totalRevenue, 2),
                'direct_sales'      => round((float) $directRevenue, 2),
                'debt_payments'     => round((float) $debtPaymentsToday, 2),
                'transaction_count' => $sales->count(),
                'units_sold'        => round((float) $unitsSold, 3),
                'new_debt_amount'   => round((float) $newDebtAmount, 2),
                'new_debt_count'    => $newDebtCount,
                'breakdown'         => $breakdown,
            ],
            // ── Debt (global) ──────────────────────────────────
            'debt' => [
                'total_pending'        => round($totalDebt, 2),
                'customers_with_debt'  => $customersWithDebt,
                'oldest_debt_days'     => $oldestDebtDays,
                'pending_tickets'      => $debtQuery->count(),
            ],
            // ── Stock ─────────────────────────────────────────
            'stock' => [
                'low_stock_count'   => $lowStockCount,
                'out_of_stock_count'=> $outOfStockCount,
                'total_items'       => $totalItems,
            ],
        ]);
    }
}
