import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
    username: string;
    role: string;
    sub: number;
    storeId: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('pos_token'));
    
    // Safely initialize user synchronously from token to prevent F5 flashes
    const [user, setUser] = useState<User | null>(() => {
        const storedToken = localStorage.getItem('pos_token');
        if (!storedToken) return null;
        try {
            const base64Url = storedToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);

            return {
                username: payload.username,
                role: payload.role,
                sub: payload.sub,
                storeId: payload.storeId,
            };
        } catch (e) {
            console.error('Invalid token stored', e);
            return null;
        }
    });

    const navigate = useNavigate();

    useEffect(() => {
        if (token && !user) {
            // Unlikely to hit if we synchronously parse, but fallback protective check.
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                const payload = JSON.parse(jsonPayload);
                setUser({
                    username: payload.username,
                    role: payload.role,
                    sub: payload.sub,
                    storeId: payload.storeId,
                });
            } catch (e) {
                logout();
            }
        }
    }, [token]);

    const login = (newToken: string, userData: User) => {
        localStorage.setItem('pos_token', newToken);
        setToken(newToken);
        setUser(userData);
        navigate('/');
    };

    const logout = () => {
        localStorage.removeItem('pos_token');
        setToken(null);
        setUser(null);
        // Reset theme CSS variables on logout
        document.documentElement.style.removeProperty('--color-primary');
        document.documentElement.style.removeProperty('--color-primary-hover');
        document.documentElement.style.removeProperty('--color-primary-light');
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
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
