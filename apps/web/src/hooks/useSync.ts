/**
 * useSync.ts — RxDB ↔ NestJS Bidirectional Replication (REST protocol)
 *
 * Uses replicateRxCollection with custom pull/push handlers.
 * The token is read fresh on every request so session changes are respected.
 *
 * Pull: GET  /api/sync/pull?updatedAt=<ms>
 * Push: POST /api/sync/push  { rows: [{ newDocumentState, assumedMasterState? }] }
 */
import { useEffect, useRef } from 'react';
import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
import { getDatabase } from '../db/database';

const getApiUrl = () =>
    (import.meta as any).env?.VITE_API_URL || `http://${window.location.hostname}:3333/api`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('pos_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const useSync = () => {
    const replicationRef = useRef<RxReplicationState<any, any> | null>(null);

    useEffect(() => {
        let cancelled = false;

        const startReplication = async () => {
            const db = await getDatabase();
            if (cancelled) return;

            const replicationState = replicateRxCollection({
                collection: db.items,
                replicationIdentifier: 'pos-items-rest-sync-v2',
                live: true,
                retryTime: 5000, // retry every 5s on network failure

                pull: {
                    async handler(lastCheckpoint, batchSize) {
                        const updatedAt = (lastCheckpoint as any)?.updatedAt ?? 0;
                        const apiUrl = getApiUrl();

                        const res = await fetch(
                            `${apiUrl}/sync/pull?updatedAt=${updatedAt}`,
                            { headers: getAuthHeaders() },
                        );

                        if (!res.ok) {
                            throw new Error(`Pull failed: ${res.status}`);
                        }

                        const data = await res.json();

                        return {
                            documents: data.documents,
                            checkpoint: data.checkpoint,
                        };
                    },
                },

                push: {
                    async handler(docs) {
                        const apiUrl = getApiUrl();

                        const rows = docs.map((d) => ({
                            newDocumentState: d.newDocumentState,
                            assumedMasterState: d.assumedMasterState ?? undefined,
                        }));

                        const res = await fetch(`${apiUrl}/sync/push`, {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ rows }),
                        });

                        if (!res.ok) {
                            throw new Error(`Push failed: ${res.status}`);
                        }

                        // conflicts = server docs that are newer
                        const conflicts = await res.json();
                        return conflicts;
                    },
                },
            });

            replicationRef.current = replicationState;

            // Log errors for debugging
            replicationState.error$.subscribe((err) => {
                console.error('[RxDB Sync Error]', err);
            });
        };

        startReplication();

        return () => {
            cancelled = true;
            if (replicationRef.current) {
                replicationRef.current.cancel();
                replicationRef.current = null;
            }
        };
    }, []);
};
