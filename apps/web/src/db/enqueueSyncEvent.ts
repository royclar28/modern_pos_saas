/**
 * enqueueSyncEvent.ts — Atomic Outbox Interceptor
 *
 * This is the SINGLE entry point for all write operations in the frontend.
 * Components call this function instead of directly inserting into Dexie or
 * making fetch() calls to the backend.
 *
 * Transaction Guarantee:
 *   Uses Dexie.transaction('rw', ...) to atomically:
 *   1. Write the entity to the local READ table (for instant UI update)
 *   2. Enqueue the sync event in the sync_queue WRITE table
 *   If either operation fails, both are rolled back.
 *
 * UUID Generation:
 *   All entities get their ID generated client-side BEFORE the transaction,
 *   using the `uuid` library (works on insecure HTTP contexts, unlike
 *   crypto.randomUUID which requires HTTPS).
 *
 * @example
 *   // Creating a product (InventoryPage.tsx):
 *   const id = generateId();
 *   await enqueueSyncEvent({
 *     entity_type: SyncEntityType.ITEM,
 *     action: SyncAction.CREATE,
 *     payload: { id, name: 'Coca-Cola', ... },
 *     localTable: 'items',
 *     localRecord: { id, name: 'Coca-Cola', ... },  // full ItemDocType
 *     tenant_id: storeId,
 *   });
 *
 *   // Updating a product:
 *   await enqueueSyncEvent({
 *     entity_type: SyncEntityType.ITEM,
 *     action: SyncAction.UPDATE,
 *     payload: { id: existingId, name: 'Pepsi', ... },
 *     localTable: 'items',
 *     localRecord: { ...updatedItem },
 *     tenant_id: storeId,
 *   });
 *
 *   // Deleting a product (soft-delete):
 *   await enqueueSyncEvent({
 *     entity_type: SyncEntityType.ITEM,
 *     action: SyncAction.DELETE,
 *     payload: { id: existingId, ... },
 *     localTable: 'items',
 *     localRecordKey: existingId,   // delete by key instead of put
 *     tenant_id: storeId,
 *   });
 */
import { v4 as uuidv4 } from 'uuid';
import { getOutboxDB } from './outbox';
import {
  SyncEntityType,
  SyncAction,
  SyncStatus,
  type SyncPayloadMap,
} from './outbox.types';

// ─── UUID Generator (works on HTTP, no crypto.randomUUID needed) ─────────────

export const generateId = (): string => uuidv4();

// ─── Types for the atomic write ──────────────────────────────────────────────

type LocalTableName = 'items' | 'sales' | 'customers' | 'shifts';

/**
 * Options for a CREATE or UPDATE event.
 * The localRecord is the full document to put() into the read table.
 */
type UpsertEventOptions<T extends SyncEntityType> = {
  entity_type: T;
  action: SyncAction.CREATE | SyncAction.UPDATE | SyncAction.OPEN;
  payload: SyncPayloadMap[T];
  tenant_id: string;
  localTable: LocalTableName;
  localRecord: any; // ItemDocType | SaleDocType | CustomerDocType
};

/**
 * Options for a DELETE event.
 * The localRecordKey is the PK to delete from the read table.
 */
type DeleteEventOptions<T extends SyncEntityType> = {
  entity_type: T;
  action: SyncAction.DELETE;
  payload: SyncPayloadMap[T];
  tenant_id: string;
  localTable: LocalTableName;
  localRecordKey: string; // PK to remove from the read table
};

/**
 * Options for events that DON'T touch a read table (e.g. SALE_PAYMENT
 * where you only need the outbox event). Only the outbox event is written.
 */
type QueueOnlyEventOptions<T extends SyncEntityType> = {
  entity_type: T;
  action: SyncAction;
  payload: SyncPayloadMap[T];
  tenant_id: string;
  localTable?: undefined;
};

/**
 * Options for events that PARTIALLY update an existing local record.
 * Uses a localUpdater function to transform the existing record in-place.
 * Perfect for stock adjustments: read current → apply delta → write back.
 */
type LocalUpdateEventOptions<T extends SyncEntityType> = {
  entity_type: T;
  action: SyncAction;
  payload: SyncPayloadMap[T];
  tenant_id: string;
  localTable: LocalTableName;
  localRecordKey: string;
  localUpdater: (existing: any) => any;
};

