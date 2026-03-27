// ─── Enums estrictos ─────────────────────────────────────────────────────────

export enum SyncEntityType {
  ITEM = 'ITEM',
  SALE = 'SALE',
  CUSTOMER = 'CUSTOMER',
  SALE_PAYMENT = 'SALE_PAYMENT',
}

export enum SyncAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ADJUST_STOCK = 'ADJUST_STOCK',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  IN_FLIGHT = 'IN_FLIGHT',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
}

// ─── Payloads tipados por entidad ────────────────────────────────────────────

export type ItemPayload = {
  id: string;
  name: string;
  category: string;
  itemNumber?: string;
  description?: string;
  costPrice: number;
  unitPrice: number;
  reorderLevel: number;
  receivingQuantity: number;
};

export type SalePayload = {
  id: string;
  employeeId: string;
  terminalId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
  }>;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  customerId?: string;
  reference?: string;
  amountReceived?: number;
  changeAmount?: number;
  changeBs?: number;
  changeMethod?: string;
  status?: string;
};

export type CustomerPayload = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  taxable: boolean;
};

export type StockAdjustPayload = {
  itemId: string;
  delta: number;
  reason: string;
};

export type SalePaymentPayload = {
  saleId: string;
  amount: number;
  method: string;
};

// ─── Mapa de payloads indexado por entity type ───────────────────────────────

export type SyncPayloadMap = {
  [SyncEntityType.ITEM]: ItemPayload;
  [SyncEntityType.SALE]: SalePayload;
  [SyncEntityType.CUSTOMER]: CustomerPayload;
  [SyncEntityType.SALE_PAYMENT]: SalePaymentPayload;
};

// ─── Registro de la cola de sincronización ───────────────────────────────────

export interface SyncQueueEvent<T extends SyncEntityType = SyncEntityType> {
  event_id?: number;         // auto-increment PK (Dexie)
  tenant_id: string;         // storeId del JWT
  entity_type: T;
  action: SyncAction;
  payload: SyncPayloadMap[T];
  occurred_at: number;       // Date.now() — timestamp del evento en el cliente
  sync_status: SyncStatus;
  retry_count: number;
  error_log: string | null;
}
