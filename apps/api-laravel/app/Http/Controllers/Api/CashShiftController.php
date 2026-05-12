<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashShift;
use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;

class CashShiftController extends Controller
{
    /**
     * GET /api/cash-shifts
     *
     * Historial completo de turnos del tenant, con datos del cajero,
     * desglose del sales_summary, y referencias de Pago Móvil para
     * conciliación bancaria.
     *
     * Query params opcionales:
     *   ?from=2026-01-01   — filtrar desde fecha
     *   ?to=2026-12-31     — filtrar hasta fecha
     *   ?page=1            — paginación (15 por página)
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = Auth::user()->tenant_id;

        // ── 1. Query base de turnos cerrados ──────────────────────
        $query = CashShift::where('tenant_id', $tenantId)
            ->where('status', 'CLOSED')
            ->with('user:id,first_name,last_name,username')  // solo campos necesarios
            ->orderByDesc('closed_at');

        // Filtros de fecha opcionales
        if ($from = $request->query('from')) {
            $query->where('closed_at', '>=', $from . ' 00:00:00');
        }
        if ($to = $request->query('to')) {
            $query->where('closed_at', '<=', $to . ' 23:59:59');
        }

        $shifts = $query->paginate(15);

        // ── 2. Extraer referencias Pago Móvil en lote ─────────────
        // Recolectamos todos los rangos [opened_at, closed_at] de los turnos
        $ranges = $shifts->map(fn (CashShift $s) => [
            'id'        => $s->id,
            'opened_at' => $s->opened_at,
            'closed_at' => $s->closed_at,
        ]);

        // Si no hay turnos, retornamos vacío temprano
        if ($ranges->isEmpty()) {
            return response()->json([
                'data'       => [],
                'pagination' => $this->paginationMeta($shifts),
            ]);
        }

        // Obtenemos la fecha mínima y máxima global de esta página
        $globalStart = $ranges->min('opened_at');
        $globalEnd   = $ranges->max('closed_at');

        // Query única de Pago Móvil: payments + sales con reference
        $pagoMovilData = $this->fetchPagoMovilReferences($tenantId, $globalStart, $globalEnd);

        // ── 3. Armar respuesta enriquecida ────────────────────────
        $data = $shifts->map(function (CashShift $shift) use ($pagoMovilData, $ranges) {
            // Filtrar referencias que pertenecen a este turno
            $shiftRefs = $pagoMovilData->filter(function (array $ref) use ($shift) {
                $paidAt = $ref['paid_at'];
                return $paidAt >= $shift->opened_at->toISOString()
                    && $paidAt <= $shift->closed_at->toISOString();
            })->values();

            return [
                'id'              => $shift->id,
                'opened_at'       => $shift->opened_at->toISOString(),
                'closed_at'       => $shift->closed_at?->toISOString(),
                'terminal_id'     => $shift->terminal_id,
                'starting_cash'   => (float) $shift->starting_cash,
                'expected_cash'   => (float) $shift->expected_cash,
                'actual_cash'     => (float) $shift->actual_cash,
                'difference'      => (float) $shift->difference,
                'sales_summary'   => $shift->sales_summary,
                'cajero'          => [
                    'id'        => $shift->user?->id,
                    'full_name' => $shift->user?->full_name ?? 'N/D',
                    'username'  => $shift->user?->username,
                ],
                'pago_movil_refs' => $shiftRefs->toArray(),
            ];
        });

        return response()->json([
            'data'       => $data,
            'pagination' => $this->paginationMeta($shifts),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────

    /**
     * Obtiene todas las referencias de Pago Móvil en un rango de fechas.
     * 
     * Combina dos fuentes:
     *   1. sales.reference (cuando payment_method = 'PAGO_MOVIL')
     *   2. sale_payments.reference (cuando payment_method = 'PAGO_MOVIL',
     *      útil para pagos mixtos o parciales)
     *
     * @return Collection<array{paid_at: string, reference: string|null, amount: float, sale_id: string, source: string}>
     */
    private function fetchPagoMovilReferences(
        string $tenantId,
        string $globalStart,
        string $globalEnd
    ): Collection {
        // Fuente A: Ventas con método PAGO_MOVIL y reference NO nulo
        $salesRefs = Sale::where('tenant_id', $tenantId)
            ->where('payment_method', 'PAGO_MOVIL')
            ->whereNotNull('reference')
            ->where('reference', '!=', '')
            ->whereBetween('sale_time', [$globalStart, $globalEnd])
            ->select('id as sale_id', 'reference', 'total as amount', 'sale_time as paid_at')
            ->get()
            ->map(fn (Sale $s) => [
                'paid_at'   => $s->paid_at->toISOString(),
                'reference' => $s->reference,
                'amount'    => (float) $s->amount,
                'sale_id'   => $s->sale_id,
                'source'    => 'sale',
            ]);

        // Fuente B: Pagos individuales PAGO_MOVIL (casos de pago mixto o abonos)
        $paymentRefs = SalePayment::where('tenant_id', $tenantId)
            ->where('payment_method', 'PAGO_MOVIL')
            ->whereNotNull('reference')
            ->where('reference', '!=', '')
            ->whereBetween('paid_at', [$globalStart, $globalEnd])
            ->select('sale_id', 'reference', 'amount', 'paid_at')
            ->get()
            ->map(fn (SalePayment $sp) => [
                'paid_at'   => $sp->paid_at->toISOString(),
                'reference' => $sp->reference,
                'amount'    => (float) $sp->amount,
                'sale_id'   => $sp->sale_id,
                'source'    => 'payment',
            ]);

        return $salesRefs->concat($paymentRefs);
    }

    private function paginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'per_page'     => $paginator->perPage(),
            'total'        => $paginator->total(),
        ];
    }
}
