import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Ruta al archivo dump SQL del proyecto legacy
const SQL_DUMP_PATH = path.resolve(__dirname, '../../../../legacy_ospos/database/db_pos_v1.sql');

async function migrateCatalogFromSQL() {
    try {
        console.log(`🔌 1. EXTRACT: Leyendo archivo SQL Legacy desde: ${SQL_DUMP_PATH}`);

        if (!fs.existsSync(SQL_DUMP_PATH)) {
            throw new Error(`No se encontró el archivo SQL en la ruta especificada: ${SQL_DUMP_PATH}`);
        }

        const sqlContent = fs.readFileSync(SQL_DUMP_PATH, 'utf-8');

        // Buscar la sentencia INSERT INTO `ospos_items` ... VALUES (...)
        const insertMatch = sqlContent.match(/INSERT INTO `ospos_items`[^\n]*VALUES\n([\s\S]*?);/);

        if (!insertMatch) {
            console.log('⚠️ No se encontraron inserciones de productos (ospos_items) en el script SQL.');
            return;
        }

        // Extraer las filas de valores
        const valuesString = insertMatch[1];

        // Un regex básico para separar las tuplas (...) ignorando comas internas en strings simples
        // Dado que el dump SQL generado por phpMyAdmin tiene el formato: ('nombre', 'cat', ID, NULL, ...)
        const rowRegex = /\((.*?)\)/g;
        let match;
        const rawItems: any[] = [];

        while ((match = rowRegex.exec(valuesString)) !== null) {
            const rowContent = match[1];
            // Separar por comas que no estén dentro de comillas simples
            // Esto es una simplificación rápida para volcados SQL predecibles
            const columns = rowContent.split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.trim().replace(/^'|'$/g, ''));
            rawItems.push(columns);
        }

        console.log(`📦 Se extrajeron ${rawItems.length} productos crudos del dump SQL.`);

        // 2. TRANSFORM: Mapear el array de OSPOS al nuevo schema Prisma
        // Orden de columnas extraído del SQL original:
        // `name` [0], `category` [1], `supplier_id` [2], `item_number` [3], `description` [4], 
        // `cost_price` [5], `unit_price` [6], `reorder_level` [7], `receiving_quantity` [8], 
        // `item_id` [9], `pic_id` [10], `allow_alt_description` [11], `is_serialized` [12], `deleted` [13]

        console.log('🔄 2. TRANSFORM: Transformando datos al nuevo formato...');

        const transformedItems = rawItems
            .filter(row => row[13] === '0') // Filtrar los que no están eliminados (deleted = 0)
            .map(row => {
                return {
                    name: row[0] || 'Sin Nombre',
                    category: row[1] || 'Desconocida',
                    itemNumber: row[3] === 'NULL' ? null : row[3],
                    description: row[4] || null,
                    costPrice: parseFloat(row[5]) || 0.0,
                    unitPrice: parseFloat(row[6]) || 0.0,
                    reorderLevel: parseFloat(row[7]) || 0.0,
                    receivingQuantity: parseInt(row[8]) || 1,
                    allowAltDescription: row[11] === '1',
                    isSerialized: row[12] === '1',
                };
            });

        // 3. LOAD: Insertar a PostgreSQL vía Prisma
        console.log('📤 3. LOAD: Cargando productos en PostgreSQL...');

        let created = 0;
        let updated = 0;

        for (const item of transformedItems) {
            if (!item.itemNumber) {
                await prisma.item.create({ data: item });
                created++;
                continue;
            }

            await prisma.item.upsert({
                where: { itemNumber: item.itemNumber },
                update: {
                    name: item.name,
                    category: item.category,
                    costPrice: item.costPrice,
                    unitPrice: item.unitPrice,
                    description: item.description,
                },
                create: item,
            });
            updated++;
        }

        console.log('✅ Migración del Catálogo Completada con Éxito.');
        console.log(`📊 Resumen: ${created} insertados sin SKU, ${updated} procesados vía SKU (upserted).`);

    } catch (error) {
        console.error('❌ Error durante la migración del catálogo:', error);
    } finally {
        await prisma.$disconnect();
        console.log('🔌 Conexión PostgreSQL (Prisma) cerrada.');
    }
}

migrateCatalogFromSQL();
