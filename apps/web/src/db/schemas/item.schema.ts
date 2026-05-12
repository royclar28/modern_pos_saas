// ─── Item DocType (TypeScript only — no RxDB dependency) ─────────────────────

export type ItemDocType = {
    id: string;
    storeId: string;
    name: string;
    category: string;
    itemNumber?: string;
    description?: string;
    costPrice: number;
    unitPrice: number;
    stock: number;           // Stock actual (para validación visual y alertas)
    minStockAlert?: number;  // Umbral de alerta de stock mínimo (null = sin alerta)
    reorderLevel: number;
    receivingQuantity: number;
    allowAltDescription: boolean;
    isSerialized: boolean;
    sellBy: 'unit' | 'weight';    // ← NUEVO
    unitLabel?: string;       // ← NUEVO: ej. 'Kg', 'Mts', 'und', 'Lts'
    updatedAt: number; // Unix timestamp for delta sync checkpoint
};
