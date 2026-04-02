/**
 * CartProvider.tsx
 *
 * Global cart state for the POS terminal.
 *
 * Tax Logic:
 * - taxRate is fetched from the NestJS /settings endpoint via useSettings().
 * - Applies a flat IVA rate additively on the subtotal after discounts.
 * - Falls back to 16% when the API is unreachable (offline-safe).
 *
 * Multi-Terminal:
 * - At checkout, the current terminalId (from localStorage via useTerminal())
 *   is stamped onto every Sale document before writing it to Dexie.
 *   This allows Reporte Z to filter and reconcile per-register.
 */
import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { ItemDocType } from '../db/schemas/item.schema';
import { SaleDocType, SaleItemDocType } from '../db/schemas/sale.schema';
import { PaymentData } from '../components/CheckoutModal';
import { enqueueSyncEventBatch, generateId } from '../db/enqueueSyncEvent';
import { SyncEntityType, SyncAction } from '../db/outbox.types';
import type { EnqueueOptions } from '../db/enqueueSyncEvent';
import { useSettingsContext as useSettings } from '../contexts/SettingsProvider';
import { useTerminal } from '../hooks/useTerminal';
import { useAuth } from '../contexts/AuthProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CartItem = {
    product: ItemDocType;
    quantity: number;
    discount: number; // percentage 0–100
};

export type CartTotals = {
    subtotal: number;    // sum of (price * qty * (1 - discount/100))
    taxAmount: number;   // subtotal * taxPercent / 100
    total: number;       // subtotal + taxAmount
    taxPercent: number;
    itemCount: number;
};

type CartState = {
    items: CartItem[];
};

type CartAction =
    | { type: 'ADD'; product: ItemDocType }
    | { type: 'REMOVE'; productId: string }
    | { type: 'SET_QTY'; productId: string; quantity: number }
    | { type: 'SET_DISCOUNT'; productId: string; discount: number }
    | { type: 'CLEAR' };

