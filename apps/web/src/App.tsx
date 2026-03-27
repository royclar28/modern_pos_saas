import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import { SettingsProvider, useSettingsContext } from './contexts/SettingsProvider';
import { CartProvider } from './contexts/CartProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequireRole } from './components/RequireRole';
import { ReloadPrompt } from './components/ReloadPrompt';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { PosPage } from './pages/PosPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { SalesDashboard } from './pages/admin/SalesDashboard';
import { SettingsPage } from './pages/admin/SettingsPage';
import { FiadosPage } from './pages/admin/FiadosPage';
import { SuperAdminPage } from './pages/admin/SuperAdminPage';
import { useSync } from './hooks/useSync';

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user, logout } = useAuth();
    const { enableCreditSales, company, toggleDarkMode, darkMode } = useSettingsContext();
    useSync();

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

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex items-center justify-center p-6 md:p-12 relative">
            <div className="w-full max-w-4xl">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{company}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-base">
                            Bienvenido, <strong>{user?.username}</strong> · <span className="text-primary font-semibold">{user?.role}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {deferredPrompt && (
                            <button
                                onClick={handleInstallClick}
                                className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-xl shadow-md transition-colors"
                            >
                                📱 Instalar App
                            </button>
                        )}
                        <button
                            onClick={toggleDarkMode}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-colors text-xl"
                            title="Alternar Modo Oscuro"
                        >
                            {darkMode ? '🌞' : '🌙'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <Link
                        to="/pos"
                        className="group bg-primary hover:bg-primary-hover text-white rounded-2xl p-8 transition-all shadow-lg hover:-translate-y-0.5"
                    >
                        <div className="text-5xl mb-3">🛒</div>
                        <div className="font-bold text-xl">Punto de Venta</div>
                        <div className="opacity-80 text-sm mt-1">Abrir caja →</div>
                    </Link>

                    <Link
                        to="/admin/inventory"
                        className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-white rounded-2xl p-8 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-5xl mb-3">📦</div>
                        <div className="font-bold text-xl">Inventario</div>
                        <div className="text-slate-400 dark:text-slate-400 text-sm mt-1">Ver catálogo →</div>
                    </Link>

                    <Link
                        to="/admin/sales"
                        className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-white rounded-2xl p-8 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-5xl mb-3">📊</div>
                        <div className="font-bold text-xl">Reporte Z</div>
                        <div className="text-slate-400 dark:text-slate-400 text-sm mt-1">Dashboard de ventas →</div>
                    </Link>

                    <Link
                        to="/admin/settings"
                        className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-white rounded-2xl p-8 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-5xl mb-3">⚙️</div>
                        <div className="font-bold text-xl">Configuración</div>
                        <div className="text-slate-400 dark:text-slate-400 text-sm mt-1">IVA, tema, terminal →</div>
                    </Link>

                    {enableCreditSales && (
                        <Link
                            to="/admin/fiados"
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-white rounded-2xl p-8 transition-all shadow-sm hover:-translate-y-0.5"
                        >
                            <div className="text-5xl mb-3">📒</div>
                            <div className="font-bold text-xl">Cuaderno de Fiados</div>
                            <div className="text-primary text-sm mt-1 font-semibold">Gestionar créditos →</div>
                        </Link>
                    )}

                    {user?.role === 'SUPER_ADMIN' && (
                        <Link
                            to="/super-admin"
                            className="group bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-2xl p-8 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5"
                        >
                            <div className="text-5xl mb-3">🔒</div>
                            <div className="font-bold text-xl">Panel SaaS</div>
                            <div className="text-indigo-200 text-sm mt-1">Gestionar tiendas →</div>
                        </Link>
                    )}
                </div>

                <div className="bg-primary-light dark:bg-slate-800 border border-primary dark:border-slate-700 rounded-xl p-4 text-sm text-primary dark:text-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                        Dexie Outbox Sync activo — datos en tiempo real
                    </div>
                </div>

                <div className="absolute top-6 right-6 md:top-12 md:right-12">
                    <button
                        onClick={logout}
                        className="text-sm shadow-sm bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors font-medium border border-slate-200 dark:border-slate-700 hover:border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-slate-700"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── App ──────────────────────────────────────────────────────────────────────
export const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SettingsProvider>
                    <CartProvider>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />

                            <Route element={<ProtectedRoute />}>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/products" element={<ProductsPage />} />
                                <Route path="/pos" element={<PosPage />} />

                                {/* Admin routes — CASHIER role cannot access */}
                                <Route path="/admin/inventory" element={
                                    <RequireRole allowed={['SUPER_ADMIN', 'STORE_ADMIN']}>
                                        <InventoryPage />
                                    </RequireRole>
                                } />
                                <Route path="/admin/sales" element={
                                    <RequireRole allowed={['SUPER_ADMIN', 'STORE_ADMIN']}>
                                        <SalesDashboard />
                                    </RequireRole>
                                } />
                                <Route path="/admin/settings" element={
                                    <RequireRole allowed={['SUPER_ADMIN', 'STORE_ADMIN']}>
                                        <SettingsPage />
                                    </RequireRole>
                                } />
                                <Route path="/admin/fiados" element={
                                    <RequireRole allowed={['SUPER_ADMIN', 'STORE_ADMIN']}>
                                        <FiadosPage />
                                    </RequireRole>
                                } />
                                <Route path="/super-admin" element={
                                    <RequireRole allowed={['SUPER_ADMIN']}>
                                        <SuperAdminPage />
                                    </RequireRole>
                                } />
                            </Route>

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </CartProvider>
                </SettingsProvider>
            </AuthProvider>
            <ReloadPrompt />
        </BrowserRouter>
    );
};

export default App;
