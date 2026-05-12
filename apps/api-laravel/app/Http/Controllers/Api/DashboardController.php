<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard/summary
     *
     * Resumen financiero del día para el Dashboard del tenant.
     *
     * Lógica de ingresos reales de caja:
     *   revenue = ventas_pagadas_hoy + abonos_recibidos_hoy
     *
     * Los fiados nuevos (status=FIADO) NO cuentan como ingreso hasta
     * que se registra un SalePayment sobre ellos.
     */
    public function summary(Request $request): JsonResponse
    {
        $tenantId = Auth::user()->tenant_id;
        $tz       = config('app.timezone', 'America/Caracas');
        $today    = Carbon::today($tz);
        $tomorrow = $today->copy()->addDay();

        // ── 1. Ventas del día (excluye ANULADO) ───────────────────────
        $sales = Sale::where('tenant_id', $tenantId)
            ->whereBetween('sale_time', [$today, $tomorrow])
            ->whereNotIn('status', ['ANULADO'])
            ->with('saleItems')
            ->get();

        // Ventas completamente cobradas en el mismo día
        $directRevenue = $sales->where('status', 'PAGADO')->sum('total');

        // Fiados generados hoy (deuda nueva — no es ingreso de caja)
        $newDebtAmount = $sales->where('status', 'FIADO')->sum('total');
        $newDebtCount  = $sales->where('status', 'FIADO')->count();

        // ── 2. Abonos recibidos HOY sobre fiados de cualquier fecha ───
        // Estos SÍ cuentan como ingreso real de caja del día
        $debtPaymentsToday = SalePayment::where('tenant_id', $tenantId)
            ->whereBetween('paid_at', [$today, $tomorrow])
            ->whereNull('deleted_at')
            ->sum('amount');

        // ── 3. Ingreso total real de caja ─────────────────────────────
        $totalRevenue = (float) $directRevenue + (float) $debtPaymentsToday;

        // ── 4. Unidades vendidas (soporta decimales para peso) ────────
        $unitsSold = $sales->sum(function ($sale) {
            return $sale->saleItems->sum('quantity_purchased');
        });

        // ── 5. Alertas de stock bajo ──────────────────────────────────
        $lowStockCount = Item::whereNotNull('min_stock_alert')
            ->whereColumn('stock', '<=', 'min_stock_alert')
            ->count();

        return response()->json([
            'date'               => $today->toDateString(),
            // Ingresos de caja
            'revenue'            => round($totalRevenue, 2),
            'direct_sales'       => round((float) $directRevenue, 2),
            'debt_payments'      => round((float) $debtPaymentsToday, 2),
            // Estadísticas de ventas
            'transaction_count'  => $sales->count(),
            'units_sold'         => round((float) $unitsSold, 3),
            // Fiados del día
            'new_debt_amount'    => round((float) $newDebtAmount, 2),
            'new_debt_count'     => $newDebtCount,
            // Alertas de inventario
            'low_stock_count'    => $lowStockCount,
        ]);
    }
}