type CartContextValue = {
    cartItems: CartItem[];
    totals: CartTotals;
    taxRate: number;
    exchangeRate: number;
    terminalId: string;
    addToCart: (product: ItemDocType) => void;
    removeFromCart: (productId: string) => void;
    setQuantity: (productId: string, qty: number) => void;
    setDiscount: (productId: string, discount: number) => void;
    clearCart: () => void;
    checkout: (employeeId: string, paymentData: PaymentData) => Promise<SaleDocType>;
    refetchSettings: () => void;
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

const cartReducer = (state: CartState, action: CartAction): CartState => {
    switch (action.type) {
        case 'ADD': {
            const existing = state.items.find(i => i.product.id === action.product.id);
            if (existing) {
                return {
                    items: state.items.map(i =>
                        i.product.id === action.product.id
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    ),
                };
            }
            return { items: [...state.items, { product: action.product, quantity: 1, discount: 0 }] };
        }
        case 'REMOVE':
            return { items: state.items.filter(i => i.product.id !== action.productId) };

        case 'SET_QTY':
            if (action.quantity <= 0) {
                return { items: state.items.filter(i => i.product.id !== action.productId) };
            }
            return {
                items: state.items.map(i =>
                    i.product.id === action.productId ? { ...i, quantity: action.quantity } : i
                ),
            };

        case 'SET_DISCOUNT':
            return {
                items: state.items.map(i =>
                    i.product.id === action.productId
                        ? { ...i, discount: Math.min(100, Math.max(0, action.discount)) }
                        : i
                ),
            };

        case 'CLEAR':
            return { items: [] };

        default:
            return state;
    }
};

// ─── Totals Calculator ────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

const computeTotals = (items: CartItem[], taxPercent: number): CartTotals => {
    const subtotal = items.reduce((acc, item) => {
        const linePrice = item.product.unitPrice * item.quantity * (1 - item.discount / 100);
        return acc + linePrice;
    }, 0);

    const taxAmount = subtotal * (taxPercent / 100);
    const total = subtotal + taxAmount;
    const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

    return {
        subtotal: round2(subtotal),
        taxAmount: round2(taxAmount),
        total: round2(total),
        taxPercent,
        itemCount,
    };
};

// ─── Context & Provider ───────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(cartReducer, { items: [] });

    // ── Dynamic tax rate from API (falls back to 16 offline) ────────────────
    const { taxRate, exchangeRate, refetch } = useSettings();

    // ── Terminal identifier from localStorage ────────────────────────────────
    const { getTerminalId } = useTerminal();

    // ── Tenant ID from JWT ──────────────────────────────────────────────────
    const { user } = useAuth();
    const tenantId = user?.storeId || 'default-store';

    const totals = useMemo(
        () => computeTotals(state.items, taxRate),
        [state.items, taxRate]
    );

    const addToCart = useCallback((product: ItemDocType) => {
        dispatch({ type: 'ADD', product });
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        dispatch({ type: 'REMOVE', productId });
    }, []);

    const setQuantity = useCallback((productId: string, quantity: number) => {
        dispatch({ type: 'SET_QTY', productId, quantity });
    }, []);

    const setDiscount = useCallback((productId: string, discount: number) => {
        dispatch({ type: 'SET_DISCOUNT', productId, discount });
    }, []);

    const clearCart = useCallback(() => {
        dispatch({ type: 'CLEAR' });
    }, []);

    /**
     * checkout() — Builds the Sale document and inserts it atomically.
     *
     * Uses enqueueSyncEventBatch to execute ALL operations in a single
     * Dexie transaction:
     *   1. SALE:CREATE — writes to local `sales` table + outbox
     *   2. N x ITEM:ADJUST_STOCK — decrements stock for each sold item
     *     in local `items` table + outbox (delta-based, not absolute)
     *
     * If ANY operation fails, the ENTIRE transaction rolls back.
     */
    const checkout = useCallback(async (employeeId: string, paymentData: PaymentData): Promise<SaleDocType> => {
        const now = Date.now();
        const saleId = `sale_${generateId()}`;
        const terminalId = getTerminalId();

        const saleItems: SaleItemDocType[] = state.items.map((ci, index) => ({
            id: `${saleId}_${index + 1}`,
            line: index + 1,
            description: ci.product.name,
            quantityPurchased: ci.quantity,
            itemCostPrice: ci.product.costPrice,
            itemUnitPrice: ci.product.unitPrice,
            discountPercent: ci.discount,
            itemId: ci.product.id,
        }));

        const saleDoc: SaleDocType = {
            id: saleId,
            storeId: tenantId,
            saleTime: now,
            employeeId,
            terminalId,
            subtotal: totals.subtotal,
            taxPercent: totals.taxPercent,
            taxAmount: totals.taxAmount,
            total: totals.total,
            items: saleItems,
            paymentMethod: paymentData.paymentMethod,
            reference: paymentData.reference,
            amountReceived: paymentData.amountReceived,
            changeAmount: paymentData.changeAmount,
            changeBs: paymentData.changeBs,
            changeMethod: paymentData.changeMethod,
            customerId: paymentData.customerId,
            payments: paymentData.payments,
            status: paymentData.paymentMethod === 'FIADO' ? 'PENDIENTE' : undefined,
            updatedAt: now,
        };

        // ── Build the atomic batch ─────────────────────────────────────────────────
        const batchEvents: EnqueueOptions<any>[] = [];

        // Event 1: SALE:CREATE
        batchEvents.push({
            entity_type: SyncEntityType.SALE,
            action: SyncAction.CREATE,
            payload: {
                id: saleId,
                employeeId,
                terminalId,
                items: saleItems.map(si => ({
                    itemId: si.itemId,
                    quantity: si.quantityPurchased,
                    unitPrice: si.itemUnitPrice,
                    discountPercent: si.discountPercent,
                })),
                subtotal: totals.subtotal,
                taxPercent: totals.taxPercent,
                taxAmount: totals.taxAmount,
                total: totals.total,
                paymentMethod: paymentData.paymentMethod,
                customerId: paymentData.customerId,
                reference: paymentData.reference,
                amountReceived: paymentData.amountReceived,
                changeAmount: paymentData.changeAmount,
                changeBs: paymentData.changeBs,
                changeMethod: paymentData.changeMethod,
                payments: paymentData.payments,
                status: saleDoc.status,
            },
            tenant_id: tenantId,
            localTable: 'sales' as const,
            localRecord: saleDoc,
        });

        // Events 2..N: ITEM:ADJUST_STOCK (one per unique sold item)
        for (const ci of state.items) {
            batchEvents.push({
                entity_type: SyncEntityType.ITEM,
                action: SyncAction.ADJUST_STOCK,
                payload: {
                    id: ci.product.id,
                    name: ci.product.name,
                    category: ci.product.category,
                    costPrice: ci.product.costPrice,
                    unitPrice: ci.product.unitPrice,
                    reorderLevel: ci.product.reorderLevel,
                    receivingQuantity: -ci.quantity, // delta: negative = stock decremented
                },
                tenant_id: tenantId,
                localTable: 'items' as const,
                localRecordKey: ci.product.id,
                localUpdater: (existing: ItemDocType) => ({
                    ...existing,
                    receivingQuantity: Math.max(0, (existing.receivingQuantity || 0) - ci.quantity),
                    updatedAt: now,
                }),
            });
        }

        // ✨ Execute everything in a single atomic Dexie transaction
        await enqueueSyncEventBatch(batchEvents);

        dispatch({ type: 'CLEAR' });
        return saleDoc;
    }, [state.items, totals, getTerminalId, tenantId]);

    return (
        <CartContext.Provider value={{
            cartItems: state.items,
            totals,
            taxRate,
            exchangeRate,
            terminalId: getTerminalId(),
            addToCart,
            removeFromCart,
            setQuantity,
            setDiscount,
            clearCart,
            checkout,
            refetchSettings: refetch,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = (): CartContextValue => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within a CartProvider');
    return ctx;
};
