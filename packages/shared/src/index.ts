// DTO base para la sincronización con RxDB
export interface SyncPayload<T> {
    lastPulledAt: number;
    documents: T[];
}

export interface ItemDTO {
    id: string;
    name: string;
    price: number;
    updatedAt: number;
    deleted: boolean;
}
