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
    reorderLevel: number;
    receivingQuantity: number;
    allowAltDescription: boolean;
    isSerialized: boolean;
    updatedAt: number; // Unix timestamp for delta sync checkpoint
};
