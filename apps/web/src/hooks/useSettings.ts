/**
 * useSettings.ts
 *
 * Fetches the global store settings from the NestJS backend (GET /settings)
 * and exposes them reactively. On first render, falls back to sensible defaults
 * while the request is in-flight, so the UI is never blocked.
 *
 * Returned object includes `taxRate` as a number (0-100) so CartProvider
 * can consume it directly without further parsing.
 */
import { useState, useEffect, useCallback } from 'react';

export type StoreSettings = {
    default_tax_rate: string; // e.g. "16"
    currency_symbol: string;  // e.g. "$"
    exchange_rate: string;    // e.g. "36.25"
    company: string;
    timezone: string;
    language: string;
};

/** Parsed, consumer-friendly version */
export type ParsedSettings = {
    raw: StoreSettings;
    taxRate: number;        // e.g. 16  (ready for math)
    exchangeRate: number;   // e.g. 36.25  (ready for math)
    currencySymbol: string;
    company: string;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
};

const DEFAULTS: StoreSettings = {
    default_tax_rate: '16',
    currency_symbol: '$',
    exchange_rate: '1',
    company: 'Modern POS',
    timezone: 'America/Mexico_City',
    language: 'es',
};

export const useSettings = (): ParsedSettings => {
    const [raw, setRaw] = useState<StoreSettings>(DEFAULTS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        const token = localStorage.getItem('pos_token');
        if (!token) {
            // Not logged in yet, just use defaults peacefully
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
            const res = await fetch(`${apiUrl}/settings`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: StoreSettings = await res.json();
            setRaw(data);
        } catch (err) {
            console.warn('[useSettings] Using defaults — API unavailable:', err);
            // Keep DEFAULTS so the POS keeps working offline
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return {
        raw,
        taxRate: Math.max(0, Number(raw.default_tax_rate) || 16),
        exchangeRate: Math.max(1, Number(raw.exchange_rate) || 1),
        currencySymbol: raw.currency_symbol || '$',
        company: raw.company || 'Modern POS',
        isLoading,
        error,
        refetch: fetchSettings,
    };
};
