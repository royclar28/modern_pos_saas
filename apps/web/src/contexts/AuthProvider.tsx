import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
    username: string;
    role: string;
    sub: number;
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
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('pos_token'));
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            try {
                // Simple JWT decode for client-side state
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({
                    username: payload.username,
                    role: payload.role,
                    sub: payload.sub,
                });
            } catch (e) {
                console.error('Invalid token stored', e);
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
