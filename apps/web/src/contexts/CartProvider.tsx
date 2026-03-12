/**
 * CartProvider.tsx
 *
 * Global cart state for the POS terminal.
 *
 * Tax Logic (from legacy Sale_lib.php analysis):
 * - Original system applies taxes PER-ITEM using a per-item `Item_taxes` table
 *   with support for multiple named rates (e.g., "16% IVA", "8% Special").
 * - Two modes existed: additive (tax on top of price) and inclusive (tax baked in).
 *
 * Simplification applied:
 * - We apply a flat TAX_RATE (16% IVA) additively on the subtotal after discounts.
 * - TODO: Replace TAX_RATE with a per-item tax lookup from the `Item` document
 *   once the `taxPercent` field is added to item.schema.ts and synced from backend.
 */
import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { ItemDocType } from '../db/schemas/item.schema';
import { SaleDocType, SaleItemDocType } from '../db/schemas/sale.schema';
import { getDatabase } from '../db/database';

// ─── Config ──────────────────────────────────────────────────────────────────

/** TODO: Replace with per-item tax lookup from item.schema once available */
const DEFAULT_TAX_PERCENT = 16;

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
    addToCart: (product: ItemDocType) => void;
    removeFromCart: (productId: string) => void;
    setQuantity: (productId: string, qty: number) => void;
    setDiscount: (productId: string, discount: number) => void;
    clearCart: () => void;
    checkout: (employeeId: string) => Promise<SaleDocType>;
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

const computeTotals = (items: CartItem[]): CartTotals => {
    const subtotal = items.reduce((acc, item) => {
        const linePrice = item.product.unitPrice * item.quantity * (1 - item.discount / 100);
        return acc + linePrice;
    }, 0);

    const taxAmount = subtotal * (DEFAULT_TAX_PERCENT / 100);
    const total = subtotal + taxAmount;
    const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

    return {
        subtotal: round2(subtotal),
        taxAmount: round2(taxAmount),
        total: round2(total),
        taxPercent: DEFAULT_TAX_PERCENT,
        itemCount,
    };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── Context & Provider ───────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(cartReducer, { items: [] });

    const totals = useMemo(() => computeTotals(state.items), [state.items]);

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
     * checkout() — Builds the Sale document and inserts it into RxDB.
     * No API call needed: RxDB replication will upload it automatically.
     */
    const checkout = useCallback(async (employeeId: string): Promise<SaleDocType> => {
        const db = await getDatabase();
        const now = Date.now();
        const saleId = `sale_${now}_${Math.random().toString(36).slice(2, 7)}`;

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
            saleTime: now,
            employeeId,
            subtotal: totals.subtotal,
            taxPercent: totals.taxPercent,
            taxAmount: totals.taxAmount,
            total: totals.total,
            items: saleItems,
            updatedAt: now,
        };

        // ✅ Insert offline — RxDB replication will sync to the server automatically
        await db.sales.insert(saleDoc);

        dispatch({ type: 'CLEAR' });
        return saleDoc;
    }, [state.items, totals]);

    return (
        <CartContext.Provider value={{
            cartItems: state.items,
            totals,
            addToCart,
            removeFromCart,
            setQuantity,
            setDiscount,
            clearCart,
            checkout,
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
