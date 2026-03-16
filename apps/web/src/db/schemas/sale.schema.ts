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

/**
 * Payment Methods:
 *   'DIVISA'      — Cash USD
 *   'EFECTIVO_BS' — Cash Bolívares
 *   'PAGO_MOVIL'  — Mobile payment (Venezuela interbank)
 *   'PUNTO'       — POS terminal (debit/credit card)
 *
 * Change Methods (how change was given back to the customer):
 *   'DIVISA'      — Change given in USD cash
 *   'EFECTIVO_BS' — Change given in Bolívares cash
 *   'PAGO_MOVIL'  — Change sent via Pago Móvil
 */
export type PaymentMethod = 'DIVISA' | 'EFECTIVO_BS' | 'PAGO_MOVIL' | 'PUNTO' | 'FIADO';
export type ChangeMethod = 'DIVISA' | 'EFECTIVO_BS' | 'PAGO_MOVIL';
export type SaleStatus = 'PENDIENTE' | 'PAGADO';

export type SaleDocType = {
    id: string;
    storeId: string;
    invoiceNumber?: string;
    comment?: string;
    saleTime: number;        // Unix timestamp (ms)
    customerId?: string;
    employeeId: string;
    terminalId: string;      // Multi-terminal: identifies the POS register (e.g. "CAJA_01")
    subtotal: number;
    taxPercent: number;      // e.g. 16 for 16% IVA
    taxAmount: number;
    total: number;
    items: SaleItemDocType[];

    // ── Payment fields ───────────────────────────────────────────
    paymentMethod: string;       // 'DIVISA' | 'EFECTIVO_BS' | 'PAGO_MOVIL' | 'PUNTO'
    reference?: string;          // Reference number for Pago Móvil / Punto de Venta
    amountReceived?: number;     // How much the customer gave (in the payment currency)
    changeAmount?: number;       // Change given back to the customer (always in USD base)
    changeBs?: number;           // Change equivalent in Bs. (for cross-currency change)
    changeMethod?: string;       // 'DIVISA' | 'EFECTIVO_BS' | 'PAGO_MOVIL' — how was the change delivered

    // ── Credit (Fiado) fields ────────────────────────────────────
    status?: string;             // 'PENDIENTE' | 'PAGADO' — for Fiado tracking

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
        storeId: { type: 'string', maxLength: 100 },
        invoiceNumber: { type: 'string' },
        comment: { type: 'string' },
        saleTime: { type: 'number' },
        customerId: { type: 'string' },
        employeeId: { type: 'string' },
        terminalId: { type: 'string', default: 'CAJA_01' },
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
        // Payment fields
        paymentMethod: { type: 'string' },
        reference: { type: 'string' },
        amountReceived: { type: 'number' },
        changeAmount: { type: 'number' },
        changeBs: { type: 'number' },
        changeMethod: { type: 'string' },
        status: { type: 'string' },
        updatedAt: { type: 'number' },
    },
    required: ['id', 'storeId', 'saleTime', 'employeeId', 'terminalId', 'subtotal', 'taxPercent', 'taxAmount', 'total', 'items', 'paymentMethod', 'updatedAt'],
};
