// ─── Employee DocType (TypeScript only — no RxDB dependency) ─────────────────

export type EmployeeDocType = {
    id: string;
    storeId: string;
    role: string;
    username: string;
    password?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    updatedAt: number; // Unix timestamp
    deleted: boolean;
};
