import { enqueueSyncEvent, generateId } from '../db/enqueueSyncEvent';
import { SyncEntityType, SyncAction } from '../db/outbox.types';
import { ItemDocType } from '../db/schemas/item.schema';

export type BusinessTypeCode =
    | 'MINIMARKET'
    | 'FERRETERIA'
    | 'LICORERIA'
    | 'FARMACIA'
    | 'BOUTIQUE'
    | 'CAFETERIA'
    | 'OTRO';

export interface DemoProductTemplate {
    name: string;
    sku: string;
    costPrice: number;
    unitPrice: number;
    stock: number;
    reorderLevel: number;
    sellBy: 'unit' | 'weight';
    unitLabel: string;
}

export interface BusinessTypeInfo {
    code: BusinessTypeCode;
    icon: string;
    label: string;
    shortLabel: string;
    demoProducts: DemoProductTemplate[];
}

export const BUSINESS_TYPES_LIST: BusinessTypeInfo[] = [
    {
        code: 'MINIMARKET',
        icon: '🛒',
        label: 'Minimarket / Bodega / Abasto',
        shortLabel: 'Minimarket',
        demoProducts: [
            { name: 'Harina P.A.N. 1Kg', sku: 'MIN-001', costPrice: 0.95, unitPrice: 1.35, stock: 48, reorderLevel: 10, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Queso Blanco Duro', sku: 'MIN-002', costPrice: 4.20, unitPrice: 5.80, stock: 15, reorderLevel: 3, sellBy: 'weight', unitLabel: 'Kg' },
            { name: 'Arroz Blanco 1Kg', sku: 'MIN-003', costPrice: 0.90, unitPrice: 1.30, stock: 36, reorderLevel: 8, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Refresco Cola 2L', sku: 'MIN-004', costPrice: 1.40, unitPrice: 2.10, stock: 24, reorderLevel: 6, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Café Molido Gourmet 250g', sku: 'MIN-005', costPrice: 2.30, unitPrice: 3.25, stock: 20, reorderLevel: 5, sellBy: 'unit', unitLabel: 'und' },
        ],
    },
    {
        code: 'FERRETERIA',
        icon: '🔨',
        label: 'Ferretería y Repuestos',
        shortLabel: 'Ferretería',
        demoProducts: [
            { name: 'Destornillador Estría Profesional', sku: 'FER-001', costPrice: 1.80, unitPrice: 3.50, stock: 25, reorderLevel: 5, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Cable Eléctrico THW #12', sku: 'FER-002', costPrice: 0.55, unitPrice: 0.95, stock: 100, reorderLevel: 20, sellBy: 'weight', unitLabel: 'Mts' },
            { name: 'Cinta Métrica 5 Metros', sku: 'FER-003', costPrice: 2.50, unitPrice: 4.50, stock: 18, reorderLevel: 4, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Bombillo LED 12W Luz Blanca', sku: 'FER-004', costPrice: 0.85, unitPrice: 1.75, stock: 50, reorderLevel: 10, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Silicón Transparente Multiuso', sku: 'FER-005', costPrice: 2.10, unitPrice: 3.80, stock: 20, reorderLevel: 5, sellBy: 'unit', unitLabel: 'und' },
        ],
    },
    {
        code: 'LICORERIA',
        icon: '🍾',
        label: 'Licorería y Bodegón',
        shortLabel: 'Licorería',
        demoProducts: [
            { name: 'Caja Cerveza Pilsen (36 und)', sku: 'LIC-001', costPrice: 18.00, unitPrice: 24.00, stock: 30, reorderLevel: 8, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Ron Añejo Especial 0.75L', sku: 'LIC-002', costPrice: 7.50, unitPrice: 11.00, stock: 24, reorderLevel: 6, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Vino Tinto Cabernet 750ml', sku: 'LIC-003', costPrice: 6.20, unitPrice: 9.50, stock: 15, reorderLevel: 4, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Bolsa de Hielo 5Kg', sku: 'LIC-004', costPrice: 0.80, unitPrice: 1.50, stock: 40, reorderLevel: 10, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Refresco Mezclador 1.5L', sku: 'LIC-005', costPrice: 1.10, unitPrice: 1.80, stock: 30, reorderLevel: 6, sellBy: 'unit', unitLabel: 'und' },
        ],
    },
    {
        code: 'FARMACIA',
        icon: '💊',
        label: 'Farmacia y Salud',
        shortLabel: 'Farmacia',
        demoProducts: [
            { name: 'Acetaminofén 500mg (Blíster x10)', sku: 'FAR-001', costPrice: 0.60, unitPrice: 1.20, stock: 60, reorderLevel: 15, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Vitamina C Efervescente (Tubo)', sku: 'FAR-002', costPrice: 2.10, unitPrice: 3.50, stock: 30, reorderLevel: 8, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Alcohol Antiséptico 250ml', sku: 'FAR-003', costPrice: 0.90, unitPrice: 1.65, stock: 40, reorderLevel: 10, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Algodón Hidrófilo 50g', sku: 'FAR-004', costPrice: 0.75, unitPrice: 1.40, stock: 25, reorderLevel: 5, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Gel Antibacterial 120ml', sku: 'FAR-005', costPrice: 1.10, unitPrice: 2.00, stock: 35, reorderLevel: 8, sellBy: 'unit', unitLabel: 'und' },
        ],
    },
    {
        code: 'BOUTIQUE',
        icon: '👗',
        label: 'Boutique, Ropa y Calzado',
        shortLabel: 'Boutique',
        demoProducts: [
            { name: 'Franela Básica Algodón Premium', sku: 'BOU-001', costPrice: 6.00, unitPrice: 12.00, stock: 25, reorderLevel: 5, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Jean Clásico Corte Recto', sku: 'BOU-002', costPrice: 14.00, unitPrice: 28.00, stock: 18, reorderLevel: 4, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Calzado Casual Deportivo', sku: 'BOU-003', costPrice: 18.00, unitPrice: 35.00, stock: 12, reorderLevel: 3, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Correa de Cuero Unicolor', sku: 'BOU-004', costPrice: 4.50, unitPrice: 9.50, stock: 15, reorderLevel: 3, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Gorra Ajustable Bordada', sku: 'BOU-005', costPrice: 3.80, unitPrice: 8.00, stock: 20, reorderLevel: 4, sellBy: 'unit', unitLabel: 'und' },
        ],
    },
    {
        code: 'CAFETERIA',
        icon: '☕',
        label: 'Cafetería y Panadería',
        shortLabel: 'Cafetería',
        demoProducts: [
            { name: 'Café Con Leche Grande', sku: 'CAF-001', costPrice: 0.65, unitPrice: 1.50, stock: 100, reorderLevel: 15, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Cachito de Jamón Recién Horneado', sku: 'CAF-002', costPrice: 0.70, unitPrice: 1.60, stock: 40, reorderLevel: 8, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Empanada de Queso / Carne', sku: 'CAF-003', costPrice: 0.55, unitPrice: 1.25, stock: 50, reorderLevel: 10, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Pan Campesino Artesanal', sku: 'CAF-004', costPrice: 0.80, unitPrice: 1.75, stock: 35, reorderLevel: 8, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Jugo Natural de Naranja 400ml', sku: 'CAF-005', costPrice: 0.75, unitPrice: 1.80, stock: 30, reorderLevel: 6, sellBy: 'unit', unitLabel: 'und' },
        ],
    },
    {
        code: 'OTRO',
        icon: '🏪',
        label: 'Otro Comercio / Multirubro',
        shortLabel: 'Otro Comercio',
        demoProducts: [
            { name: 'Producto Destacado A', sku: 'GEN-001', costPrice: 2.00, unitPrice: 4.00, stock: 30, reorderLevel: 5, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Producto Estándar B', sku: 'GEN-002', costPrice: 5.00, unitPrice: 8.50, stock: 20, reorderLevel: 4, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Artículo por Peso / Medida', sku: 'GEN-003', costPrice: 3.00, unitPrice: 5.50, stock: 15, reorderLevel: 3, sellBy: 'weight', unitLabel: 'Kg' },
            { name: 'Kit Promocional Especial', sku: 'GEN-004', costPrice: 7.50, unitPrice: 12.00, stock: 10, reorderLevel: 2, sellBy: 'unit', unitLabel: 'und' },
            { name: 'Servicio / Cargo General', sku: 'GEN-005', costPrice: 1.00, unitPrice: 3.00, stock: 99, reorderLevel: 5, sellBy: 'unit', unitLabel: 'und' },
        ],
    },
];

export function getBusinessTypeInfo(code?: string | null): BusinessTypeInfo {
    const normalized = (code || 'MINIMARKET').toUpperCase();
    return BUSINESS_TYPES_LIST.find(b => b.code === normalized) || BUSINESS_TYPES_LIST[0];
}

/**
 * Seeds 5 demo products tailored to the tenant's businessType into local Dexie + Outbox sync queue.
 */
export async function seedDemoProductsForTenant(
    businessType: string | undefined,
    tenantId: string
): Promise<number> {
    const info = getBusinessTypeInfo(businessType);
    const now = Date.now();

    for (const tpl of info.demoProducts) {
        const id = generateId();
        const newItem: ItemDocType = {
            id,
            storeId: tenantId,
            name: tpl.name,
            category_id: undefined,
            brand_id: undefined,
            itemNumber: tpl.sku,
            description: `Producto de ejemplo (${info.shortLabel})`,
            costPrice: tpl.costPrice,
            unitPrice: tpl.unitPrice,
            stock: tpl.stock,
            reorderLevel: tpl.reorderLevel,
            receivingQuantity: tpl.stock,
            allowAltDescription: false,
            isSerialized: false,
            sellBy: tpl.sellBy,
            unitLabel: tpl.unitLabel,
            updatedAt: now,
        };

        await enqueueSyncEvent({
            entity_type: SyncEntityType.ITEM,
            action: SyncAction.CREATE,
            payload: {
                id,
                name: newItem.name,
                category_id: newItem.category_id,
                brand_id: newItem.brand_id,
                itemNumber: newItem.itemNumber,
                description: newItem.description,
                costPrice: newItem.costPrice,
                unitPrice: newItem.unitPrice,
                reorderLevel: newItem.reorderLevel,
                receivingQuantity: newItem.receivingQuantity,
                sellBy: newItem.sellBy,
                unitLabel: newItem.unitLabel,
            },
            tenant_id: tenantId,
            localTable: 'items',
            localRecord: newItem,
        });
    }

    return info.demoProducts.length;
}
