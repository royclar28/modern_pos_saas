import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getOutboxDB } from '../../db/outbox';
import { SaleDocType } from '../../db/schemas/sale.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(n);

const fmtBs = (n: number) => `Bs. ${n.toFixed(2)}`;

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dayBounds = (dateStr: string): [number, number] => {
    const start = new Date(dateStr + 'T00:00:00');
    const end   = new Date(dateStr + 'T23:59:59.999');
    return [start.getTime(), end.getTime()];
};

const fmtTime = (ms: number) =>
    new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date(ms));

// ─── Payment Method Badge ─────────────────────────────────────────────────────

const PAYMENT_BADGE_MAP: Record<string, { label: string; icon: string; bg: string; text: string }> = {
    DIVISA:      { label: 'Divisa $',     icon: '💵', bg: 'bg-green-100',  text: 'text-green-800' },
    EFECTIVO_BS: { label: 'Efectivo Bs.', icon: '💰', bg: 'bg-amber-100',  text: 'text-amber-800' },
    PAGO_MOVIL:  { label: 'Pago Móvil',  icon: '📱', bg: 'bg-blue-100',   text: 'text-blue-800' },
    PUNTO:       { label: 'Punto',        icon: '💳', bg: 'bg-indigo-100', text: 'text-indigo-800' },
};