export type EnqueueOptions<T extends SyncEntityType> =
  | UpsertEventOptions<T>
  | DeleteEventOptions<T>
  | QueueOnlyEventOptions<T>
  | LocalUpdateEventOptions<T>;

// ─── Core Function ───────────────────────────────────────────────────────────

/**
 * Executes the local-table side-effect for a single event option.
 * Must be called INSIDE a Dexie transaction.
 */
async function applyLocalWrite(options: EnqueueOptions<any>): Promise<void> {
  const db = getOutboxDB();

  if (!options.localTable) return;

  if (options.action === SyncAction.DELETE && 'localRecordKey' in options) {
    await db[options.localTable].delete(options.localRecordKey);
  } else if ('localUpdater' in options && typeof options.localUpdater === 'function') {
    // Partial update — read current, apply updater, write back
    const existing = await db[options.localTable].get(options.localRecordKey);
    if (existing) {
      const updated = options.localUpdater(existing);
      await db[options.localTable].put(updated);
    }
  } else if ('localRecord' in options) {
    await db[options.localTable].put(options.localRecord);
  }
}

/**
 * enqueueSyncEvent — Atomic outbox write (single event).
 *
 * Wraps local-table write + outbox enqueue in a single Dexie transaction.
 * Returns the auto-generated event_id from the sync_queue.
 */
export async function enqueueSyncEvent<T extends SyncEntityType>(
  options: EnqueueOptions<T>,
): Promise<number> {
  const db = getOutboxDB();

  const { entity_type, action, payload, tenant_id } = options;

  // Determine which tables participate in the transaction
  const tables = [db.sync_queue];
  if (options.localTable) {
    tables.push(db[options.localTable] as any);
  }

  let eventId: number = 0;

  await db.transaction('rw', tables, async () => {
    await applyLocalWrite(options);

    eventId = (await db.sync_queue.add({
      tenant_id,
      uuid: uuidv4(),
      entity_type,
      action,
      payload: payload as any,
      occurred_at: Date.now(),
      sync_status: SyncStatus.PENDING,
      retry_count: 0,
      error_log: null,
    })) as number;
  });

  return eventId;
}

// ─── Batch Function (Atomic Multi-Event) ─────────────────────────────────────

/**
 * enqueueSyncEventBatch — Atomic batch outbox write.
 *
 * Takes an array of EnqueueOptions and executes ALL local writes + outbox
 * enqueues inside a SINGLE Dexie transaction. If any operation fails,
 * everything is rolled back.
 *
 * @example
 *   // Checkout: 1 sale + N stock decrements, all atomic
 *   await enqueueSyncEventBatch([
 *     { entity_type: SALE, action: CREATE, localTable: 'sales', localRecord: saleDoc, ... },
 *     { entity_type: ITEM, action: ADJUST_STOCK, localTable: 'items', localRecordKey: itemId, localUpdater: (item) => ({ ...item, receivingQuantity: item.receivingQuantity - qty }), ... },
 *   ]);
 */
export async function enqueueSyncEventBatch(
  events: EnqueueOptions<any>[],
): Promise<number[]> {
  const db = getOutboxDB();

  // Collect ALL tables that participate in the transaction (deduped)
  const tableSet = new Set<string>(['sync_queue']);
  for (const evt of events) {
    if (evt.localTable) tableSet.add(evt.localTable);
  }
  const tables = Array.from(tableSet).map((name) =>
    name === 'sync_queue' ? db.sync_queue : (db as any)[name],
  );

  const eventIds: number[] = [];

  await db.transaction('rw', tables, async () => {
    const now = Date.now();

    for (const options of events) {
      // 1. Apply local side-effect
      await applyLocalWrite(options);

      // 2. Enqueue outbox event
      const id = (await db.sync_queue.add({
        tenant_id: options.tenant_id,
        uuid: uuidv4(),
        entity_type: options.entity_type,
        action: options.action,
        payload: options.payload as any,
        occurred_at: now,
        sync_status: SyncStatus.PENDING,
        retry_count: 0,
        error_log: null,
      })) as number;

      eventIds.push(id);
    }
  });

  return eventIds;
}

