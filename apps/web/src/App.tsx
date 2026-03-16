import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import { CartProvider } from './contexts/CartProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { PosPage } from './pages/PosPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { SalesDashboard } from './pages/admin/SalesDashboard';
import { SettingsPage } from './pages/admin/SettingsPage';
import { FiadosPage } from './pages/admin/FiadosPage';
import { useSync } from './hooks/useSync';
import { useSettings } from './hooks/useSettings';

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user, logout } = useAuth();
    const { enableCreditSales } = useSettings();
    useSync();

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-4xl">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Modern POS</h1>
                        <p className="text-slate-500 mt-1 text-base">
                            Bienvenido, <strong>{user?.username}</strong> · <span className="text-violet-600 font-semibold">{user?.role}</span>
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="text-sm text-slate-400 hover:text-red-500 transition-colors font-medium border border-slate-200 hover:border-red-200 px-4 py-2 rounded-xl hover:bg-red-50"
                    >
                        Cerrar sesión
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <Link
                        to="/pos"
                        className="group bg-violet-600 hover:bg-violet-700 text-white rounded-2xl p-8 transition-all shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5"
                    >
                        <div className="text-5xl mb-3">🛒</div>
                        <div className="font-bold text-xl">Punto de Venta</div>
                        <div className="text-violet-200 text-sm mt-1">Abrir caja →</div>
                    </Link>

                    <Link
                        to="/admin/inventory"
                        className="group bg-white border border-slate-200 hover:border-violet-300 text-slate-800 rounded-2xl p-8 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-5xl mb-3">📦</div>
                        <div className="font-bold text-xl">Inventario</div>
                        <div className="text-slate-400 text-sm mt-1">Ver catálogo →</div>
                    </Link>

                    <Link
                        to="/admin/sales"
                        className="group bg-white border border-slate-200 hover:border-emerald-300 text-slate-800 rounded-2xl p-8 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-5xl mb-3">📊</div>
                        <div className="font-bold text-xl">Reporte Z</div>
                        <div className="text-slate-400 text-sm mt-1">Dashboard de ventas →</div>
                    </Link>

                    <Link
                        to="/admin/settings"
                        className="group bg-white border border-slate-200 hover:border-slate-400 text-slate-800 rounded-2xl p-8 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-5xl mb-3">⚙️</div>
                        <div className="font-bold text-xl">Configuración</div>
                        <div className="text-slate-400 text-sm mt-1">IVA, moneda, terminal →</div>
                    </Link>

                    {enableCreditSales && (
                        <Link
                            to="/admin/fiados"
                            className="group bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-400 text-slate-800 rounded-2xl p-8 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="text-5xl mb-3">📒</div>
                            <div className="font-bold text-xl">Cuaderno de Fiados</div>
                            <div className="text-amber-600 text-sm mt-1">Gestionar créditos →</div>
                        </Link>
                    )}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    RxDB Sync Engine activo — datos sincronizados con el servidor
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
                <CartProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/products" element={<ProductsPage />} />
                            <Route path="/admin/inventory" element={<InventoryPage />} />
                            <Route path="/admin/sales" element={<SalesDashboard />} />
                            <Route path="/admin/settings" element={<SettingsPage />} />
                            <Route path="/admin/fiados" element={<FiadosPage />} />
                            <Route path="/pos" element={<PosPage />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </CartProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
