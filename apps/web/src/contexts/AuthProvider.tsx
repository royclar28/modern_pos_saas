import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOutboxDB } from '../db/outbox';
import { api, registerLogoutHandler } from '../lib/api';

interface User {
    username: string;
    role: string;
    sub: number;
    storeId: string;
    trial_ends_at?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isValidatingSession: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('pos_token'));
    const [isValidatingSession, setIsValidatingSession] = useState<boolean>(() => !!localStorage.getItem('pos_token'));
    
    // Safely initialize user synchronously from localStorage
    const [user, setUser] = useState<User | null>(() => {
        const storedToken = localStorage.getItem('pos_token');
        if (!storedToken) return null;
        try {
            const storedUser = localStorage.getItem('pos_user');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
            return null;
        } catch (e) {
            console.error('Invalid user stored', e);
            return null;
        }
    });

    const navigate = useNavigate();

    const logout = useCallback(async () => {
        const activeToken = token || localStorage.getItem('pos_token');
        if (activeToken) {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
                await fetch(`${apiUrl}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${activeToken}`,
                        'Accept': 'application/json'
                    }
                });
            } catch (e) {}
        }
        
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        setToken(null);
        setUser(null);
        
        // Clear offline Dexie database on logout to prevent cross-tenant data leaks
        try {
            const db = getOutboxDB();
            await Promise.all(db.tables.map(table => table.clear()));
        } catch (e) {
            console.error('Failed to clear IndexedDB on logout', e);
        }
        // Reset theme CSS variables on logout
        document.documentElement.style.removeProperty('--color-primary');
        document.documentElement.style.removeProperty('--color-primary-hover');
        document.documentElement.style.removeProperty('--color-primary-light');
        navigate('/login');
    }, [token, navigate]);

    useEffect(() => {
        // Registramos el manejador global para los errores 401 de Axios/Fetch
        registerLogoutHandler(() => {
            logout();
        });
    }, [logout]);

    // Verificar si la sesión sigue activa en el backend al montar
    useEffect(() => {
        let isMounted = true;

        const validateSession = async () => {
            const currentToken = localStorage.getItem('pos_token');
            if (!currentToken) {
                if (isMounted) setIsValidatingSession(false);
                return;
            }

            try {
                const userData = await api.get('/user');
                if (isMounted && userData && userData.id) {
                    const formattedUser: User = {
                        username: userData.username,
                        role: userData.role,
                        sub: userData.id,
                        storeId: userData.storeId || userData.tenant_id,
                        trial_ends_at: userData.trial_ends_at,
                    };
                    setUser(formattedUser);
                    localStorage.setItem('pos_user', JSON.stringify(formattedUser));
                }
            } catch (err: any) {
                console.warn('[AuthProvider] Validación de sesión falló:', err);
                if (err.message === 'Session expired' || err.message?.includes('401') || err.message?.includes('Unauthenticated')) {
                    await logout();
                } else if (!navigator.onLine) {
                    console.info('[AuthProvider] Sin conexión, manteniendo sesión local para modo offline.');
                }
            } finally {
                if (isMounted) {
                    setIsValidatingSession(false);
                }
            }
        };

        validateSession();

        return () => {
            isMounted = false;
        };
    }, [logout]);

    const login = (newToken: string, userData: User) => {
        localStorage.setItem('pos_token', newToken);
        localStorage.setItem('pos_user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        navigate('/dashboard');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isValidatingSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
