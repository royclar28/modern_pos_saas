// ─── CashShift DocType (TypeScript only) ─────────────────────────────────────

export type CashShiftDocType = {
    id: string;
    storeId: string;
    userId: string;
    terminalId: string;
    openedAt: number;        // Unix timestamp (ms)
    closedAt?: number;
    startingCash: number;    // Fondo de caja
    expectedCash: number;    // Calculado: startingCash + ventas efectivo
    actualCash?: number;     // Conteo físico del cajero
    difference?: number;     // actualCash - expectedCash
    status: 'OPEN' | 'CLOSED';
    salesSummary?: Record<string, number>;
    updatedAt: number;
};
