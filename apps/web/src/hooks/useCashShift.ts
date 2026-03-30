/**
 * useCashShift.ts — Hook for managing the current cash shift.
 *
 * Uses useLiveQuery to reactively track if the current user has an open shift.
 * Provides functions to open/close shifts via the Outbox pattern.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { getOutboxDB } from '../db/outbox';
import { enqueueSyncEvent, generateId } from '../db/enqueueSyncEvent';
import { SyncEntityType, SyncAction } from '../db/outbox.types';
import type { CashShiftDocType } from '../db/schemas/cashshift.schema';
import type { SaleDocType } from '../db/schemas/sale.schema';
import { useAuth } from '../contexts/AuthProvider';
import { useTerminal } from './useTerminal';

export const useCashShift = () => {
    const { user } = useAuth();
    const { getTerminalId } = useTerminal();
    const userId = user?.sub?.toString() || '';
    const tenantId = user?.storeId || 'default-store';
    const terminalId = getTerminalId();

    const db = getOutboxDB();

    // ── Reactive query: find open shift for current user ──────────────
    const openShift = useLiveQuery(
        () => {
            if (!userId) return undefined;
            return db.shifts
                .where('status')
                .equals('OPEN')
                .filter(s => s.userId === userId)
                .first();
        },
        [userId],
    ) as CashShiftDocType | undefined;

    const isLoading = openShift === undefined && userId !== '';
    const hasOpenShift = !!openShift;

    // ── Open Shift ───────────────────────────────────────────────────
    const openShiftFn = async (startingCash: number) => {
        const id = generateId();
        const now = Date.now();

        await enqueueSyncEvent({
            entity_type: SyncEntityType.SHIFT,
            action: SyncAction.OPEN,
            payload: {
                id,
                user_id: userId,
                terminal_id: terminalId,
                opened_at: now,
                starting_cash: startingCash,
            },
            tenant_id: tenantId,
            localTable: 'shifts',
            localRecord: {
                id,
                storeId: tenantId,
                userId,
                terminalId,
                openedAt: now,
                startingCash,
                expectedCash: startingCash,
                status: 'OPEN' as const,
                updatedAt: now,
            },
        });

        return id;
    };

    // ── Close Shift ──────────────────────────────────────────────────
    const closeShiftFn = async (actualCash: number) => {
        if (!openShift) throw new Error('No hay turno abierto');

        // Calculate expected cash: starting + cash sales during shift period
        const shiftSales = await db.sales
            .where('saleTime')
            .aboveOrEqual(openShift.openedAt)
            .toArray() as SaleDocType[];

        // Calculate sales by payment method
        const salesSummary: Record<string, number> = {};
        let cashSalesTotal = 0;

        shiftSales.forEach(sale => {
            const method = sale.paymentMethod || 'OTRO';
            salesSummary[method] = (salesSummary[method] || 0) + sale.total;
            if (method === 'DIVISA' || method === 'EFECTIVO_BS') {
                cashSalesTotal += sale.total;
            }
        });

        const expectedCash = openShift.startingCash + cashSalesTotal;
        const difference = actualCash - expectedCash;

        await enqueueSyncEvent({
            entity_type: SyncEntityType.SHIFT,
            action: SyncAction.CLOSE,
            payload: {
                shift_id: openShift.id,
                actual_cash: actualCash,
                expected_cash: expectedCash,
                sales_summary: salesSummary,
            },
            tenant_id: tenantId,
            localTable: 'shifts',
            localRecordKey: openShift.id,
            localUpdater: (existing: CashShiftDocType) => ({
                ...existing,
                closedAt: Date.now(),
                actualCash,
                expectedCash,
                difference,
                status: 'CLOSED' as const,
                salesSummary: salesSummary,
                updatedAt: Date.now(),
            }),
        });

        return { expectedCash, actualCash, difference, salesSummary };
    };

    // ── Sales query for open shift summary ────────────────────────────
    const shiftSales = useLiveQuery(
        () => {
            if (!openShift) return [];
            return db.sales
                .where('saleTime')
                .aboveOrEqual(openShift.openedAt)
                .toArray();
        },
        [openShift?.id, openShift?.openedAt],
    ) as SaleDocType[] | undefined;

    // Derive summary from live query
    const summary = (() => {
        if (!shiftSales || !openShift) return null;
        const salesByMethod: Record<string, number> = {};
        let totalSales = 0;
        let cashTotal = 0;

        shiftSales.forEach(sale => {
            const method = sale.paymentMethod || 'OTRO';
            salesByMethod[method] = (salesByMethod[method] || 0) + sale.total;
            totalSales += sale.total;
            if (method === 'DIVISA' || method === 'EFECTIVO_BS') {
                cashTotal += sale.total;
            }
        });

        return {
            saleCount: shiftSales.length,
            totalSales,
            cashTotal,
            expectedCash: openShift.startingCash + cashTotal,
            salesByMethod,
        };
    })();

    return {
        hasOpenShift,
        isLoading,
        summary,
        openNewShift: openShiftFn,
        closeShift: closeShiftFn,
        currentShift: openShift as CashShiftDocType | undefined,
    };
};
