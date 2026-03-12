import { RxJsonSchema } from 'rxdb';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SaleItemDocType = {
    id: string;       // e.g. `${saleId}_${line}`
    line: number;
    description?: string;
    serialNumber?: string;
    quantityPurchased: number;
    itemCostPrice: number;
    itemUnitPrice: number;
    discountPercent: number;  // 0–100
    itemId: string;
};

export type SaleDocType = {
    id: string;
    invoiceNumber?: string;
    comment?: string;
    saleTime: number;        // Unix timestamp (ms)
    customerId?: string;
    employeeId: string;
    subtotal: number;
    taxPercent: number;      // e.g. 16 for 16% IVA
    taxAmount: number;
    total: number;
    items: SaleItemDocType[];
    updatedAt: number;
};

// ─── RxDB JSON Schema ────────────────────────────────────────────────────────
// NOTE: `deleted` is RESERVED by RxDB — never add it here.
// RxDB manages soft-deletes internally via _deleted.

export const saleSchema: RxJsonSchema<SaleDocType> = {
    title: 'Sale schema',
    description: 'Point of sale transactions',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        invoiceNumber: { type: 'string' },
        comment: { type: 'string' },
        saleTime: { type: 'number' },
        customerId: { type: 'string' },
        employeeId: { type: 'string' },
        subtotal: { type: 'number' },
        taxPercent: { type: 'number' },
        taxAmount: { type: 'number' },
        total: { type: 'number' },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    line: { type: 'number' },
                    description: { type: 'string' },
                    serialNumber: { type: 'string' },
                    quantityPurchased: { type: 'number' },
                    itemCostPrice: { type: 'number' },
                    itemUnitPrice: { type: 'number' },
                    discountPercent: { type: 'number' },
                    itemId: { type: 'string' },
                },
                required: ['id', 'line', 'quantityPurchased', 'itemCostPrice', 'itemUnitPrice', 'discountPercent', 'itemId'],
            },
        },
        updatedAt: { type: 'number' },
    },
    required: ['id', 'saleTime', 'employeeId', 'subtotal', 'taxPercent', 'taxAmount', 'total', 'items', 'updatedAt'],
};
