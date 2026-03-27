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

class PosOutboxDB extends Dexie {
  // ── READ tables (local cache) ──────────────────────────────────────────────
  items!: Table<ItemDocType, string>;
  sales!: Table<SaleDocType, string>;
  customers!: Table<CustomerDocType, string>;

  // ── WRITE table (outbox / bandeja de salida) ───────────────────────────────
  sync_queue!: Table<SyncQueueEvent, number>;

  constructor() {
    super('pos_outbox_v1');

    this.version(1).stores({
      // Read tables — indexed fields for quick lookups
      items: 'id, name, category, storeId, updatedAt',
      sales: 'id, saleTime, employeeId, storeId, customerId, paymentMethod, status',
      customers: 'id, firstName, lastName, storeId',

      // Outbox — indexed by status for the drain loop
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
