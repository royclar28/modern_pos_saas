import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getOutboxDB } from '../db/outbox';
import toast from 'react-hot-toast';

/**
 * useInitialSync — Hidratación Inicial del POS Offline
 * 
 * Se encarga de descargar el catálogo de productos (items), la lista de 
 * clientes (customers) y las categorías directamente desde el motor Laravel.
 * 
 * Este proceso debe llamarse idealmente UNA SOLA VEZ tras el inicio de sesión,
 * para asegurar que las tablas locales de IndexedDB tienen la última 
 * fotografía maestra. A partir de allí operan en modo Offline y se envían deltas reales localmente 
 * y con Event Sourcing hacia el backend.
 */
export function useInitialSync() {
    const [isHydrating, setIsHydrating] = useState(false);
    const [progress, setProgress] = useState({ steps: 0, total: 3 });

    const hydrateLocalDB = async () => {
        setIsHydrating(true);
        setProgress({ steps: 0, total: 3 });
        
        try {
            console.log('[useInitialSync] Iniciando hidratación. Obteniendo /items...');
            const db = getOutboxDB();

            // 1. Descargar Ítems
            const resItems: any = await api.get('/items');
            const items = resItems?.data ?? resItems;
            console.log(`[useInitialSync] /items respondió. ¿Es array? ${Array.isArray(items)}. Longitud: ${Array.isArray(items) ? items.length : 'N/A'}`, items);
            
            if (Array.isArray(items) && items.length > 0) {
                // Map properties from snake_case to camelCase
                const mappedItems = items.map((item: any) => ({
                    ...item,
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    description: item.description,
                    sellBy: item.sell_by ?? item.sellBy ?? 'unit',
                    unitLabel: item.unit_label ?? item.unitLabel ?? 'und',
                    receivingQuantity: Number(item.receiving_quantity ?? item.receivingQuantity ?? 1),
                    stock: Number(item.stock ?? 0),
                    itemNumber: item.item_number ?? item.itemNumber,
                    costPrice: Number(item.cost_price ?? item.costPrice ?? 0),
                    unitPrice: Number(item.unit_price ?? item.unitPrice ?? 0),
                    reorderLevel: Number(item.reorder_level ?? item.reorderLevel ?? 0),
                    minStockAlert: item.min_stock_alert !== null ? Number(item.min_stock_alert ?? item.minStockAlert) : undefined,
                    allowAltDescription: Boolean(item.allow_alt_description ?? item.allowAltDescription ?? false),
                    isSerialized: Boolean(item.is_serialized ?? item.isSerialized ?? false),
                    storeId: item.tenant_id ?? item.store_id ?? item.storeId ?? 'default',
                    createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
                    updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : Date.now()
                }));
                console.log(`[useInitialSync] Mapeo completado. Primer item de muestra:`, mappedItems[0]);
                
                try {
                    // Bulk put reemplaza conflictos por PK
                    await db.items.bulkPut(mappedItems);
                    console.log(`[useInitialSync] bulkPut exitoso en Dexie.`);
                } catch (dexieErr) {
                    console.error('[useInitialSync] Dexie rechazó el bulkPut:', dexieErr);
                    throw dexieErr;
                }
            }
            setProgress(p => ({ ...p, steps: 1 }));

            // 2. Descargar Clientes
            const resCustomers: any = await api.get('/customers');
            const customers = resCustomers?.data ?? resCustomers;
            if (Array.isArray(customers) && customers.length > 0) {
                await db.customers.bulkPut(customers);
            }
            setProgress(p => ({ ...p, steps: 2 }));

            // (Opcional) 3. Las categorías se derivan de los items, pero si ocupas
            // cachearlas aparte o sincronizar configuraciones maestras como /settings
            const resCategories: any = await api.get('/categories');
            const categories = resCategories?.data ?? resCategories;
            if (Array.isArray(categories)) {
                // Si usamos global state / zustand para categorías, aquí se guardaría
                // Ej: setGlobalCategories(categories)
                localStorage.setItem('pos_categories_cache', JSON.stringify(categories));
            }
            setProgress(p => ({ ...p, steps: 3 }));
            
            toast.success("Catálogo sincronizado exitosamente para modo Offline");

        } catch (error: any) {
            console.error("Error hidratando base de datos local:", error);
            toast.error("Error al descargar catálogo. Revisa conexión o sesión.");
        } finally {
            setIsHydrating(false);
        }
    };

    // Puedes retornar la función para que un botón de "Forzar Sincronización" o
    // un AppLoader puedan dispararla al montar
    return {
        hydrateLocalDB,
        isHydrating,
        progress
    };
}
