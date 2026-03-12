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
import { useSync } from './hooks/useSync';

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user, logout } = useAuth();
    useSync();

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-1">Modern POS</h1>
                <p className="text-slate-500 mb-8">
                    Bienvenido, <strong>{user?.username}</strong> · {user?.role}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <Link
                        to="/pos"
                        className="group bg-violet-600 hover:bg-violet-700 text-white rounded-2xl p-6 transition-all shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5"
                    >
                        <div className="text-4xl mb-3">🛒</div>
                        <div className="font-bold text-lg">Punto de Venta</div>
                        <div className="text-violet-200 text-sm mt-1">Abrir caja →</div>
                    </Link>

                    <Link
                        to="/admin/inventory"
                        className="group bg-white border border-slate-200 hover:border-violet-300 text-slate-800 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-4xl mb-3">📦</div>
                        <div className="font-bold text-lg">Inventario</div>
                        <div className="text-slate-400 text-sm mt-1">Ver catálogo →</div>
                    </Link>

                    <Link
                        to="/admin/sales"
                        className="group bg-white border border-slate-200 hover:border-emerald-300 text-slate-800 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-4xl mb-3">📊</div>
                        <div className="font-bold text-lg">Reporte Z</div>
                        <div className="text-slate-400 text-sm mt-1">Dashboard de ventas →</div>
                    </Link>

                    <Link
                        to="/admin/settings"
                        className="group bg-white border border-slate-200 hover:border-slate-400 text-slate-800 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="text-4xl mb-3">⚙️</div>
                        <div className="font-bold text-lg">Configuración</div>
                        <div className="text-slate-400 text-sm mt-1">IVA, moneda, terminal →</div>
                    </Link>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    RxDB Sync Engine activo — datos sincronizados con el servidor
                </div>

                <button
                    onClick={logout}
                    className="mt-6 text-sm text-slate-400 hover:text-red-500 transition-colors"
                >
                    Cerrar sesión
                </button>
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
