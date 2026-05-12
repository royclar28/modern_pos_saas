# Spec: Historial y Auditoría de Cierre de Caja (Cash Shift History & Audit)

**Versión:** 1.0
**Fecha:** 2026-05-12
**Stack:** Laravel 12 (Backend) + React/Dexie (Frontend)

---

## 1. Diagnóstico y Diseño

### 1.1 Situación actual

| Componente | Estado |
|---|---|
| Modelo `CashShift` | ✅ Listo — con `user()`, `sales_summary` (JSON), casts correctos |
| `sales_summary` actual | `Record<string, number>` — solo totales agregados por método de pago |
| Referencias Pago Móvil | ❌ NO están en `sales_summary`. Viven en `sales.reference` y `sale_payments.reference` |
| API de turnos | ❌ No existe — no hay `CashShiftController` |
| Pantalla de historial | ❌ No existe — App.tsx tiene placeholder "Reporte Z" → `/admin/sales` que es el SalesDashboard |

### 1.2 Estrategia de conciliación Pago Móvil

El `sales_summary` guarda `{"PAGO_MOVIL": 150.00}` (total), pero **no** los datos individuales para conciliar con el banco. Solución:

1. El `CashShiftController@index` retorna los turnos con su `sales_summary` + las referencias Pago Móvil extraídas de `sales` y `sale_payments` cuyo `paid_at` cae dentro del rango `[opened_at, closed_at]` del turno
2. Se usa una **única query** para todas las referencias del tenant, agrupadas luego por turno en PHP (evita N+1)

### 1.3 Estrategia de roles

| Rol | Acceso |
|---|---|
| `ADMIN` / `MANAGER` | ✅ Pueden ver historial de turnos de su tienda |
| `CASHIER` | ❌ Sin acceso (solo ven su turno activo en el POS) |

> Ruta existente en `App.tsx` línea 170: `ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']`

---

## 2. Backend — Laravel

### 2.1 CashShiftController

**Archivo:** `apps/api-laravel/app/Http/Controllers/Api/CashShiftController.php`

```php
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
```

### 2.2 Ruta en `routes/api.php`

Agregar dentro del grupo `auth:sanctum`, sección ADMIN/MANAGER (línea 69 del archivo actual):

```php
// ── Rutas para ADMIN y MANAGER ──────────────────────────────
Route::middleware('role:ADMIN,MANAGER')->group(function () {
    // Inventario
    Route::post('/inventory/scan-invoice', [InventoryController::class, 'scanInvoice']);

    // Sincronizar tasa BCV manualmente
    Route::post('/settings/bcv/sync', [SettingsController::class, 'getBcvRate']);

    // ── NUEVO: Historial de Cierres de Caja ─────────────────
    Route::get('/cash-shifts', [CashShiftController::class, 'index']);
});
```

**Import del controlador** (agregar al inicio de `routes/api.php`):

```php
use App\Http\Controllers\Api\CashShiftController;
```

### 2.3 Resumen de cambios Backend

| Archivo | Acción |
|---|---|
| `app/Http/Controllers/Api/CashShiftController.php` | **CREAR** |
| `routes/api.php` | **MODIFICAR** — agregar import + ruta `GET /api/cash-shifts` |

> **No requiere migraciones.** La tabla `cash_shifts` ya existe y tiene todos los campos necesarios.

---

## 3. Frontend — React

### 3.1 ShiftHistoryPage.tsx — Vista Principal

**Archivo:** `apps/web/src/pages/admin/ShiftHistoryPage.tsx`

