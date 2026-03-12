import { useEffect } from 'react';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { getDatabase } from '../db/database';

export const useSync = () => {
    useEffect(() => {
        let replicationState: any;

        const startReplication = async () => {
            const db = await getDatabase();
            const token = localStorage.getItem('pos_token'); // Fetch current token

            // Delta-Sync replication toward NestJS /items/sync endpoint
            replicationState = replicateRxCollection({
                collection: db.items,
                replicationIdentifier: 'pos-items-delta-sync-v1',
                live: true,
                pull: {
                    async handler(lastCheckpoint) {
                        const since = (lastCheckpoint as any)?.updatedAt ?? 0;
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
                        const res = await fetch(`${apiUrl}/items/sync?since=${since}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        if (!res.ok) throw new Error('Sync pull failed');
                        const data = await res.json();
                        // RxDB uses _deleted (not deleted) for soft-delete handling
                        const documents = data.documents.map((doc: any) => {
                            const { deleted, ...rest } = doc;
                            return { ...rest, _deleted: !!deleted };
                        });
                        return {
                            documents,
                            checkpoint: documents.length === 0
                                ? lastCheckpoint
                                : { updatedAt: documents[documents.length - 1].updatedAt }
                        };
                    }
                },
                push: {
                    async handler(docs) {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
                        await fetch(`${apiUrl}/sync/push`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ rows: docs.map(d => d.newDocumentState) })
                        });
                        return [];
                    }
                }
            });
        };

        startReplication();

        return () => {
            if (replicationState) {
                replicationState.cancel();
            }
        };
    }, []);
};
