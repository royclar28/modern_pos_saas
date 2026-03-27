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
    let apiUrl = (import.meta as any).env?.VITE_API_URL || `http://${window.location.hostname}:3333/api`;
    if (window.location.hostname !== 'localhost' && apiUrl.includes('localhost')) {
        apiUrl = apiUrl.replace('localhost', window.location.hostname);
    }
    return apiUrl;
};

const getAuthHeaders = () => {
    const token = localStorage.getItem('pos_token');
    return {
        'Content-Type': 'application/json',
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
        .limit(50)
        .toArray();

    if (pending.length === 0) return 0;

    const apiUrl = getApiUrl();
    let synced = 0;

    for (const event of pending) {
        // Mark as IN_FLIGHT
        await db.sync_queue.update(event.event_id!, {
            sync_status: SyncStatus.IN_FLIGHT,
        });

        try {
            const res = await fetch(`${apiUrl}/sync/push`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    entity_type: event.entity_type,
                    action: event.action,
                    payload: event.payload,
                    tenant_id: event.tenant_id,
                    occurred_at: event.occurred_at,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text().catch(() => 'No response body');
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            // Success — mark as SYNCED
            await db.sync_queue.update(event.event_id!, {
                sync_status: SyncStatus.SYNCED,
            });
            synced++;
        } catch (err: any) {
            const retryCount = (event.retry_count || 0) + 1;
            const newStatus = retryCount >= MAX_RETRIES ? SyncStatus.FAILED : SyncStatus.PENDING;

            await db.sync_queue.update(event.event_id!, {
                sync_status: newStatus,
                retry_count: retryCount,
                error_log: err.message || 'Unknown error',
            });

            console.error(
                `[Outbox Sync Error] Event #${event.event_id} (${event.entity_type}:${event.action}) — attempt ${retryCount}/${MAX_RETRIES}:`,
                err.message,
            );

            if (newStatus === SyncStatus.FAILED) {
                toast.error(
                    `Sincronización fallida tras ${MAX_RETRIES} intentos: ${event.entity_type}:${event.action}`,
                    { duration: 6000 },
                );
            }
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
