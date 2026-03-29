import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { api } from '@/lib/api';

// Exportamos el tipo para que otros componentes (como InventoryPage y el InvoiceReviewModal) lo puedan reutilizar
export interface ScannedProduct {
    name: string;
    sku: string;
    costPrice: number;
    unitPrice: number;
    quantity: number;
    category: string;
}

interface InvoiceScannerProps {
    onScanSuccess: (products: ScannedProduct[]) => void;
    onError?: (errorMsg: string) => void;
}

export const InvoiceScannerModal = ({ onScanSuccess, onError }: InvoiceScannerProps) => {
    const [isScanning, setIsScanning] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Forzar renderizado inmediato del spinner antes de preparar la red
        flushSync(() => {
            setIsScanning(true);
        });

        try {
            // 1. Crear FormData con la clave correcta esperada por Laravel
            const formData = new FormData();
            formData.append('image', file);

            // 2. Usar el cliente centralizado API (resuelve bearer token, url y errores)
            const responseData = await api.postForm('/inventory/scan-invoice', formData);

            // El backend devuelve: { status: 'ok', data: { supplier_name, items: [...] } }
            const extractedItems = responseData?.data?.items || [];

            // 4. Manejar Respuesta Exitosamente (Mapeando a la interfaz esperada por el UI)
            if (Array.isArray(extractedItems) && extractedItems.length > 0) {
                const mappedProducts: ScannedProduct[] = extractedItems.map((item: any) => ({
                    name: item.description || 'Producto sin nombre',
                    sku: `AI-SCAN-${Math.floor(Math.random() * 10000)}`,
                    costPrice: Number(item.unit_cost) || 0,
                    unitPrice: (Number(item.unit_cost) || 0) * 1.3, // 30% default markup
                    quantity: Number(item.quantity) || 1,
                    category: 'Sin Categoría'
                }));
                onScanSuccess(mappedProducts);
            } else {
                throw new Error('La IA no logró extraer productos de esta imagen.');
            }

        } catch (err: any) {
            console.error('Fallo al escanear factura:', err);
            if (onError) {
                onError(err.message || 'Error al procesar la factura. Intenta de nuevo.');
            } else {
                alert(err.message || 'Error al procesar la factura. Intenta de nuevo.');
            }
        } finally {
            // 5. Apagar loading y limpiar input
            setIsScanning(false);
            e.target.value = ''; 
        }
    };

    return (
        <label
            className={`cursor-pointer bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white font-bold py-2 px-5 rounded-xl shadow-md flex items-center gap-2 whitespace-nowrap ${
                isScanning ? 'opacity-60 pointer-events-none' : ''
            }`}
        >
            <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={isScanning}
            />
            {isScanning ? (
                <><span className="animate-spin">⟳</span> Analizando con IA...</>
            ) : (
                <>📄 Escanear Factura</>
            )}
        </label>
    );
};
