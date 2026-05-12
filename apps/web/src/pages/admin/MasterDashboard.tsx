import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MetricsSummary {
    totalStores: number;
    activeStores: number;
    suspendedStores: number;
    trialActive: number;
    trialExpired: number;
    newThisMonth: number;
}

interface RecentStore {
    id: string;
    name: string;
    ownerEmail: string;
    ownerName: string;
    plan: string;
    isActive: boolean;
    trialStatus: 'active' | 'expired' | 'none';
    trialDaysLeft: number | null;
    trialEndsAt: string | null;
    registeredAt: string;
}

interface MetricsData {
    summary: MetricsSummary;
    byPlan: Record<string, number>;
    recentStores: RecentStore[];
    generatedAt: string;
}

// ─── Lightweight inline toast ─────────────────────────────────────────────────
const toast = {
    _show(msg: string, bg: string) {
        const el = document.createElement('div');
        el.textContent = msg;
        Object.assign(el.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
            padding: '12px 20px', borderRadius: '12px', color: '#fff',
            background: bg, fontWeight: '700', fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,.3)', opacity: '0',
            transition: 'opacity .2s', fontFamily: 'system-ui, sans-serif',
        });
        document.body.appendChild(el);
        requestAnimationFrame(() => (el.style.opacity = '1'));
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
    },
    error(msg: string) { this._show('❌ ' + msg, '#dc2626'); },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({
    label, value, icon, color, sublabel, loading
}: {
    label: string;
    value: number | string;
    icon: string;
    color: 'violet' | 'emerald' | 'amber' | 'red' | 'blue' | 'indigo';
    sublabel?: string;
    loading?: boolean;
}) => {
    const colors = {
        violet:  { card: 'from-violet-600 to-purple-700',    text: 'text-white', badge: 'bg-white/20' },
        emerald: { card: 'from-emerald-500 to-teal-600',     text: 'text-white', badge: 'bg-white/20' },
        amber:   { card: 'from-amber-500 to-orange-600',     text: 'text-white', badge: 'bg-white/20' },
        red:     { card: 'from-red-500 to-rose-600',         text: 'text-white', badge: 'bg-white/20' },
        blue:    { card: 'from-blue-500 to-cyan-600',        text: 'text-white', badge: 'bg-white/20' },
        indigo:  { card: 'from-indigo-600 to-violet-700',    text: 'text-white', badge: 'bg-white/20' },
    };
    const c = colors[color];

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.card} p-5 shadow-lg`}>
            {/* Background circle decoration */}
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5" />
            <div className="absolute -right-2 -bottom-4 w-16 h-16 rounded-full bg-white/5" />

            <div className="relative">
                <div className="flex items-start justify-between mb-3">
                    <span className={`text-sm font-bold uppercase tracking-wider ${c.text} opacity-80`}>{label}</span>
                    <span className={`${c.badge} rounded-xl px-2 py-1 text-lg leading-none`}>{icon}</span>
                </div>

                {loading ? (
                    <div className="h-10 w-24 bg-white/20 rounded-xl animate-pulse" />
                ) : (
                    <div className={`text-4xl font-black ${c.text} leading-none`}>{value}</div>
                )}

                {sublabel && (
                    <p className={`text-xs font-semibold mt-2 ${c.text} opacity-70`}>{sublabel}</p>
                )}
            </div>
        </div>
    );
};

// ─── Trial Badge ──────────────────────────────────────────────────────────────
const TrialBadge = ({ status, daysLeft }: { status: RecentStore['trialStatus']; daysLeft: number | null }) => {
    if (status === 'none') return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">SIN TRIAL</span>
    );
    if (status === 'expired') return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-600">EXPIRADO</span>
    );
    return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
            (daysLeft ?? 30) <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
            {daysLeft}d restantes
        </span>
    );
};

// ─── Plan Badge ───────────────────────────────────────────────────────────────
const PlanBadge = ({ plan }: { plan: string }) => {
    const styles: Record<string, string> = {
        TRIAL:      'bg-blue-100 text-blue-700',
        STANDARD:   'bg-slate-100 text-slate-600',
        PRO:        'bg-violet-100 text-violet-700',
        ENTERPRISE: 'bg-amber-100 text-amber-700',
    };
    return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${styles[plan] ?? styles.STANDARD}`}>
            {plan}
        </span>
    );
};

