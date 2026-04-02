// ─── Sale DocTypes (TypeScript only — no RxDB dependency) ────────────────────

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
export type PaymentMethod = 'DIVISA' | 'EFECTIVO_BS' | 'PAGO_MOVIL' | 'PUNTO' | 'FIADO' | 'MIXTO';
export type ChangeMethod = 'DIVISA' | 'EFECTIVO_BS' | 'PAGO_MOVIL';

export interface ArrayPayment {
    method: PaymentMethod;
    amountUsd: number;
    amountBs: number;
    reference?: string;
}
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
    paymentMethod: string;       // 'DIVISA' | 'EFECTIVO_BS' | 'PAGO_MOVIL' | 'PUNTO' | 'MIXTO'
    reference?: string;          // Reference number for Pago Móvil / Punto de Venta
    amountReceived?: number;     // How much the customer gave (in the payment currency)
    changeAmount?: number;       // Change given back to the customer (always in USD base)
    changeBs?: number;           // Change equivalent in Bs. (for cross-currency change)
    changeMethod?: string;       // 'DIVISA' | 'EFECTIVO_BS' | 'PAGO_MOVIL' — how was the change delivered
    payments?: ArrayPayment[];   // Array of mixed partial payments

    // ── Credit (Fiado) fields ────────────────────────────────────
    status?: string;             // 'PENDIENTE' | 'PAGADO' — for Fiado tracking
    paidAmount?: number;         // Amount paid towards the partial debt
    dueDate?: number;            // Unix timestamp (ms) for payment deadline

    updatedAt: number;
};
