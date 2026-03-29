/**
 * useSync.ts — Outbox Drain Loop (replaces RxDB replication)
 *
 * Periodically checks the sync_queue for PENDING events and pushes them
 * to the backend via REST. On success, marks events as SYNCED. On failure,
 * increments retry_count and logs the error.
 *
 * Also handles initial data pull on mount (bootstrap from backend).
 */
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getOutboxDB } from '../db/outbox';
import { SyncStatus } from '../db/outbox.types';

const DRAIN_INTERVAL_MS = 5_000; // check every 5s
const MAX_RETRIES = 10;

const getApiUrl = () => {
    let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
    if (window.location.hostname !== 'localhost' && apiUrl.includes('localhost')) {
        apiUrl = apiUrl.replace('localhost', window.location.hostname);
    }
    return apiUrl;
};

const getAuthHeaders = () => {
    // Cuando el usuario haga login, guardaremos el token aquí
    const token = localStorage.getItem('pos_token') || localStorage.getItem('pos_api_token');
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

/**
 * Drain one batch of pending outbox events to the backend.
 * Returns the number of events successfully synced.
 */
async function drainOutbox(): Promise<number> {
    const db = getOutboxDB();
        const pending = await db.sync_queue
        .where('sync_status')
        .equals(SyncStatus.PENDING)
        .toArray();

    const failed = await db.sync_queue
        .where('sync_status')
        .equals(SyncStatus.FAILED)
        .toArray();

    // Select events to sync: pending + failed that still have retries
    let eventsToSync = [...pending, ...failed]
        .filter(e => (e.retry_count || 0) < MAX_RETRIES)
        .sort((a, b) => a.occurred_at - b.occurred_at)
        .slice(0, 50);

    if (eventsToSync.length === 0) return 0;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
    let synced = 0;

    // Mark all as IN_FLIGHT
    await Promise.all(
        eventsToSync.map(e => db.sync_queue.update(e.event_id!, { sync_status: SyncStatus.IN_FLIGHT }))
    );

    try {
        const payload = {
            events: eventsToSync.map(e => {
                // Función recursiva o json stringify hack para limpiar prefijos (ej. sale_f08..., item_...) a UUID puro
                let payloadStr = JSON.stringify(e.payload);
                payloadStr = payloadStr.replace(/"[a-z]+_([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"/g, '"$1"');
                const cleanPayload = JSON.parse(payloadStr);

                let rawEntityId = String((cleanPayload as any).id || (cleanPayload as any).itemId || (cleanPayload as any).saleId || e.uuid);
                const entityId = rawEntityId.replace(/^[a-z]+_/, '');

                return {
                    event_id: e.uuid || '00000000-0000-0000-0000-' + String(e.event_id).padStart(12, '0'), 
                    // Derive tenant from the event itself, or from the authenticated user's storeId
                    tenant_id: e.tenant_id && e.tenant_id.includes('-') && e.tenant_id.length > 25
                        ? e.tenant_id
                        : (() => {
                            try { return JSON.parse(localStorage.getItem('pos_user') || '{}').storeId || e.tenant_id; }
                            catch { return e.tenant_id; }
                          })(),
                    entity_type: e.entity_type,
                    action: e.action,
                    entity_id: entityId, 
                    occurred_at: new Date(e.occurred_at).toISOString(),
                    payload: cleanPayload,
                };
            })
        };

        const res = await fetch(`${apiUrl}/sync/events`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok && res.status !== 207) {
            const errorText = await res.text().catch(() => 'No response body');
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const data = await res.json();

        for (const result of data.results) {
            // Find corresponding local event
            const localEvent = eventsToSync.find(e => 
                (e.uuid === result.event_id) || 
                ('00000000-0000-0000-0000-' + String(e.event_id).padStart(12, '0') === result.event_id)
            );

            if (!localEvent) continue;

            if (result.status === 'ok' || result.status === 'skipped') {
                await db.sync_queue.update(localEvent.event_id!, {
                    sync_status: SyncStatus.SYNCED,
                });
                synced++;
            } else if (result.status === 'failed') {
                const retryCount = (localEvent.retry_count || 0) + 1;
                const newStatus = retryCount >= MAX_RETRIES ? SyncStatus.FAILED : SyncStatus.PENDING;

                await db.sync_queue.update(localEvent.event_id!, {
                    sync_status: newStatus,
                    retry_count: retryCount,
                    error_log: result.error || 'Unknown error',
                });

                console.error(
                    `[Outbox Sync Error] Event #${localEvent.event_id} (${localEvent.entity_type}:${localEvent.action}):`,
                    result.error
                );

                if (newStatus === SyncStatus.FAILED) {
                    toast.error(
                        `Sincronización fallida tras ${MAX_RETRIES} intentos: ${localEvent.entity_type}:${localEvent.action}`,
                        { duration: 6000 }
                    );
                }
            }
        }
    } catch (err: any) {
        console.error(`[Outbox Sync Network Error]:`, err.message);
        
        // Revert all IN_FLIGHT events back to their original flow, incrementing retry if it failed at network level
        for (const e of eventsToSync) {
            const retryCount = (e.retry_count || 0) + 1;
            const newStatus = retryCount >= MAX_RETRIES ? SyncStatus.FAILED : SyncStatus.PENDING;
            
            await db.sync_queue.update(e.event_id!, {
                sync_status: newStatus,
                retry_count: retryCount,
                error_log: err.message,
            });
        }
    }

    return synced;
}

export const useSync = () => {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Initial drain on mount
        drainOutbox().catch(console.error);

        // Start periodic drain
        intervalRef.current = setInterval(() => {
            drainOutbox().catch(console.error);
        }, DRAIN_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);
};
