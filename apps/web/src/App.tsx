import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import { SettingsProvider, useSettingsContext } from './contexts/SettingsProvider';
import { CartProvider } from './contexts/CartProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequireRole } from './components/RequireRole';
import { ReloadPrompt } from './components/ReloadPrompt';
import { TrialExpiredGuard } from './components/TrialExpiredGuard';
import { LoginPage } from './pages/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SetupPasswordPage from './pages/SetupPasswordPage';
import { RegisterPage } from './pages/RegisterPage';
import { LandingPage } from './pages/public/LandingPage';
import { ProductsPage } from './pages/ProductsPage';
import { PosPage } from './pages/PosPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { SalesDashboard } from './pages/admin/SalesDashboard';
import { SettingsPage } from './pages/admin/SettingsPage';
import { FiadosPage } from './pages/admin/FiadosPage';
import { SuperAdminPage } from './pages/admin/SuperAdminPage';
import { MasterDashboard } from './pages/admin/MasterDashboard';
import { ShiftHistoryPage } from './pages/admin/ShiftHistoryPage';
import { CustomersPage } from './pages/admin/CustomersPage';
import { RafflesPage } from './pages/admin/RafflesPage';
import { RaffleDetailPage } from './pages/admin/RaffleDetailPage';
import { LiveRaffle } from './pages/public/LiveRaffle';
import { useSync } from './hooks/useSync';
import { useInitialSync } from './hooks/useInitialSync';
import { useItems } from './hooks/useItems';
import { useDashboard } from './hooks/useDashboard';
import { Toaster } from 'react-hot-toast';
import { WhatsAppButton } from './components/WhatsAppButton';
import { ThemeManager } from './components/themes/ThemeManager';

// ─── Role Helpers ─────────────────────────────────────────────────────────────
/** Roles that can access admin features (inventory, reports, settings, fiados) */
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
/** Roles that can access configuration/settings */
const SETTINGS_ROLES = ['SUPER_ADMIN', 'ADMIN'];

