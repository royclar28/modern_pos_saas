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
            const db = getOutboxDB();

            // 1. Descargar Ítems
            const items = await api.get('/items');
            if (Array.isArray(items) && items.length > 0) {
                // Bulk put reemplaza conflictos por PK
                await db.items.bulkPut(items);
            }
            setProgress(p => ({ ...p, steps: 1 }));

            // 2. Descargar Clientes
            const customers = await api.get('/customers');
            if (Array.isArray(customers) && customers.length > 0) {
                await db.customers.bulkPut(customers);
            }
            setProgress(p => ({ ...p, steps: 2 }));

            // (Opcional) 3. Las categorías se derivan de los items, pero si ocupas
            // cachearlas aparte o sincronizar configuraciones maestras como /settings
            const categories = await api.get('/categories');
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
