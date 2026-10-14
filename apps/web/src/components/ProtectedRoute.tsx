import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';

export const ProtectedRoute = () => {
    const { isAuthenticated, isValidatingSession } = useAuth();

    if (isValidatingSession) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    <p className="text-sm font-semibold text-slate-600">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirigir al usuario a la vista de login
        return <Navigate to="/login" replace />;
    }

    // Devolver las vistas hijas si está autenticado
    return <Outlet />;
};
