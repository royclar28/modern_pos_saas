import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';

export type StoreSettings = {
    default_tax_rate: string; // e.g. "16"
    currency_symbol: string;  // e.g. "$"
    exchange_rate: string;    // e.g. "36.25"
    company: string;
    timezone: string;
    language: string;
    enable_credit_sales: string; // "true" | "false"
    primaryColor?: string;
};

export type ParsedSettings = {
    raw: StoreSettings;
    taxRate: number;        
    exchangeRate: number;   
    currencySymbol: string;
    company: string;
    enableCreditSales: boolean;
    primaryColor: string;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

const DEFAULTS: StoreSettings = {
    default_tax_rate: '16',
    currency_symbol: '$',
    exchange_rate: '1',
    company: 'Merx POS',
    timezone: 'America/Caracas',
    language: 'es',
    enable_credit_sales: 'false',
    primaryColor: '#7C3AED',
};

const SettingsContext = createContext<ParsedSettings | undefined>(undefined);

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [raw, setRaw] = useState<StoreSettings>(DEFAULTS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const applyThemeVariables = (color: string) => {
        const root = document.documentElement.style;
        root.setProperty('--color-primary', color);
        const hsl = hexToHSL(color);
        if (hsl) {
            root.setProperty('--color-primary-hover', `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 10, 5)}%)`);
            root.setProperty('--color-primary-light', `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(hsl.l + 35, 95)}%)`);
        }
    };

    const fetchSettings = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = `http://${window.location.hostname}:3333/api`;
            const res = await fetch(`${apiUrl}/settings`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: StoreSettings = await res.json();
            setRaw(data);
            applyThemeVariables(data.primaryColor || '#7C3AED');
        } catch (err) {
            console.warn('[SettingsProvider] Using defaults — API unavailable:', err);
            setError((err as Error).message);
            applyThemeVariables(DEFAULTS.primaryColor!);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const value: ParsedSettings = {
        raw,
        taxRate: Math.max(0, Number(raw.default_tax_rate) || 16),
        exchangeRate: Math.max(1, Number(raw.exchange_rate) || 1),
        currencySymbol: raw.currency_symbol || '$',
        company: raw.company || 'Merx POS',
        enableCreditSales: raw.enable_credit_sales === 'true',
        primaryColor: raw.primaryColor || '#7C3AED',
        isLoading,
        error,
        refetch: fetchSettings,
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettingsContext = (): ParsedSettings => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettingsContext must be used within a SettingsProvider');
    }
    return context;
};
