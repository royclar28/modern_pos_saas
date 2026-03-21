import React, { useState } from 'react';

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

        setIsScanning(true);

        try {
            // 1. Crear FormData
            const formData = new FormData();
            formData.append('invoice', file);

            // 2. Obtener Token
            const token = localStorage.getItem('pos_token');
            if (!token) {
                throw new Error('No se encontró autenticación. Por favor inicia sesión.');
            }

            // URL del backend utilizando las variables de entorno de Vite
            const apiUrl = `http://${window.location.hostname}:3333/api`;

            // 3. Petición HTTP POST
            const res = await fetch(`${apiUrl}/inventory/scan-invoice`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}` 
                },
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`Error HTTP: ${res.status}`);
            }

            const data = await res.json();

            // 4. Manejar Respuesta Exitosamente
            if (data.products && Array.isArray(data.products) && data.products.length > 0) {
                onScanSuccess(data.products);
            } else {
                throw new Error('El backend no detectó productos en esta factura.');
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
