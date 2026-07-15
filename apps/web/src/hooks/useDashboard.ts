/**
 * useDashboard.ts — Hook para el Dashboard principal.
 *
 * Consume GET /api/dashboard/summary para mostrar KPIs en tiempo real:
 *   - Ingresos del día (ventas + abonos)
 *   - Deuda pendiente global
 *   - Alertas de stock
 *   - Desglose por método de pago
 */
import { useState, useEffect, useCallback } from 'react';

interface BreakdownItem {
    method: string;
    count: number;
    total: number;
    percentage: number;
}

interface TodaySummary {
    date: string;
    revenue: number;
    direct_sales: number;
    debt_payments: number;
    transaction_count: number;
    units_sold: number;
    new_debt_amount: number;
    new_debt_count: number;
    breakdown: BreakdownItem[];
}

interface DebtSummary {
    total_pending: number;
    customers_with_debt: number;
    oldest_debt_days: number;
    pending_tickets: number;
}

interface StockSummary {
    low_stock_count: number;
    out_of_stock_count: number;
    total_items: number;
}

interface DashboardData {
    today: TodaySummary;
    debt: DebtSummary;
    stock: StockSummary;
}

interface UseDashboardResult {
    data: DashboardData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export const useDashboard = (): UseDashboardResult => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        try {
            const token = localStorage.getItem('pos_token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

            const res = await fetch(`${apiUrl}/dashboard/summary`, {
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
            });

            if (res.status === 401) return; // Session expired, AuthProvider handles it

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const json: DashboardData = await res.json();
            setData(json);
            setError(null);
        } catch (err: any) {
            // Silently degrade — dashboard works offline with last known data
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary();
        // Auto-refresh every 30s
        const interval = setInterval(fetchSummary, 30_000);
        return () => clearInterval(interval);
    }, [fetchSummary]);

    return { data, isLoading, error, refetch: fetchSummary };
};
