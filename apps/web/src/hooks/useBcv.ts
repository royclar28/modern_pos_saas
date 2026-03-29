import { useState, useEffect } from 'react';

interface BcvRateData {
    rate: number;
    updated_at: string;
    source: string;
}

export function useBcv() {
    const [rate, setRate] = useState<number>(36.50); // Fallback razonable
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchRate = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
                const response = await fetch(`${apiUrl}/settings/bcv`);
                
                if (!response.ok) {
                    throw new Error('No se pudo obtener la tasa BCV');
                }

                const data: { status: string; rate: number; updated_at: string; source: string } = await response.json();

                if (isMounted) {
                    setRate(data.rate);
                    setLastUpdated(data.updated_at);
                    // Opcional: Podrías persistirlo en localStorage para evitar calls extra si refrescan
                    localStorage.setItem('bcv_rate', String(data.rate));
                    setLoading(false);
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error('Error fetching BCV rate:', err);
                    setError(err.message);
                    setLoading(false);
                    // Usar caché si falló la red
                    const cached = localStorage.getItem('bcv_rate');
                    if (cached) setRate(parseFloat(cached));
                }
            }
        };

        fetchRate();

        return () => {
            isMounted = false;
        };
    }, []);

    return { rate, loading, error, lastUpdated };
}
