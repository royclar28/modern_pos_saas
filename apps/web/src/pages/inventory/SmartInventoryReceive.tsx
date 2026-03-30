import React, { useState } from 'react';
// Lightweight inline toast
const toast = {
    _show(msg: string, bg: string) {
        const el = document.createElement('div');
        el.textContent = msg;
        Object.assign(el.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
            padding: '12px 20px', borderRadius: '12px', color: '#fff',
            background: bg, fontWeight: '700', fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,.15)', opacity: '0',
            transition: 'opacity .2s', fontFamily: 'system-ui, sans-serif',
        });
        document.body.appendChild(el);
        requestAnimationFrame(() => (el.style.opacity = '1'));
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
    },
    success(msg: string) { this._show('✅ ' + msg, '#16a34a'); },
    error(msg: string) { this._show('❌ ' + msg, '#dc2626'); },
};
import { getOutboxDB } from '../../db/outbox';
import { enqueueSyncEventBatch, generateId, type EnqueueOptions } from '../../db/enqueueSyncEvent';
import { SyncEntityType, SyncAction } from '../../db/outbox.types';
import type { ItemDocType } from '../../db/schemas/item.schema';

interface IAExtractedItem {
    description: string;
    quantity: number;
    unit_cost: number;
}

interface IAInvoiceData {
    supplier_name: string;
    invoice_number: string;
    items: IAExtractedItem[];
}

export const SmartInventoryReceive: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [extractedData, setExtractedData] = useState<IAInvoiceData | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setExtractedData(null); // Reset anterior
        }
    };

    const handleScan = async () => {
        if (!selectedFile) return;

        setIsScanning(true);
        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
            const token = localStorage.getItem('pos_token') || localStorage.getItem('pos_api_token');

            const response = await fetch(`${apiUrl}/inventory/scan-invoice`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    // Nota: No poner Content-Type, fetch lo pone automático con el boundary para FormData
                },
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText);
            }

            const json = await response.json();
            if (json.status === 'ok') {
                setExtractedData(json.data);
                toast.success('Factura analizada con éxito.');
            } else {
                throw new Error(json.message);
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Error al analizar la factura: ' + error.message);
        } finally {
            setIsScanning(false);
        }
    };

    const handleItemChange = (index: number, field: keyof IAExtractedItem, value: number | string) => {
        if (!extractedData) return;
        const newItems = [...extractedData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setExtractedData({ ...extractedData, items: newItems });
    };

    const handleConfirm = async () => {
        if (!extractedData) return;
        
        const db = getOutboxDB();
        const storeId = Array.from(await db.items.toCollection().keys())[0] ? 
            (await db.items.toCollection().first())?.storeId : 'default'; 
            // Better to pull from a global config or token, but this works based on existing items.
        // Or decode from localstorage 'pos_token' if needed. Let's assume global tenant.
        
        try {
            const events: EnqueueOptions<any>[] = [];
            
            for (const item of extractedData.items) {
                // Try to find the item by name ignoring case
                const existingItems = await db.items.filter(i => 
                    i.name.toLowerCase() === item.description.toLowerCase()
                ).toArray();
                
                if (existingItems.length > 0) {
                    const existingItem = existingItems[0];
                    // Create an ADJUST_STOCK event
                    events.push({
                        entity_type: SyncEntityType.ITEM,
                        action: SyncAction.ADJUST_STOCK,
                        payload: {
                            itemId: existingItem.id,
                            delta: item.quantity,
                            reason: `IA Invoice #${extractedData.invoice_number} from ${extractedData.supplier_name}`
                        } as any, // Bypass TypeScript map limitations
                        localTable: 'items',
                        localRecordKey: existingItem.id,
                        tenant_id: existingItem.storeId,
                        // Optimistic local update
                        localUpdater: (existing: ItemDocType) => ({
                            ...existing,
                            receivingQuantity: existing.receivingQuantity + item.quantity,
                            costPrice: item.unit_cost, // Update cost if it changed
                            updatedAt: Date.now()
                        })
                    });
                } else {
                    // Create a brand new item since we don't know it
                    const newId = generateId();
                    // Assuming storeId might not be perfectly extracted here, Fallback to 'default' or fetch from Auth context if possible.
                    // For now, let's use the DB's first item storeId if available
                    const determinedStoreId = storeId || localStorage.getItem('pos_store_id') || 'UNKNOWN';

                    const newItem: ItemDocType = {
                        id: newId,
                        storeId: determinedStoreId,
                        name: item.description,
                        category: 'Pendiente Categorizar',
                        costPrice: item.unit_cost,
                        unitPrice: item.unit_cost * 1.3, // Example 30% margin default
                        receivingQuantity: item.quantity,
                        reorderLevel: 5,
                        allowAltDescription: false,
                        isSerialized: false,
                        updatedAt: Date.now()
                    };

                    events.push({
                        entity_type: SyncEntityType.ITEM,
                        action: SyncAction.CREATE,
                        payload: newItem,
                        localTable: 'items',
                        localRecord: newItem,
                        tenant_id: determinedStoreId
                    });
                }
            }

            // Execute the entire batch transactionally
            await enqueueSyncEventBatch(events);

            toast.success(`¡${extractedData.items.length} productos ingresados al almacén con éxito!`);
            
            // Reset state
            setExtractedData(null);
            setSelectedFile(null);
        } catch (error: any) {
            console.error("Error confirmando inventario:", error);
            toast.error("Hubo un error al encolar el ajuste de inventario.");
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 max-w-4xl mx-auto shadow-sm">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600 mb-6">
                🔮 Carga Inteligente de Inventario (IA)
            </h2>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fotografía de la Factura del Proveedor
                </label>
                <div className="flex items-center space-x-4">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-800 dark:file:text-blue-400"
                    />
                    <button 
                        onClick={handleScan}
                        disabled={!selectedFile || isScanning}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex flex-shrink-0 items-center gap-2"
                    >
                        {isScanning ? (
                            <span className="animate-pulse">Analizando...</span>
                        ) : (
                            <span>Extraer con IA</span>
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Soporta JPG, PNG, WEBP (Max 5MB).</p>
            </div>

            {/* Resultado del Escaneo */}
            {extractedData && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block">Proveedor Extraído</span>
                            <span className="font-semibold">{extractedData.supplier_name}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block">Factura No.</span>
                            <span className="font-semibold"># {extractedData.invoice_number}</span>
                        </div>
                    </div>

                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Borrador de Artículos</h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase px-4 py-3">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Descripción</th>
                                    <th className="px-4 py-3 font-medium w-24">Cant.</th>
                                    <th className="px-4 py-3 font-medium w-32">Costo Unit.</th>
                                    <th className="px-4 py-3 font-medium w-32 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                                {extractedData.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2">
                                            <input 
                                                className="w-full bg-transparent border-0 focus:ring-2 focus:ring-blue-500 rounded p-1"
                                                value={item.description}
                                                onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input 
                                                type="number"
                                                className="w-full bg-transparent border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 rounded p-1 text-center"
                                                value={item.quantity}
                                                onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-2 flex items-center gap-1">
                                            <span className="text-gray-400">$</span>
                                            <input 
                                                type="number" step="0.01"
                                                className="w-full bg-transparent border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 rounded p-1 text-right"
                                                value={item.unit_cost}
                                                onChange={e => handleItemChange(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium">
                                            ${(item.quantity * item.unit_cost).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button 
                            onClick={() => setExtractedData(null)}
                            className="px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirm}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                            Confirmar Entrada de Stock
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