const PaymentBadge = ({ method }: { method?: string }) => {
    const info = PAYMENT_BADGE_MAP[method || ''] || { label: method || 'N/A', icon: '❓', bg: 'bg-slate-100', text: 'text-slate-600' };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${info.bg} ${info.text}`}>
            <span className="text-sm">{info.icon}</span>
            {info.label}
        </span>
    );
};

// ─── Arqueo Card ──────────────────────────────────────────────────────────────

type ArqueoCardProps = {
    icon: string;
    label: string;
    valueUsd: string;
    valueBs?: string;
    sub?: string;
    accent: string;
    ticketCount?: number;
};

const ArqueoCard = ({ icon, label, valueUsd, valueBs, sub, accent, ticketCount }: ArqueoCardProps) => (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${accent}`}>
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-6 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative z-10">
            <div className="flex items-center justify-between">
                <span className="text-3xl">{icon}</span>
                {ticketCount !== undefined && (
                    <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">
                        {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-white/70 uppercase tracking-widest">{label}</p>
            <p className="mt-1 text-2xl font-black tracking-tight">{valueUsd}</p>
            {valueBs && <p className="mt-0.5 text-sm font-bold text-white/50">{valueBs}</p>}
            {sub && <p className="mt-1 text-[10px] text-white/50">{sub}</p>}
        </div>
    </div>
);

// ─── Main Sales Dashboard / Arqueo de Caja ───────────────────────────────────

export const SalesDashboard = () => {
    const [selectedDate, setSelectedDate] = useState<string>(todayStr());
    const [exchangeRate, setExchangeRate] = useState(38.5); // fallback

    const db = getOutboxDB();

    // ── Fetch exchange rate from settings ───────────────────────────
    useEffect(() => {
        const fetchRate = async () => {
            try {
                const token = localStorage.getItem('pos_token');
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
                const res = await fetch(`${apiUrl}/settings`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.exchange_rate) setExchangeRate(parseFloat(data.exchange_rate));
                }
            } catch { /* offline — use fallback */ }
        };
        fetchRate();
    }, []);

    // ── Reactive query via Dexie liveQuery ────────────────────────────
    const [start, end] = dayBounds(selectedDate);
    const rawSales = useLiveQuery(
        () => db.sales
            .where('saleTime')
            .between(start, end, true, true)
            .reverse()
            .toArray(),
        [selectedDate],
    );
    const allSales = (rawSales ?? []) as SaleDocType[];
    const isLoading = rawSales === undefined;

    // ── Arqueo calculations (memoized) ───────────────────────────────
    const arqueo = useMemo(() => {
        const byMethod = (method: string) =>
            allSales.filter(s => s.paymentMethod === method);

        const sumTotal = (sales: SaleDocType[]) =>
            sales.reduce((sum, s) => sum + (s.total ?? 0), 0);

        const divisaSales = byMethod('DIVISA');
        const bsSales = byMethod('EFECTIVO_BS');
        const pagoMovilSales = byMethod('PAGO_MOVIL');
        const puntoSales = byMethod('PUNTO');

        const divisaTotal = sumTotal(divisaSales);
        const bsTotal = sumTotal(bsSales);
        const pagoMovilTotal = sumTotal(pagoMovilSales);
        const puntoTotal = sumTotal(puntoSales);

        const digitalTotal = pagoMovilTotal + puntoTotal;
        const grandTotal = divisaTotal + bsTotal + digitalTotal;

        const ticketCount = allSales.length;
        const totalTax = allSales.reduce((sum, s) => sum + (s.taxAmount ?? 0), 0);
        const avgTicket = ticketCount > 0 ? grandTotal / ticketCount : 0;

        // Legacy sales without paymentMethod
        const legacySales = allSales.filter(s => !s.paymentMethod);
        const legacyTotal = sumTotal(legacySales);

        return {
            divisaTotal, divisaCount: divisaSales.length,
            bsTotal, bsCount: bsSales.length,
            pagoMovilTotal, pagoMovilCount: pagoMovilSales.length,
            puntoTotal, puntoCount: puntoSales.length,
            digitalTotal, digitalCount: pagoMovilSales.length + puntoSales.length,
            grandTotal,
            ticketCount,
            totalTax,
            avgTicket,
            legacyTotal, legacyCount: legacySales.length,
        };
    }, [allSales]);

    const isToday = selectedDate === todayStr();

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors">

            {/* ── Navbar ─────────────────────────────────────────────────────── */}
            <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <span>📊</span>
                        <span>Arqueo de Caja — Reporte Z</span>
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
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Section heading */}
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                            {isToday
                                ? 'Cuadre de Caja — Hoy'
                                : `Cuadre del ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                            }
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {isLoading
                                ? 'Cargando datos...'
                                : `${arqueo.ticketCount} transacciones · Tasa BCV: Bs. ${exchangeRate.toFixed(2)}`
                            }
                        </p>
                    </div>

                    {/* ── Arqueo Cards (4 gavetas) ─────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <ArqueoCard
                            icon="💵"
                            label="Gaveta Dólares"
                            valueUsd={isLoading ? '—' : fmt(arqueo.divisaTotal)}
                            valueBs={isLoading ? undefined : fmtBs(arqueo.divisaTotal * exchangeRate)}
                            ticketCount={isLoading ? undefined : arqueo.divisaCount}
                            accent="bg-gradient-to-br from-green-600 to-emerald-800"
                        />
                        <ArqueoCard
                            icon="🇻🇪"
                            label="Gaveta Bolívares"
                            valueUsd={isLoading ? '—' : fmt(arqueo.bsTotal)}
                            valueBs={isLoading ? undefined : fmtBs(arqueo.bsTotal * exchangeRate)}
                            ticketCount={isLoading ? undefined : arqueo.bsCount}
                            accent="bg-gradient-to-br from-amber-500 to-orange-700"
                        />
                        <ArqueoCard
                            icon="🏦"
                            label="Bancos (Digital)"
                            valueUsd={isLoading ? '—' : fmt(arqueo.digitalTotal)}
                            valueBs={isLoading ? undefined : fmtBs(arqueo.digitalTotal * exchangeRate)}
                            sub={isLoading ? undefined
                                : `📱 P. Móvil: ${fmt(arqueo.pagoMovilTotal)} (${arqueo.pagoMovilCount}) · 💳 Punto: ${fmt(arqueo.puntoTotal)} (${arqueo.puntoCount})`
                            }
                            ticketCount={isLoading ? undefined : arqueo.digitalCount}
                            accent="bg-gradient-to-br from-blue-600 to-indigo-800"
                        />
                        <ArqueoCard
                            icon="📈"
                            label="Total General"
                            valueUsd={isLoading ? '—' : fmt(arqueo.grandTotal)}
                            valueBs={isLoading ? undefined : fmtBs(arqueo.grandTotal * exchangeRate)}
                            sub={isLoading ? undefined
                                : `${arqueo.ticketCount} tickets · Promedio: ${fmt(arqueo.avgTicket)} · IVA: ${fmt(arqueo.totalTax)}`
                            }
                            accent="bg-gradient-to-br from-violet-600 to-violet-900"
                        />
                    </div>

                    {/* ── Legacy data warning ─────────────────────────────────── */}
                    {!isLoading && arqueo.legacyCount > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium flex items-center gap-2">
                            <span className="text-base">⚠️</span>
                            <span>
                                {arqueo.legacyCount} venta{arqueo.legacyCount > 1 ? 's' : ''} sin método de pago registrado ({fmt(arqueo.legacyTotal)}).
                                Corresponden a transacciones anteriores a la actualización.
                            </span>
                        </div>
                    )}

                    {/* ── Transaction Table ────────────────────────────────────── */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">

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
                                        <th className="px-5 py-3.5">ID Ticket</th>
                                        <th className="px-5 py-3.5">Hora</th>
                                        <th className="px-5 py-3.5">Método de Pago</th>
                                        <th className="px-5 py-3.5">Referencia</th>
                                        <th className="px-5 py-3.5 text-center">Art.</th>
                                        <th className="px-5 py-3.5 text-right">Subtotal</th>
                                        <th className="px-5 py-3.5 text-right">IVA</th>
                                        <th className="px-5 py-3.5 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                {Array.from({ length: 8 }).map((_, j) => (
                                                    <td key={j} className="px-5 py-4">
                                                        <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : allSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-16">
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
                                                (sum, item) => sum + (item.quantityPurchased ?? 1), 0
                                            );
                                            return (
                                                <tr key={sale.id} className="hover:bg-violet-50/30 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                                            {sale.invoiceNumber ?? sale.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-600 tabular-nums text-xs">
                                                        {fmtTime(sale.saleTime)}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <PaymentBadge method={sale.paymentMethod} />
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {sale.reference ? (
                                                            <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                                                                {sale.reference}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                                                            {totalItems}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right text-slate-500 tabular-nums">
                                                        {fmt(sale.subtotal)}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right text-slate-500 tabular-nums">
                                                        {fmt(sale.taxAmount)}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-bold text-violet-700 tabular-nums">
                                                        {fmt(sale.total)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>

                                {!isLoading && allSales.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-sm">
                                            <td colSpan={5} className="px-5 py-4 text-slate-700 uppercase tracking-wider text-xs">
                                                TOTALES DEL DÍA
                                            </td>
                                            <td className="px-5 py-4 text-right text-slate-700 tabular-nums">
                                                {fmt(allSales.reduce((s, x) => s + x.subtotal, 0))}
                                            </td>
                                            <td className="px-5 py-4 text-right text-slate-700 tabular-nums">
                                                {fmt(arqueo.totalTax)}
                                            </td>
                                            <td className="px-5 py-4 text-right text-violet-700 tabular-nums text-base">
                                                {fmt(arqueo.grandTotal)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* ── Desglose por Método (mini-table) ─────────────────────── */}
                    {!isLoading && allSales.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <span>🧮</span>
                                    Desglose por Método de Pago
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                            <th className="px-6 py-3">Método</th>
                                            <th className="px-6 py-3 text-center">Tickets</th>
                                            <th className="px-6 py-3 text-right">Total USD</th>
                                            <th className="px-6 py-3 text-right">Total Bs.</th>
                                            <th className="px-6 py-3 text-right">% del Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {[
                                            { method: 'DIVISA', total: arqueo.divisaTotal, count: arqueo.divisaCount },
                                            { method: 'EFECTIVO_BS', total: arqueo.bsTotal, count: arqueo.bsCount },
                                            { method: 'PAGO_MOVIL', total: arqueo.pagoMovilTotal, count: arqueo.pagoMovilCount },
                                            { method: 'PUNTO', total: arqueo.puntoTotal, count: arqueo.puntoCount },
                                        ].filter(row => row.count > 0).map(row => {
                                            const pct = arqueo.grandTotal > 0 ? (row.total / arqueo.grandTotal) * 100 : 0;
                                            return (
                                                <tr key={row.method} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <PaymentBadge method={row.method} />
                                                    </td>
                                                    <td className="px-6 py-3.5 text-center font-bold text-slate-700">
                                                        {row.count}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right font-bold text-slate-800 tabular-nums">
                                                        {fmt(row.total)}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">
                                                        {fmtBs(row.total * exchangeRate)}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-violet-500 rounded-full transition-all"
                                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-600 tabular-nums w-12 text-right">
                                                                {pct.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-sm">
                                            <td className="px-6 py-3.5 text-slate-700 uppercase tracking-wider text-xs">TOTAL</td>
                                            <td className="px-6 py-3.5 text-center text-slate-700">{arqueo.ticketCount}</td>
                                            <td className="px-6 py-3.5 text-right text-violet-700 tabular-nums">{fmt(arqueo.grandTotal)}</td>
                                            <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">{fmtBs(arqueo.grandTotal * exchangeRate)}</td>
                                            <td className="px-6 py-3.5 text-right text-xs font-bold text-slate-600">100%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <p className="text-center text-xs text-slate-400 pb-4">
                        Los datos se actualizan en tiempo real desde Dexie · Reporte Z generado a las{' '}
                        {new Date().toLocaleTimeString('es-MX')}
                    </p>
                </div>
            </main>
        </div>
    );
};

export default SalesDashboard;
