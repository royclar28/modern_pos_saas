import { useState, useEffect } from 'react';
import { SaleDocType } from '../db/schemas/sale.schema';

interface SaleWithRelations extends SaleDocType {
    items: any[];
    customer?: any;
}

export function useInvoices() {
    const [invoices, setInvoices] = useState<SaleWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvoices = async () => {
        setLoading(true);
        setError(null);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
            const token = localStorage.getItem('pos_token') || localStorage.getItem('pos_api_token');

            if (!token) {
                throw new Error("No estás autenticado.");
            }

            const response = await fetch(`${apiUrl}/sales`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: No se pudieron obtener las facturas.`);
            }

            const json = await response.json();
            
            if (json.status === 'ok') {
                setInvoices(json.data);
            } else {
                throw new Error(json.message || 'Error desconocido.');
            }

        } catch (err: any) {
            console.error('Error al cargar historial de facturas:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Carga inicial
        fetchInvoices();
    }, []);

    return { invoices, loading, error, refetch: fetchInvoices };
}
