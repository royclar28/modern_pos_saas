import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';

export const ProtectedRoute = () => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        // Redirigir al usuario al la vista de autenticación
        return <Navigate to="/login" replace />;
    }

    // Devolver las vistas hijas si está autenticado
    return <Outlet />;
};
