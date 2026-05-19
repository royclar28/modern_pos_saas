import { db } from '../db/database';

export const syncInitialData = async (apiUrl: string, token: string): Promise<void> => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // Realizamos ambas peticiones en paralelo
        const [categoriesRes, productsRes] = await Promise.all([
            fetch(`${apiUrl}/categories`, { headers }),
            fetch(`${apiUrl}/products`, { headers })
        ]);

        if (!categoriesRes.ok || !productsRes.ok) {
            throw new Error('Error al obtener datos del catálogo para sincronización');
        }

        const categories = await categoriesRes.json();
        const products = await productsRes.json();

        // En caso de que la API devuelva la data dentro de un objeto { data: [...] }
        const categoriesData = Array.isArray(categories) ? categories : (categories.data || []);
        const productsData = Array.isArray(products) ? products : (products.data || []);

        // Guardamos todo de forma eficiente con bulkPut dentro de una transacción
        await db.transaction('rw', db.categories, db.products, async () => {
            if (categoriesData.length > 0) {
                await db.categories.bulkPut(categoriesData);
            }
            if (productsData.length > 0) {
                await db.products.bulkPut(productsData);
            }
        });

    } catch (error) {
        console.error('Error en syncInitialData:', error);
        throw error;
    }
};
