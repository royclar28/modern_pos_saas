import { useState, useEffect } from 'react';
import { getDatabase } from '../db/database';
import { ItemDocType } from '../db/schemas/item.schema';

/**
 * useItems — Reactive hook that subscribes to the RxDB local items collection.
 * Uses RxDB's native observable (find().$) — no Provider wrapper needed.
 * The frontend NEVER fetches products from the API; it always reads from local RxDB.
 * The replication engine (useSync) pushes/pulls changes from the NestJS backend.
 */
export const useItems = () => {
    const [items, setItems] = useState<ItemDocType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let subscription: { unsubscribe: () => void } | null = null;

        const subscribe = async () => {
            const db = await getDatabase();

            // RxDB's reactive query — fires automatically when local collection changes
            subscription = db.items
                .find({ sort: [{ name: 'asc' }] })
                .$
                .subscribe((docs) => {
                    setItems(docs.map((d) => d.toJSON() as ItemDocType));
                    setIsLoading(false);
                });
        };

        subscribe().catch(console.error);

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    return { items, isLoading };
};
