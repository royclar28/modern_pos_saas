// ─── Customer DocType (TypeScript only — no RxDB dependency) ─────────────────

export type CustomerDocType = {
    id: string;
    storeId: string;
    companyName?: string;
    accountNumber?: string;
    taxable: boolean;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    updatedAt: number; // Unix timestamp
    isDeleted: boolean;
};
