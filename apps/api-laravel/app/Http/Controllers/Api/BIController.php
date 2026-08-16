<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BIController extends Controller
{
    /**
     * Top products/brands/categories
     */
    public function topProducts(Request $request): JsonResponse
    {
        $tenantId = Auth::user()->tenant_id;
        $tz       = config('app.timezone', 'America/Caracas');
        $days     = (int) $request->query('period', 30);
        $start    = Carbon::today($tz)->subDays($days);
        $end      = Carbon::tomorrow($tz);

        $top = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('items', 'sale_items.item_id', '=', 'items.id')
            ->leftJoin('brands', 'items.brand_id', '=', 'brands.id')
            ->leftJoin('categories', 'items.category_id', '=', 'categories.id')
            ->where('sale_items.tenant_id', $tenantId)
            ->whereNull('sale_items.deleted_at')
            ->whereNull('sales.deleted_at')
            ->whereNotIn('sales.status', ['ANULADO'])
            ->whereBetween('sales.sale_time', [$start, $end])
            ->select(
                'items.name as item_name',
                'brands.name as brand_name',
                'categories.name as category_name',
                DB::raw('SUM(sale_items.quantity_purchased) as total_quantity'),
                DB::raw('SUM(sale_items.quantity_purchased * sale_items.item_unit_price * (1 - sale_items.discount_percent/100)) as total_revenue')
            )
            ->groupBy('items.id', 'items.name', 'brands.name', 'categories.name')
            ->orderByDesc('total_quantity')
            ->limit(10)
            ->get();

        return response()->json($top);
    }

    /**
     * Sales trend over time
     */
    public function salesTrend(Request $request): JsonResponse
    {
        $tenantId = Auth::user()->tenant_id;
        $tz       = config('app.timezone', 'America/Caracas');
        $days     = (int) $request->query('period', 30);
        $itemId   = $request->query('item_id');
        $start    = Carbon::today($tz)->subDays($days);
        $end      = Carbon::tomorrow($tz);

        $trend = [];
        for ($i = $days; $i >= 0; $i--) {
            $d = Carbon::today($tz)->subDays($i)->format('Y-m-d');
            $trend[$d] = 0.0;
        }

        if ($itemId) {
            // Filtrar solo por el producto específico (ignora pagos directos de deudas)
            $sales = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->where('sale_items.tenant_id', $tenantId)
                ->where('sale_items.item_id', $itemId)
                ->whereNull('sale_items.deleted_at')
                ->whereNull('sales.deleted_at')
                ->whereNotIn('sales.status', ['ANULADO'])
                ->whereBetween('sales.sale_time', [$start, $end])
                ->select(
                    DB::raw('DATE(sales.sale_time) as date'),
                    DB::raw('SUM(sale_items.quantity_purchased * sale_items.item_unit_price * (1 - sale_items.discount_percent/100)) as revenue')
                )
                ->groupBy(DB::raw('DATE(sales.sale_time)'))
                ->get();

            foreach ($sales as $s) {
                if (isset($trend[$s->date])) $trend[$s->date] += (float)$s->revenue;
            }
        } else {
            // Comportamiento normal: ventas pagadas + abonos de deudas
            $sales = DB::table('sales')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->where('status', 'PAGADO')
                ->whereBetween('sale_time', [$start, $end])
                ->select(
                    DB::raw('DATE(sale_time) as date'),
                    DB::raw('SUM(total) as revenue')
                )
                ->groupBy(DB::raw('DATE(sale_time)'))
                ->get();

            $payments = DB::table('sale_payments')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->whereBetween('paid_at', [$start, $end])
                ->select(
                    DB::raw('DATE(paid_at) as date'),
                    DB::raw('SUM(amount) as revenue')
                )
                ->groupBy(DB::raw('DATE(paid_at)'))
                ->get();

            foreach ($sales as $s) {
                if (isset($trend[$s->date])) $trend[$s->date] += (float)$s->revenue;
            }
            foreach ($payments as $p) {
                if (isset($trend[$p->date])) $trend[$p->date] += (float)$p->revenue;
            }
        }

        $result = [];
        foreach ($trend as $date => $rev) {
            $result[] = ['date' => $date, 'revenue' => $rev];
        }

        return response()->json($result);
    }
}
