import { useLiveQuery } from 'dexie-react-hooks';
import { getOutboxDB } from '../db/outbox';
import type { ItemDocType } from '../db/schemas/item.schema';

/**
 * useItems — Reactive hook powered by Dexie's liveQuery.
 *
 * Reads from the local `items` table (Dexie IndexedDB).
 * Automatically re-renders when enqueueSyncEvent writes to the table
 * inside an atomic transaction — zero manual subscription needed.
 */
export const useItems = () => {
    const db = getOutboxDB();

    const items = useLiveQuery(
        () => db.items.orderBy('name').toArray(),
        [],
    );

    const isLoading = items === undefined;

    return {
        items: (items ?? []) as ItemDocType[],
        isLoading,
    };
};