// ─── Trial Banner ───────────────────────────────────────────────────
const TrialBanner = ({ trialEndsAt }: { trialEndsAt?: string | null }) => {
    if (!trialEndsAt) return null;

    const now        = new Date();
    const endsAt     = new Date(trialEndsAt);
    const msLeft     = endsAt.getTime() - now.getTime();
    const daysLeft   = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const isUrgent   = daysLeft <= 7;
    const whatsapp   = import.meta.env.VITE_SUPPORT_WHATSAPP || '584241234567';
    const msg        = encodeURIComponent(`Hola! Quiero renovar mi suscripción al POS. Me quedan ${daysLeft} días de prueba.`);

    return (
        <div className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 text-sm font-semibold border ${
            isUrgent
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
        }`}>
            <div className="flex items-center gap-2">
                <span>{isUrgent ? '⚠️' : '⏳'}</span>
                <span>
                    {isUrgent
                        ? `¡Solo te quedan ${daysLeft} días de prueba!`
                        : `Prueba gratuita: ${daysLeft} días restantes`
                    }
                </span>
            </div>
            <a
                href={`https://wa.me/${whatsapp}?text=${msg}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`shrink-0 font-black text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    isUrgent
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
            >
                Renovar →
            </a>
        </div>
    );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user, logout } = useAuth();
    const { enableCreditSales, company, toggleDarkMode, darkMode } = useSettingsContext();
    useSync();
    const { items, isLoading } = useItems();
    const { hydrateLocalDB, isHydrating } = useInitialSync();
    const { data: dashboard, isLoading: dashLoading } = useDashboard();

    useEffect(() => {
        // Auto-hydrate if DB is empty and not already hydrating
        if (!isLoading && items.length === 0 && !isHydrating) {
            const hasHydrated = localStorage.getItem(`hydrated_${user?.id}`);
            if (!hasHydrated) {
                hydrateLocalDB().then(() => {
                    if (user?.id) localStorage.setItem(`hydrated_${user.id}`, 'true');
                });
            }
        }
    }, [items.length, isLoading, isHydrating, user?.id, hydrateLocalDB]);

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const userRole = (user?.role || 'CASHIER').toUpperCase();
    const canAccessAdmin = ADMIN_ROLES.includes(userRole);
    const canAccessSettings = SETTINGS_ROLES.includes(userRole);
    const trialEndsAt = (user as any)?.trial_ends_at ?? null;
    const trialDaysLeft = (user as any)?.trialDaysLeft ?? 0;
    const planInfo = (user as any)?.plan_limits as Record<string, any> | null;

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-violet-600/5 via-indigo-500/5 to-transparent dark:from-violet-900/10 dark:via-indigo-900/10 pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-violet-200/20 dark:bg-violet-900/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                {/* Banner de trial (visible solo durante el período de prueba) */}
                <TrialBanner trialEndsAt={trialEndsAt} />

                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 dark:text-white tracking-tight">{company}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                            Bienvenido, <strong>{user?.username}</strong> · <span className="text-primary font-semibold">{userRole}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {deferredPrompt && (
                            <button
                                onClick={handleInstallClick}
                                className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-xl shadow-md transition-colors text-sm"
                            >
                                📱 Instalar App
                            </button>
                        )}
                        <button
                            onClick={toggleDarkMode}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-colors text-xl border border-slate-200 dark:border-slate-700"
                            title="Alternar Modo Oscuro"
                        >
                            {darkMode ? '🌞' : '🌙'}
                        </button>
                        <button
                            onClick={logout}
                            className="text-sm shadow-sm bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors font-medium border border-slate-200 dark:border-slate-700 hover:border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>

                {/* ── KPI Cards — Live summary from backend ──────── */}
                {!dashLoading && dashboard && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
                        {/* Revenue Today */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Ingresos Hoy</p>
                            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                ${dashboard.today.revenue.toFixed(2)}
                            </p>
                            <div className="flex gap-3 mt-1.5 text-[10px] text-slate-400 font-medium">
                                <span>💵 ${dashboard.today.direct_sales.toFixed(2)} ventas</span>
                                {dashboard.today.debt_payments > 0 && (
                                    <span>📒 +${dashboard.today.debt_payments.toFixed(2)} abonos</span>
                                )}
                            </div>
                        </div>

                        {/* Transactions + Units */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Actividad Hoy</p>
                            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
                                {dashboard.today.transaction_count} <span className="text-sm font-bold text-slate-400">tickets</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                                📦 {dashboard.today.units_sold} unidades vendidas
                            </p>
                        </div>

                        {/* Pending Debt (global) */}
                        {dashboard.debt.total_pending > 0 ? (
                            <Link
                                to="/admin/creditos"
                                className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 group cursor-pointer"
                            >
                                <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold mb-1">Por Cobrar</p>
                                <p className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-300">
                                    ${dashboard.debt.total_pending.toFixed(2)}
                                </p>
                                <p className="text-[10px] text-amber-500 font-medium mt-1.5 flex items-center gap-1">
                                    👥 {dashboard.debt.customers_with_debt} clientes · {dashboard.debt.pending_tickets} tickets
                                    {dashboard.debt.oldest_debt_days > 30 && (
                                        <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold ml-1">
                                            ⚠ {dashboard.debt.oldest_debt_days}d
                                        </span>
                                    )}
                                </p>
                            </Link>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Por Cobrar</p>
                                <p className="text-2xl sm:text-3xl font-black text-slate-400 dark:text-slate-500">$0.00</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1.5">Sin deudas pendientes ✨</p>
                            </div>
                        )}

                        {/* Stock Alerts */}
                        <Link
                            to={canAccessAdmin ? "/admin/inventory" : "#"}
                            className={`rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 group cursor-pointer ${
                                dashboard.stock.out_of_stock_count > 0
                                    ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 hover:border-red-400'
                                    : dashboard.stock.low_stock_count > 0
                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 hover:border-amber-400'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Inventario</p>
                            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
                                {dashboard.stock.out_of_stock_count > 0
                                    ? `🚫 ${dashboard.stock.out_of_stock_count}`
                                    : dashboard.stock.low_stock_count > 0
                                        ? `⚠️ ${dashboard.stock.low_stock_count}`
                                        : '✅ OK'
                                }
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                                {dashboard.stock.total_items} productos · {dashboard.stock.low_stock_count} bajos · {dashboard.stock.out_of_stock_count} agotados
                            </p>
                        </Link>
                    </div>
                )}

                {/* ── Plan Badge ───────────────────────────────── */}
                {planInfo && (
                    <div className={`mb-5 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm font-bold border gap-2 ${
                        trialEndsAt && trialDaysLeft <= 3
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : trialEndsAt && trialDaysLeft <= 7
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                        <div className="flex items-center gap-2">
                            <span>{planInfo.plan === 'TRIAL' ? '🕐' : '✅'}</span>
                            <span>
                                {planInfo.plan === 'TRIAL'
                                    ? `${planInfo.plan_label} — ${trialDaysLeft} día(s) restante(s)`
                                    : `${planInfo.plan_label}${planInfo.price > 0 ? ` ($${planInfo.price}/mes)` : ''} — Activo`
                                }
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-medium opacity-70">
                            <span>📱 {planInfo.max_devices > 1 ? `Hasta ${planInfo.max_devices} disp.` : '1 dispositivo'}</span>
                            <span>👥 {planInfo.current_users}/{planInfo.max_users} usuarios</span>
                            <span>📦 {planInfo.current_items}/{planInfo.max_items} items</span>
                            {planInfo.credit_sales ? <span>📒 Créditos</span> : <span className="text-slate-400">🚫 Créditos</span>}
                            {planInfo.payment_methods && (
                                <span className="text-slate-400">💳 {planInfo.payment_methods.join(', ')}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Hero POS Card — Prominent, full width */}
                <Link
                    to="/pos"
                    className="group block bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-2xl p-6 sm:p-8 transition-all shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30 hover:-translate-y-0.5 mb-5 relative overflow-hidden"
                >
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
                    <div className="relative flex items-center gap-4 sm:gap-6">
                        <div className="text-4xl sm:text-5xl lg:text-6xl shrink-0">🛒</div>
                        <div>
                            <div className="font-black text-xl sm:text-2xl lg:text-3xl tracking-tight">Punto de Venta</div>
                            <div className="opacity-80 text-sm sm:text-base mt-1">Abrir caja y comenzar a vender →</div>
                        </div>
                        <div className="ml-auto hidden sm:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold opacity-80">Terminal Activa</span>
                        </div>
                    </div>
                </Link>

                {/* Module Cards Grid — 3 cols on desktop */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                    {/* Inventario — ADMIN y MANAGER */}
                    {canAccessAdmin && (
                        <div className="space-y-3">
                            <Link
                                to="/admin/inventory"
                                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 text-slate-800 dark:text-white rounded-2xl p-5 sm:p-7 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 block"
                            >
                                <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">📦</div>
                                <div className="font-bold text-base sm:text-lg lg:text-xl">Inventario</div>
                                <div className="text-slate-400 dark:text-slate-400 text-xs sm:text-sm mt-1">Ver catálogo →</div>
                            </Link>
                            <Link
                                to="/admin/inventory"
                                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-slate-800 dark:text-white rounded-2xl p-4 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 block text-center"
                            >
                                <div className="text-2xl mb-1">🤖</div>
                                <div className="font-bold text-sm">Escanear Factura</div>
                                <div className="text-slate-400 text-[10px] mt-0.5">Cargar con IA →</div>
                            </Link>
                        </div>
                    )}

                    {/* Dashboard General (Ventas) — ADMIN y MANAGER */}
                    {canAccessAdmin && (
                        <Link
                            to="/admin/sales"
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 text-slate-800 dark:text-white rounded-2xl p-5 sm:p-7 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">📊</div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl">Dashboard General</div>
                            <div className="text-slate-400 dark:text-slate-400 text-xs sm:text-sm mt-1">Estadísticas de ventas →</div>
                        </Link>
                    )}

                    {/* Reporte Z / Historial de Caja — ADMIN y MANAGER */}
                    {canAccessAdmin && (
                        <Link
                            to="/admin/shifts"
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 text-slate-800 dark:text-white rounded-2xl p-5 sm:p-7 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">🔐</div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl">Historial de Cajas (Z)</div>
                            <div className="text-slate-400 dark:text-slate-400 text-xs sm:text-sm mt-1">Reportes y cortes →</div>
                        </Link>
                    )}

                    {/* Configuración — Solo ADMIN */}
                    {canAccessSettings && (
                        <Link
                            to="/admin/settings"
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 text-slate-800 dark:text-white rounded-2xl p-5 sm:p-7 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">⚙️</div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl">Configuración</div>
                            <div className="text-slate-400 dark:text-slate-400 text-xs sm:text-sm mt-1">IVA, tema, terminal →</div>
                        </Link>
                    )}

                    {/* Fiados — ADMIN y MANAGER (si está habilitado) */}
                    {enableCreditSales && canAccessAdmin && (
                        <Link
                            to="/admin/creditos"
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-800 dark:text-white rounded-2xl p-5 sm:p-7 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">📒</div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl">Créditos y Cuentas</div>
                            <div className="text-primary text-xs sm:text-sm mt-1 font-semibold">Gestionar créditos →</div>
                        </Link>
                    )}

                    {/* Clientes — ADMIN y MANAGER */}
                    {canAccessAdmin && (
                        <Link
                            to="/admin/customers"
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 text-slate-800 dark:text-white rounded-2xl p-5 sm:p-7 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">👥</div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl">Clientes</div>
                            <div className="text-slate-400 dark:text-slate-400 text-xs sm:text-sm mt-1">Ver y gestionar →</div>
                        </Link>
                    )}

                    {/* Sorteos — ADMIN y MANAGER */}
                    {canAccessAdmin && (
                        <Link
                            to="/admin/raffles"
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-pink-400 dark:hover:border-pink-500 text-slate-800 dark:text-white rounded-2xl p-5 sm:p-7 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">🎁</div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl">Sorteos</div>
                            <div className="text-slate-400 dark:text-slate-400 text-xs sm:text-sm mt-1">Sorteos en vivo →</div>
                        </Link>
                    )}

                    {/* Sugerencias — visible para TODOS los roles */}
                    <a
                        href="https://merx-pos.canny.io/sugerencias-merxpos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-slate-800 dark:text-white rounded-2xl p-5 sm:p-7 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">💡</div>
                        <div className="font-bold text-base sm:text-lg lg:text-xl">Sugerencias</div>
                        <div className="text-slate-400 dark:text-slate-400 text-xs sm:text-sm mt-1">Proponer mejoras →</div>
                    </a>

                    {/* Panel SaaS — Solo SUPER_ADMIN */}
                    {userRole === 'SUPER_ADMIN' && (
                        <Link
                            to="/super-admin"
                            className="group bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-2xl p-5 sm:p-7 transition-all shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:shadow-indigo-300 hover:-translate-y-0.5"
                        >
                            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">🔒</div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl">Panel SaaS</div>
                            <div className="text-indigo-200 text-xs sm:text-sm mt-1">Gestionar tiendas →</div>
                        </Link>
                    )}

                    {/* Centro de Comando — Solo SUPER_ADMIN */}
                    {userRole === 'SUPER_ADMIN' && (
                        <Link
                            to="/master-dashboard"
                            className="group relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-violet-500 text-white rounded-2xl p-5 sm:p-7 transition-all shadow-lg hover:shadow-violet-900/30 hover:-translate-y-0.5"
                        >
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-violet-500/10 rounded-full blur-xl group-hover:bg-violet-500/20 transition-colors" />
                            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">📡</div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl">Centro de Comando</div>
                            <div className="text-slate-400 text-xs sm:text-sm mt-1">Métricas del negocio →</div>
                        </Link>
                    )}
                </div>

                {/* Sync Status Bar */}
                <div className="bg-primary-light dark:bg-slate-800 border border-primary/30 dark:border-slate-700 rounded-xl p-4 text-sm text-primary dark:text-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                        <span className="text-xs sm:text-sm font-medium">Dexie Outbox Sync activo — datos en tiempo real</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── App ──────────────────────────────────────────────────────────────────────
const AppInner = () => {
    const { user } = useAuth();
    const { company } = useSettingsContext();
    return (
        <>
            <ThemeManager />
            <TrialExpiredGuard storeName={company}>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/setup-password" element={<SetupPasswordPage />} />
                    <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
                    <Route path="/raffles/live/:id" element={<LiveRaffle />} />
                    
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/pos" element={<PosPage />} />

                        {/* Admin routes — ADMIN & MANAGER */}
                        <Route path="/admin/inventory" element={
                            <RequireRole allowed={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                                <InventoryPage />
                            </RequireRole>
                        } />
                        <Route path="/admin/sales" element={
                            <RequireRole allowed={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                                <SalesDashboard />
                            </RequireRole>
                        } />
                        <Route path="/admin/creditos" element={
                            <RequireRole allowed={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                                <FiadosPage />
                            </RequireRole>
                        } />
                        <Route path="/admin/shifts" element={
                            <RequireRole allowed={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                                <ShiftHistoryPage />
                            </RequireRole>
                        } />
                        <Route path="/admin/customers" element={
                            <RequireRole allowed={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                                <CustomersPage />
                            </RequireRole>
                        } />
                        <Route path="/admin/raffles" element={
                            <RequireRole allowed={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                                <RafflesPage />
                            </RequireRole>
                        } />
                        <Route path="/admin/raffles/:id" element={
                            <RequireRole allowed={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                                <RaffleDetailPage />
                            </RequireRole>
                        } />
                        {/* Settings — Solo ADMIN */}
                        <Route path="/admin/settings" element={
                            <RequireRole allowed={['SUPER_ADMIN', 'ADMIN']}>
                                <SettingsPage />
                            </RequireRole>
                        } />

                        {/* Super Admin Panel — Solo SUPER_ADMIN */}
                        <Route path="/super-admin" element={
                            <RequireRole allowed={['SUPER_ADMIN']}>
                                <SuperAdminPage />
                            </RequireRole>
                        } />

                        {/* Centro de Comando (Master Dashboard) — Solo SUPER_ADMIN */}
                        <Route path="/master-dashboard" element={
                            <RequireRole allowed={['SUPER_ADMIN']}>
                                <MasterDashboard />
                            </RequireRole>
                        } />
                    </Route>

                    {/* Fallback: si logueado → dashboard, si no → landing */}
                    <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
                </Routes>
            </TrialExpiredGuard>

            {/* Botón flotante WhatsApp — dentro de AuthProvider, accede a isAuthenticated */}
            <WhatsAppButton />
        </>
    );
};

export const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SettingsProvider>
                    <CartProvider>
                        <AppInner />
                    </CartProvider>
                </SettingsProvider>
            </AuthProvider>
            <ReloadPrompt />
            <Toaster position="top-right" />
        </BrowserRouter>
    );
};

export default App;