```tsx
/**
 * ShiftHistoryPage.tsx — Historial de Cierres de Caja para Dueño/Admin.
 *
 * Muestra tabla con todos los turnos cerrados del tenant.
 * Al hacer clic en una fila, despliega el Corte Z completo
 * con referencias Pago Móvil para conciliación bancaria.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthProvider';
import { Link } from 'react-router-dom';

// ─── Tipos ───────────────────────────────────────────────────

interface CajeroInfo {
    id: string;
    full_name: string;
    username: string;
}

interface PagoMovilRef {
    paid_at: string;
    reference: string | null;
    amount: number;
    sale_id: string;
    source: 'sale' | 'payment';
}

interface ShiftRecord {
    id: string;
    opened_at: string;
    closed_at: string;
    terminal_id: string;
    starting_cash: number;
    expected_cash: number;
    actual_cash: number;
    difference: number;
    sales_summary: Record<string, number> | null;
    cajero: CajeroInfo;
    pago_movil_refs: PagoMovilRef[];
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// ─── Constantes ──────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
    DIVISA: '💵 Efectivo USD',
    EFECTIVO_BS: '🇻🇪 Efectivo Bs.',
    PAGO_MOVIL: '📱 Pago Móvil',
    PUNTO: '💳 Punto de Venta',
    FIADO: '📝 Fiado',
    OTRO: '📦 Otro',
    MIXTO: '🔀 Mixto',
};

const DIFFERENCE_COLORS = {
    zero: 'text-emerald-600 dark:text-emerald-400',
    positive: 'text-blue-600 dark:text-blue-400',
    negative: 'text-red-600 dark:text-red-400',
};

// ─── Utilidades ──────────────────────────────────────────────

const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getDiffClass = (diff: number) => {
    if (diff === 0) return DIFFERENCE_COLORS.zero;
    if (diff > 0) return DIFFERENCE_COLORS.positive;
    return DIFFERENCE_COLORS.negative;
};

// ─── Componente Principal ────────────────────────────────────

export const ShiftHistoryPage = () => {
    const { user, logout } = useAuth();
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

    // ── Fetch shifts ──────────────────────────────────────────
    const fetchShifts = useCallback(async (pageNum: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<{ data: ShiftRecord[]; pagination: PaginationMeta }>(
                `/cash-shifts?page=${pageNum}`
            );
            setShifts(res.data);
            setPagination(res.pagination);
        } catch (err: any) {
            setError(err.message || 'Error al cargar turnos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShifts(page);
    }, [page, fetchShifts]);

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header */}
            <header className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Link
                        to="/"
                        className="text-slate-300 hover:text-white text-xs sm:text-sm transition-colors"
                    >
                        ← Dashboard
                    </Link>
                    <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        📋 Historial de Caja
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-slate-300 text-xs sm:text-sm hidden sm:inline">
                        {user?.username}
                    </span>
                    <button
                        onClick={logout}
                        className="text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Salir
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Page info */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Cortes de Caja Realizados
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {pagination ? `${pagination.total} turno(s) cerrado(s)` : 'Cargando...'}
                    </p>
                </div>

                {/* Error state */}
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm flex items-center gap-2">
                        ⚠️ {error}
                        <button
                            onClick={() => fetchShifts(page)}
                            className="ml-auto text-red-600 dark:text-red-400 underline font-semibold"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse"
                            >
                                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && shifts.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                            Sin turnos cerrados todavía
                        </h3>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                            Los cierres de caja aparecerán aquí cuando los cajeros los realicen.
                        </p>
                    </div>
                )}

                {/* Shift cards (mobile-first card design, table on desktop) */}
                {!loading && shifts.length > 0 && (
                    <>
                        {/* Mobile: Cards */}
                        <div className="sm:hidden space-y-3">
                            {shifts.map(shift => (
                                <button
                                    key={shift.id}
                                    onClick={() => setSelectedShift(shift)}
                                    className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white text-sm">
                                                {formatDate(shift.closed_at)}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {formatTime(shift.closed_at)}
                                            </div>
                                        </div>
                                        <span className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-lg font-semibold">
                                            {shift.terminal_id}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-400">Cajero:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                                {shift.cajero.full_name}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Inicial:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                                {formatCurrency(shift.starting_cash)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Declarado:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                                {formatCurrency(shift.actual_cash)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Diferencia:</span>
                                            <span className={`font-bold ml-1 ${getDiffClass(shift.difference)}`}>
                                                {shift.difference > 0 ? '+' : ''}
                                                {formatCurrency(shift.difference)}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Desktop: Table */}
                        <div className="hidden sm:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                                        <th className="text-left px-6 py-4">Fecha / Hora</th>
                                        <th className="text-left px-6 py-4">Cajero</th>
                                        <th className="text-right px-6 py-4">Efectivo Inicial</th>
                                        <th className="text-right px-6 py-4">Efectivo Declarado</th>
                                        <th className="text-right px-6 py-4">Diferencia</th>
                                        <th className="text-center px-6 py-4">Terminal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {shifts.map(shift => (
                                        <tr
                                            key={shift.id}
                                            onClick={() => setSelectedShift(shift)}
                                            className="hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800 dark:text-white">
                                                    {formatDate(shift.closed_at)}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {formatTime(shift.closed_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                                    {shift.cajero.full_name}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    @{shift.cajero.username}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400">
                                                {formatCurrency(shift.starting_cash)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-800 dark:text-white font-semibold">
                                                {formatCurrency(shift.actual_cash)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                <span className={`font-bold px-2 py-1 rounded-lg text-xs inline-flex items-center gap-1 ${
                                                    shift.difference === 0
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                                        : shift.difference > 0
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                }`}>
                                                    {shift.difference === 0 ? '✓' : shift.difference > 0 ? '▲' : '▼'}
                                                    {shift.difference > 0 ? '+' : ''}
                                                    {formatCurrency(shift.difference)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg font-medium">
                                                    {shift.terminal_id}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ← Anterior
                                </button>
                                <span className="text-sm text-slate-500 dark:text-slate-400 px-4">
                                    Pág. {pagination.current_page} de {pagination.last_page}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                                    disabled={page === pagination.last_page}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Siguiente →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Detail Modal */}
            {selectedShift && (
                <ShiftDetailModal
                    shift={selectedShift}
                    onClose={() => setSelectedShift(null)}
                />
            )}
        </div>
    );
};

// ─── Modal de Detalle: Corte Z + Conciliación Pago Móvil ─────

interface ShiftDetailModalProps {
    shift: ShiftRecord;
    onClose: () => void;
}

const ShiftDetailModal = ({ shift, onClose }: ShiftDetailModalProps) => {
    const totalPagoMovil = shift.sales_summary?.['PAGO_MOVIL'] ?? 0;
    const totalPagoMovilRefs = shift.pago_movil_refs.reduce((sum, r) => sum + r.amount, 0);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-12 sm:pt-20 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white rounded-t-3xl">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            🧾 Corte Z
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition-colors"
                        >
                            ×
                        </button>
                    </div>
                    <p className="text-violet-100 text-sm mt-1">
                        {formatDate(shift.closed_at)} · {formatTime(shift.closed_at)}
                    </p>
                </div>

                <div className="p-6 space-y-5">
                    {/* Cajero y Terminal */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-lg">
                            👤
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 dark:text-white">
                                {shift.cajero.full_name}
                            </div>
                            <div className="text-slate-400 text-xs">
                                @{shift.cajero.username} · {shift.terminal_id}
                            </div>
                        </div>
                    </div>

                    {/* Resumen financiero */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-400 font-semibold uppercase mb-1">
                                Efectivo Inicial
                            </div>
                            <div className="text-xl font-black text-slate-700 dark:text-slate-300">
                                {formatCurrency(shift.starting_cash)}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-400 font-semibold uppercase mb-1">
                                Esperado en Caja
                            </div>
                            <div className="text-xl font-black text-slate-700 dark:text-slate-300">
                                {formatCurrency(shift.expected_cash)}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-400 font-semibold uppercase mb-1">
                                Declarado
                            </div>
                            <div className="text-xl font-black text-slate-700 dark:text-slate-300">
                                {formatCurrency(shift.actual_cash)}
                            </div>
                        </div>
                        <div className={`rounded-2xl p-4 border ${
                            shift.difference === 0
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                : shift.difference > 0
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}>
                            <div className="text-xs text-slate-400 font-semibold uppercase mb-1">
                                Diferencia
                            </div>
                            <div className={`text-xl font-black ${getDiffClass(shift.difference)}`}>
                                {shift.difference > 0 ? '+' : ''}
                                {formatCurrency(shift.difference)}
                            </div>
                            <div className="text-xs mt-1 font-medium">
                                {shift.difference === 0
                                    ? '✨ Cuadrado'
                                    : shift.difference > 0
                                        ? '📈 Sobrante'
                                        : '⚠️ Faltante'}
                            </div>
                        </div>
                    </div>

                    {/* Ventas por Método */}
                    {shift.sales_summary && Object.keys(shift.sales_summary).length > 0 && (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                                📊 Ventas por Método de Pago
                            </div>
                            {Object.entries(shift.sales_summary).map(([method, total]) => (
                                <div
                                    key={method}
                                    className="px-5 py-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-700 text-sm"
                                >
                                    <span className="text-slate-600 dark:text-slate-300">
                                        {PAYMENT_LABELS[method] || method}
                                    </span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                        {formatCurrency(total)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── SECCIÓN CRÍTICA: Referencias Pago Móvil ── */}
                    <div className="border-2 border-amber-300 dark:border-amber-700 rounded-2xl overflow-hidden bg-amber-50/30 dark:bg-amber-900/10">
                        <div className="bg-amber-100 dark:bg-amber-900/30 px-5 py-3 text-xs font-bold uppercase text-amber-800 dark:text-amber-300 tracking-wider flex items-center gap-2">
                            🏦 Conciliación Pago Móvil
                            <span className="ml-auto font-mono text-amber-600 dark:text-amber-400">
                                {shift.pago_movil_refs.length} ref(s)
                            </span>
                        </div>

                        {shift.pago_movil_refs.length === 0 ? (
                            <div className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                                {totalPagoMovil > 0
                                    ? `⚠️ Hay $${totalPagoMovil.toFixed(2)} en Pago Móvil pero no se encontraron referencias individuales.`
                                    : 'No se registraron pagos por Pago Móvil en este turno.'}
                            </div>
                        ) : (
                            <>
                                {/* Tabla de referencias */}
                                <div className="divide-y divide-amber-100 dark:divide-amber-900/30 text-sm">
                                    {shift.pago_movil_refs.map((ref, idx) => (
                                        <div
                                            key={idx}
                                            className="px-5 py-3 flex items-center justify-between hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-lg">📱</span>
                                                <div className="min-w-0">
                                                    <div className="font-mono font-bold text-slate-800 dark:text-white truncate">
                                                        {ref.reference || 'Sin ref.'}
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate">
                                                        {ref.source === 'sale' ? 'Venta' : 'Abono'} · {ref.sale_id.slice(-8)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="font-mono font-bold text-slate-800 dark:text-white ml-3 shrink-0">
                                                {formatCurrency(ref.amount)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totales de conciliación */}
                                <div className="border-t-2 border-amber-200 dark:border-amber-700 px-5 py-3 bg-amber-50 dark:bg-amber-900/20 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Suma referencias
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white font-mono">
                                            {formatCurrency(totalPagoMovilRefs)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Total reportado
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white font-mono">
                                            {formatCurrency(totalPagoMovil)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-amber-200 dark:border-amber-700">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {totalPagoMovilRefs === totalPagoMovil
                                                ? '✅ Conciliado'
                                                : '⚠️ Diferencia'}
                                        </span>
                                        <span className={`font-bold font-mono ${
                                            totalPagoMovilRefs === totalPagoMovil
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {formatCurrency(totalPagoMovilRefs - totalPagoMovil)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Botón cerrar */}
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3.5 rounded-2xl transition-colors text-sm"
                    >
                        Cerrar Reporte
                    </button>
                </div>
            </div>
        </div>
    );
};
```

### 3.2 Cambios en `App.tsx`

**Archivo:** `apps/web/src/App.tsx`

**3.2.1** Agregar el import (junto a los demás imports de páginas admin):

```typescript
import { ShiftHistoryPage } from './pages/admin/ShiftHistoryPage';
```

**3.2.2** Agregar la ruta dentro de `<Route element={<ProtectedRoute />}>`:

```tsx
{/* Historial de Caja — ADMIN y MANAGER */}
<Route path="/admin/shifts" element={
    <RequireRole allowed={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
        <ShiftHistoryPage />
    </RequireRole>
} />
```

**3.2.3** (Opcional) Cambiar el link "Reporte Z" en el Dashboard para que apunte a `/admin/shifts`:

```tsx
{/* Reporte Z → Historial de Caja */}
{canAccessAdmin && (
    <Link
        to="/admin/shifts"
        className="group bg-white dark:bg-slate-800 border ..."
    >
        ...
    </Link>
)}
```

### 3.3 Resumen de cambios Frontend

| Archivo | Acción |
|---|---|
| `src/pages/admin/ShiftHistoryPage.tsx` | **CREAR** |
| `src/App.tsx` | **MODIFICAR** — agregar import + ruta |

---

## 4. Respuesta JSON de Ejemplo (`GET /api/cash-shifts?page=1`)

```json
{
  "data": [
    {
      "id": "cd3f8a...",
      "opened_at": "2026-05-12T08:00:00.000Z",
      "closed_at": "2026-05-12T16:30:00.000Z",
      "terminal_id": "CAJA_01",
      "starting_cash": 100.00,
      "expected_cash": 550.00,
      "actual_cash": 548.50,
      "difference": -1.50,
      "sales_summary": {
        "DIVISA": 300.00,
        "PAGO_MOVIL": 150.00,
        "PUNTO": 100.00
      },
      "cajero": {
        "id": "usr_abc",
        "full_name": "María González",
        "username": "maria"
      },
      "pago_movil_refs": [
        {
          "paid_at": "2026-05-12T10:15:00.000Z",
          "reference": "01234567",
          "amount": 75.00,
          "sale_id": "sale_xyz",
          "source": "sale"
        },
        {
          "paid_at": "2026-05-12T14:20:00.000Z",
          "reference": "02345678",
          "amount": 75.00,
          "sale_id": "sale_abc",
          "source": "payment"
        }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 42
  }
}
```

---

## 5. Resumen de Tareas

| # | Entorno | Tarea | Archivo(s) |
|---|---|---|---|
| 1 | **Backend** | Crear `CashShiftController` con método `index` | `app/Http/Controllers/Api/CashShiftController.php` |
| 2 | **Backend** | Agregar ruta `GET /api/cash-shifts` protegida para ADMIN/MANAGER | `routes/api.php` |
| 3 | **Frontend** | Crear `ShiftHistoryPage` con tabla + modal de detalle | `src/pages/admin/ShiftHistoryPage.tsx` |
| 4 | **Frontend** | Agregar import + ruta `/admin/shifts` en App.tsx | `src/App.tsx` |

---

## 6. Orden de Implementación

1. **Backend primero:**
   - [ ] Crear `CashShiftController.php` con el código del §2.1
   - [ ] Agregar import y ruta en `routes/api.php` (§2.2)
   - [ ] Probar con `curl` o Postman: `GET /api/cash-shifts?page=1`

2. **Frontend después:**
   - [ ] Crear `ShiftHistoryPage.tsx` con el código del §3.1
   - [ ] Agregar ruta en `App.tsx` (§3.2)
   - [ ] Verificar en navegador: Dashboard → Historial de Caja
   - [ ] Probar modal de detalle con referencias Pago Móvil
