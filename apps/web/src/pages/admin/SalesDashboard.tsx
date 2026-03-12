import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDatabase } from '../../db/database';
import { SaleDocType } from '../../db/schemas/sale.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a number as currency (USD by default) */
const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(n);

/** Return today's date as "YYYY-MM-DD" */
const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Convert a "YYYY-MM-DD" string to the start/end Unix ms boundaries for that day */
const dayBounds = (dateStr: string): [number, number] => {
    const start = new Date(dateStr + 'T00:00:00');
    const end   = new Date(dateStr + 'T23:59:59.999');
    return [start.getTime(), end.getTime()];
};

/** Format a Unix ms timestamp as a short time string */
const fmtTime = (ms: number) =>
    new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date(ms));

// ─── KPI Card ────────────────────────────────────────────────────────────────

type KpiCardProps = {
    icon: string;
    label: string;
    value: string;
    sub?: string;
    accent: string; // Tailwind gradient classes
};

const KpiCard = ({ icon, label, value, sub, accent }: KpiCardProps) => (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${accent}`}>
        {/* Decorative background circle */}
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-6 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative z-10">
            <span className="text-3xl">{icon}</span>
            <p className="mt-3 text-sm font-medium text-white/75 uppercase tracking-widest">{label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
            {sub && <p className="mt-1 text-xs text-white/60">{sub}</p>}
        </div>
    </div>
);

// ─── Main Sales Dashboard ────────────────────────────────────────────────────

export const SalesDashboard = () => {
    const [selectedDate, setSelectedDate] = useState<string>(todayStr());
    const [allSales, setAllSales] = useState<SaleDocType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Subscribe to RxDB — re-run whenever selectedDate changes ────────────
    useEffect(() => {
        let subscription: { unsubscribe: () => void } | null = null;

        const init = async () => {
            setIsLoading(true);
            try {
                const db = await getDatabase();
                const [start, end] = dayBounds(selectedDate);

                // RxDB reactive query — emits every time a matching doc changes
                const query = db.sales.find({
                    selector: {
                        saleTime: { $gte: start, $lte: end },
                    },
                    sort: [{ saleTime: 'desc' }],
                });

                subscription = query.$.subscribe((docs) => {
                    // RxDB returns DeepReadonlyObject wrappers — cast via unknown since the
                    // shape is identical at runtime; only TS readonly decorators differ.
                    setAllSales(docs.map((d) => d.toJSON()) as unknown as SaleDocType[]);
                    setIsLoading(false);
                });
            } catch (err) {
                console.error('[SalesDashboard] Error fetching sales:', err);
                setIsLoading(false);
            }
        };

        init();

        return () => {
            subscription?.unsubscribe();
        };
    }, [selectedDate]);

    // ── KPI calculations (memoized) ──────────────────────────────────────────
    const kpis = useMemo(() => {
        const ticketCount = allSales.length;
        const totalRevenue = allSales.reduce((sum, s) => sum + (s.total ?? 0), 0);
        const totalTax = allSales.reduce((sum, s) => sum + (s.taxAmount ?? 0), 0);
        const avgTicket = ticketCount > 0 ? totalRevenue / ticketCount : 0;
        return { ticketCount, totalRevenue, totalTax, avgTicket };
    }, [allSales]);

    const isToday = selectedDate === todayStr();

    return (
        <div className="flex flex-col h-screen bg-slate-50">

            {/* ── Navbar ─────────────────────────────────────────────────────── */}
            <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <span>📊</span>
                        <span>Reporte Z — Dashboard de Ventas</span>
                    </h1>
                    <nav className="hidden sm:flex gap-4">
                        <Link to="/" className="text-sm text-slate-300 hover:text-white transition-colors">
                            ← Dashboard
                        </Link>
                        <Link to="/admin/inventory" className="text-sm text-slate-300 hover:text-white transition-colors">
                            Inventario
                        </Link>
                        <Link to="/pos" className="text-sm text-slate-300 hover:text-white transition-colors">
                            Ir al POS →
                        </Link>
                    </nav>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-3">
                    {isToday && (
                        <span className="flex items-center gap-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            En vivo · hoy
                        </span>
                    )}
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Fecha</label>
                    <input
                        id="sales-date-filter"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-slate-800 text-white text-sm border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    />
                </div>
            </header>

            {/* ── Main Content ────────────────────────────────────────────────── */}
            <main className="flex-1 overflow-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* ── Section heading ─────────────────────────────────────── */}
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800">
                            {isToday
                                ? 'Resumen del día de hoy'
                                : `Resumen del ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                            }
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {isLoading
                                ? 'Cargando datos...'
                                : `${kpis.ticketCount} transacciones encontradas`
                            }
                        </p>
                    </div>

                    {/* ── KPI Cards ───────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                        <KpiCard
                            icon="💰"
                            label="Total Ingresos"
                            value={isLoading ? '—' : fmt(kpis.totalRevenue)}
                            sub="Suma de todos los tickets"
                            accent="bg-gradient-to-br from-violet-600 to-violet-800"
                        />
                        <KpiCard
                            icon="🧾"
                            label="Total Impuestos"
                            value={isLoading ? '—' : fmt(kpis.totalTax)}
                            sub="IVA acumulado del período"
                            accent="bg-gradient-to-br from-sky-500 to-sky-700"
                        />
                        <KpiCard
                            icon="🎫"
                            label="Tickets Emitidos"
                            value={isLoading ? '—' : kpis.ticketCount.toLocaleString('es-MX')}
                            sub="Número de transacciones"
                            accent="bg-gradient-to-br from-emerald-500 to-emerald-700"
                        />
                        <KpiCard
                            icon="📈"
                            label="Ticket Promedio"
                            value={isLoading ? '—' : fmt(kpis.avgTicket)}
                            sub="Ingresos / Cantidad tickets"
                            accent="bg-gradient-to-br from-amber-500 to-orange-600"
                        />
                    </div>

                    {/* ── Transaction Table ────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                        {/* Table header bar */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span>🗒️</span>
                                Historial de Tickets
                            </h3>
                            {!isLoading && allSales.length > 0 && (
                                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-medium">
                                    {allSales.length} registros
                                </span>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                        <th className="px-6 py-4">ID Ticket</th>
                                        <th className="px-6 py-4">Hora</th>
                                        <th className="px-6 py-4 text-center">Artículos</th>
                                        <th className="px-6 py-4 text-right">Subtotal</th>
                                        <th className="px-6 py-4 text-right">IVA</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {isLoading ? (
                                        /* Skeleton rows */
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                {Array.from({ length: 6 }).map((_, j) => (
                                                    <td key={j} className="px-6 py-4">
                                                        <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : allSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-16">
                                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                                    <span className="text-5xl">🏬</span>
                                                    <p className="font-semibold text-slate-500">Sin ventas para esta fecha</p>
                                                    <p className="text-sm">
                                                        {isToday
                                                            ? 'Las ventas registradas en el POS aparecerán aquí en tiempo real.'
                                                            : 'No se encontraron transacciones para el día seleccionado.'}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        allSales.map((sale) => {
                                            const totalItems = sale.items.reduce(
                                                (sum, item) => sum + (item.quantityPurchased ?? 1),
                                                0
                                            );
                                            return (
                                                <tr
                                                    key={sale.id}
                                                    className="hover:bg-violet-50/30 transition-colors"
                                                >
                                                    {/* Ticket ID */}
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                                            {sale.invoiceNumber ?? sale.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                    </td>

                                                    {/* Time */}
                                                    <td className="px-6 py-4 text-slate-600 tabular-nums">
                                                        {fmtTime(sale.saleTime)}
                                                    </td>

                                                    {/* Item count */}
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                                                            {totalItems}
                                                        </span>
                                                    </td>

                                                    {/* Subtotal */}
                                                    <td className="px-6 py-4 text-right text-slate-500 tabular-nums">
                                                        {fmt(sale.subtotal)}
                                                    </td>

                                                    {/* Tax */}
                                                    <td className="px-6 py-4 text-right text-slate-500 tabular-nums">
                                                        {fmt(sale.taxAmount)}
                                                    </td>

                                                    {/* Total */}
                                                    <td className="px-6 py-4 text-right font-bold text-violet-700 tabular-nums">
                                                        {fmt(sale.total)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>

                                {/* Table footer with totals */}
                                {!isLoading && allSales.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-sm">
                                            <td colSpan={3} className="px-6 py-4 text-slate-700 uppercase tracking-wider text-xs">
                                                TOTALES DEL DÍA
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-700 tabular-nums">
                                                {fmt(allSales.reduce((s, x) => s + x.subtotal, 0))}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-700 tabular-nums">
                                                {fmt(kpis.totalTax)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-violet-700 tabular-nums text-base">
                                                {fmt(kpis.totalRevenue)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* ── Footer note ─────────────────────────────────────────── */}
                    <p className="text-center text-xs text-slate-400 pb-4">
                        Los datos se actualizan en tiempo real desde RxDB · Reporte Z generado a las{' '}
                        {new Date().toLocaleTimeString('es-MX')}
                    </p>
                </div>
            </main>
        </div>
    );
};

export default SalesDashboard;
