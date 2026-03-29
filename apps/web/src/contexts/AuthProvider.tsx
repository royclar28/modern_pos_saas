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

    useEffect(() => {
        if (token && !user) {
            const storedUser = localStorage.getItem('pos_user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            } else {
                logout();
            }
        }
    }, [token]);

    const login = (newToken: string, userData: User) => {
        localStorage.setItem('pos_token', newToken);
        localStorage.setItem('pos_user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        navigate('/');
    };

    const logout = () => {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
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
