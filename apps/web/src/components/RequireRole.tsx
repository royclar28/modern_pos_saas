import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';

interface RequireRoleProps {
    /** Roles allowed to access the wrapped children */
    allowed: string[];
    /** Where to redirect if the user's role is not in the allowed list */
    redirectTo?: string;
    children: React.ReactNode;
}

/**
 * RequireRole — Role-based route guard
 *
 * Wraps children and only renders them if the authenticated user
 * has one of the `allowed` roles. Otherwise redirects (to /pos by default).
 *
 * Usage:
 * ```tsx
 * <RequireRole allowed={['SUPER_ADMIN', 'STORE_ADMIN']}>
 *   <AdminPage />
 * </RequireRole>
 * ```
 */
export const RequireRole: React.FC<RequireRoleProps> = ({
    allowed,
    redirectTo = '/pos',
    children,
}) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowed.includes(user.role)) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};
