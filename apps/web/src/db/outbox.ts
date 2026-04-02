/**
 * outbox.ts — Dexie.js Database for the POS Outbox Pattern
 *
 * Two categories of tables:
 *   1. READ tables (items, sales, customers) — local cache for instant UI reads
 *   2. WRITE table (sync_queue) — outbox for offline event sourcing
 *
 * The read tables are populated from the backend during initial hydration
 * and updated optimistically by the enqueueSyncEvent transactional writes.
 */
import Dexie, { type Table } from 'dexie';
import type { SyncQueueEvent } from './outbox.types';
import type { ItemDocType } from './schemas/item.schema';
import type { SaleDocType } from './schemas/sale.schema';
import type { CustomerDocType } from './schemas/customer.schema';
import type { CashShiftDocType } from './schemas/cashshift.schema';

class PosOutboxDB extends Dexie {
  // ── READ tables (local cache) ──────────────────────────────────────────────
  items!: Table<ItemDocType, string>;
  sales!: Table<SaleDocType, string>;
  customers!: Table<CustomerDocType, string>;
  shifts!: Table<CashShiftDocType, string>;

  // ── WRITE table (outbox / bandeja de salida) ───────────────────────────────
  sync_queue!: Table<SyncQueueEvent, number>;

  constructor() {
    super('pos_outbox_v1');

    this.version(1).stores({
      items: 'id, name, category, storeId, updatedAt',
      sales: 'id, saleTime, employeeId, storeId, customerId, paymentMethod, status',
      customers: 'id, firstName, lastName, storeId',
      sync_queue: '++event_id, sync_status, entity_type, occurred_at',
    });

    // v2 — Add shifts table
    this.version(2).stores({
      items: 'id, name, category, storeId, updatedAt',
      sales: 'id, saleTime, employeeId, storeId, customerId, paymentMethod, status',
      customers: 'id, firstName, lastName, storeId',
      shifts: 'id, userId, terminalId, storeId, status, openedAt',
      sync_queue: '++event_id, sync_status, entity_type, occurred_at',
    });

    // v3 — Add itemNumber index for invoice scan upsert
    this.version(3).stores({
      items: 'id, name, category, storeId, updatedAt, itemNumber',
      sales: 'id, saleTime, employeeId, storeId, customerId, paymentMethod, status',
      customers: 'id, firstName, lastName, storeId',
      shifts: 'id, userId, terminalId, storeId, status, openedAt',
      sync_queue: '++event_id, sync_status, entity_type, occurred_at',
    });
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────
let db: PosOutboxDB | null = null;

export const getOutboxDB = (): PosOutboxDB => {
  if (!db) {
    db = new PosOutboxDB();
  }
  return db;
};

export type { PosOutboxDB };