// ─── Master Dashboard ─────────────────────────────────────────────────────────
export const MasterDashboard = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
    const token  = localStorage.getItem('pos_token');

    const [data, setData]       = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/saas/metrics`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: MetricsData = await res.json();
            setData(json);
            setLastUpdated(new Date());
        } catch (err: any) {
            toast.error('Error cargando métricas: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, token]);

    useEffect(() => {
        fetchMetrics();
        // Auto-refresh cada 60 segundos
        const interval = setInterval(fetchMetrics, 60_000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    const s = data?.summary;

    // Tasa de conversión trial → pagado aproximada
    const conversionRate = s && s.totalStores > 0
        ? (((s.totalStores - s.trialActive - s.trialExpired) / s.totalStores) * 100).toFixed(0)
        : '0';

    return (
        <div className="min-h-screen bg-slate-950 text-white">

            {/* ── Top Bar ───────────────────────────────────────────────────── */}
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <Link to="/super-admin" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1.5">
                        ← Panel SaaS
                    </Link>
                    <div className="w-px h-4 bg-slate-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h1 className="text-sm font-bold text-white">Centro de Comando</h1>
                        <span className="text-[10px] font-bold bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full">SUPER ADMIN</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-xs text-slate-500 hidden sm:inline">
                            Actualizado: {lastUpdated.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={() => { setLoading(true); fetchMetrics(); }}
                        className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                    >
                        <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
                        Refrescar
                    </button>
                    <Link
                        to="/"
                        className="text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-all"
                    >
                        ← Dashboard
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">

                {/* ── KPI Grid ──────────────────────────────────────────────── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Métricas Globales</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                        <KpiCard label="Total Tiendas"   value={s?.totalStores    ?? 0} icon="🏪" color="indigo"  loading={loading} sublabel="Registradas en el sistema" />
                        <KpiCard label="Activas"         value={s?.activeStores   ?? 0} icon="✅" color="emerald" loading={loading} sublabel="is_active = true" />
                        <KpiCard label="Trial Activo"    value={s?.trialActive    ?? 0} icon="⏳" color="blue"    loading={loading} sublabel="En período de prueba" />
                        <KpiCard label="Trial Expirado"  value={s?.trialExpired   ?? 0} icon="⚠️" color="amber"   loading={loading} sublabel="Necesitan renovar" />
                        <KpiCard label="Suspendidas"     value={s?.suspendedStores ?? 0} icon="🚫" color="red"    loading={loading} sublabel="is_active = false" />
                        <KpiCard label="Nuevas (30d)"    value={s?.newThisMonth   ?? 0} icon="🚀" color="violet"  loading={loading} sublabel="Últimos 30 días" />
                    </div>
                </section>

                {/* ── Secondary Row: Plan distribution + Health ─────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Plan Distribution */}
                    <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Distribución por Plan</h3>
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-8 bg-slate-800 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(data?.byPlan ?? {}).map(([plan, count]) => {
                                    const total = s?.totalStores ?? 1;
                                    const pct = Math.round((count / total) * 100);
                                    const colors: Record<string, string> = {
                                        TRIAL: 'bg-blue-500', STANDARD: 'bg-slate-500',
                                        PRO: 'bg-violet-500', ENTERPRISE: 'bg-amber-500',
                                    };
                                    return (
                                        <div key={plan}>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-bold text-slate-300">{plan}</span>
                                                <span className="text-xs font-black text-white">{count} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${colors[plan] ?? 'bg-slate-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.keys(data?.byPlan ?? {}).length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-4">Sin datos</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Business Health Indicators */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Salud del Negocio</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">

                            {/* Tasa de actividad */}
                            <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col justify-between border border-slate-700/50">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tasa Actividad</p>
                                {loading ? (
                                    <div className="h-10 bg-slate-700 rounded-lg animate-pulse mt-2" />
                                ) : (
                                    <>
                                        <p className="text-3xl font-black text-emerald-400 mt-1">
                                            {s && s.totalStores > 0
                                                ? Math.round((s.activeStores / s.totalStores) * 100)
                                                : 0}%
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">{s?.activeStores ?? 0} de {s?.totalStores ?? 0} activas</p>
                                    </>
                                )}
                            </div>

                            {/* Trials que expiran pronto */}
                            <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col justify-between border border-slate-700/50">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Trials por Renovar</p>
                                {loading ? (
                                    <div className="h-10 bg-slate-700 rounded-lg animate-pulse mt-2" />
                                ) : (
                                    <>
                                        <p className="text-3xl font-black text-amber-400 mt-1">{s?.trialExpired ?? 0}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Oportunidades de venta</p>
                                    </>
                                )}
                            </div>

                            {/* Conversión estimada */}
                            <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col justify-between border border-slate-700/50">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Conversión Est.</p>
                                {loading ? (
                                    <div className="h-10 bg-slate-700 rounded-lg animate-pulse mt-2" />
                                ) : (
                                    <>
                                        <p className="text-3xl font-black text-violet-400 mt-1">{conversionRate}%</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Tiendas sin trial (pagado)</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Recent Signups ─────────────────────────────────────────── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Últimas 5 Tiendas Registradas</h2>
                        <Link
                            to="/super-admin"
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Ver todas →
                        </Link>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        {loading ? (
                            <div className="divide-y divide-slate-800">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-8 h-8 bg-slate-800 rounded-full animate-pulse shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-slate-800 rounded animate-pulse w-40" />
                                            <div className="h-2.5 bg-slate-800 rounded animate-pulse w-56" />
                                        </div>
                                        <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : (data?.recentStores ?? []).length === 0 ? (
                            <div className="py-16 text-center text-slate-500 text-sm">
                                No hay tiendas registradas aún
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/80">
                                {(data?.recentStores ?? []).map((store, idx) => {
                                    const date = new Date(store.registeredAt);
                                    const dateStr = date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
                                    const timeStr = date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
                                    const initials = store.name.slice(0, 2).toUpperCase();
                                    const avatarColors = [
                                        'bg-violet-600', 'bg-indigo-600', 'bg-emerald-600',
                                        'bg-amber-600',  'bg-blue-600',
                                    ];

                                    return (
                                        <div key={store.id} className="px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-slate-800/40 transition-colors group">
                                            {/* Avatar */}
                                            <div className={`w-9 h-9 ${avatarColors[idx % avatarColors.length]} rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0`}>
                                                {initials}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-white text-sm truncate">{store.name}</p>
                                                    <PlanBadge plan={store.plan} />
                                                    <TrialBadge status={store.trialStatus} daysLeft={store.trialDaysLeft} />
                                                </div>
                                                <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                                                    {store.ownerEmail}
                                                </p>
                                            </div>

                                            {/* Status dot */}
                                            <div className="flex items-center gap-1.5 shrink-0 hidden sm:flex">
                                                <span className={`w-2 h-2 rounded-full ${store.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                                <span className="text-xs text-slate-400">{store.isActive ? 'Activa' : 'Suspendida'}</span>
                                            </div>

                                            {/* Date */}
                                            <div className="text-right shrink-0 hidden md:block">
                                                <p className="text-xs font-semibold text-slate-300">{dateStr}</p>
                                                <p className="text-[10px] text-slate-600">{timeStr}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Footer ────────────────────────────────────────────────── */}
                <div className="text-center text-xs text-slate-700 pb-4">
                    MerxPOS · Centro de Comando · Solo accesible por SUPER_ADMIN
                    {data?.generatedAt && (
                        <span className="ml-2 font-mono">
                            · Gen: {new Date(data.generatedAt).toLocaleTimeString('es-VE')}
                        </span>
                    )}
                </div>
            </main>
        </div>
    );
};
