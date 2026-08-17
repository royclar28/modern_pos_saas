import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useItems } from '../../hooks/useItems';
import { useInitialSync } from '../../hooks/useInitialSync';
import { getOutboxDB } from '../../db/outbox';
import { enqueueSyncEvent, generateId } from '../../db/enqueueSyncEvent';
import { SyncEntityType, SyncAction } from '../../db/outbox.types';
import { ItemDocType } from '../../db/schemas/item.schema';
import { useAuth } from '../../contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { InvoiceScannerModal, ScannedProduct } from '../../components/InvoiceScannerModal';
import { AppHeader } from '../../components/AppHeader';
import { api } from '../../lib/api';

// ─── Zod Schema for Validation ──────────────────────────────────────────────
const parseNumberVal = (val: unknown) => {
    if (typeof val === 'string') {
        const str = val.replace(',', '.');
        if (str.trim() === '') return 0;
        return parseFloat(str);
    }
    return Number(val) || 0;
};

const itemSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "El nombre es obligatorio"),
    category_id: z.string().min(1, "La categoría es obligatoria"),
    brand_id: z.string().optional(),
    itemNumber: z.string().optional(),
    description: z.string().optional(),
    costPrice: z.preprocess(parseNumberVal, z.number({ invalid_type_error: "Costo inválido" }).min(0, "Debe ser mayor o igual a 0")),
    unitPrice: z.preprocess(parseNumberVal, z.number({ invalid_type_error: "Precio inválido" }).min(0, "Debe ser mayor o igual a 0")),
    reorderLevel: z.preprocess(parseNumberVal, z.number({ invalid_type_error: "Nivel de alerta inválido" }).min(0, "Debe ser mayor o igual a 0")),
    receivingQuantity: z.preprocess(parseNumberVal, z.number({ invalid_type_error: "Cantidad inválida" }).min(0, "Debe ser mayor o igual a 0")),
    sellBy: z.enum(['unit', 'weight']),    // ← NUEVO
    unitLabel: z.string().max(5, "Máximo 5 caracteres").optional(),
}).refine((data) => data.unitPrice >= data.costPrice, {
    message: "El precio de venta debe ser mayor o igual al costo",
    path: ["unitPrice"],
});

type ItemFormData = z.infer<typeof itemSchema>;

// ScannedProduct is imported from InvoiceScannerModal
// ─── Lightweight inline toast (zero deps) ─────────────────────────────────────
const toast = {
    _show(msg: string, bg: string) {
        const el = document.createElement('div');
        el.textContent = msg;
        Object.assign(el.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
            padding: '12px 20px', borderRadius: '12px', color: '#fff',
            background: bg, fontWeight: '700', fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,.15)', opacity: '0',
            transition: 'opacity .2s', fontFamily: 'system-ui, sans-serif',
        });
        document.body.appendChild(el);
        requestAnimationFrame(() => (el.style.opacity = '1'));
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
    },
    success(msg: string) { this._show('✅ ' + msg, '#16a34a'); },
    error(msg: string) { this._show('❌ ' + msg, '#dc2626'); },
};

// ─── Item Modal Form Component ────────────────────────────────────────────────
const ItemModal = ({
    item,
    categories,
    brands,
    onClose,
    onSave
}: {
    item?: ItemDocType | null;
    categories: any[];
    brands: any[];
    onClose: () => void;
    onSave: (data: ItemFormData) => Promise<void>;
}) => {
    const isEdit = !!item;
    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: item ? {
            id: item.id,
            name: item.name,
            category_id: item.category_id || '',
            brand_id: item.brand_id || '',
            itemNumber: item.itemNumber || '',
            description: item.description || '',
            costPrice: item.costPrice,
            unitPrice: item.unitPrice,
            reorderLevel: item.reorderLevel,
            receivingQuantity: item.receivingQuantity,
            sellBy: item.sellBy || 'unit',     // ← NUEVO
            unitLabel: item?.unitLabel || 'und',
        } : {
            costPrice: 0,
            unitPrice: 0,
            reorderLevel: 0,
            receivingQuantity: 1,
            sellBy: 'unit' as const,           // ← NUEVO
            unitLabel: 'und',
        }
    });
    const watchSellBy = watch('sellBy');        // ← NUEVO

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">
                        {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="item-form" onSubmit={handleSubmit(onSave as any)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nombre *</label>
                                <input {...register('name')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Categoría *</label>
                                <select {...register('category_id')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white">
                                    <option value="">Seleccione una categoría</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {errors.category_id && <p className="text-xs text-red-500">{errors.category_id.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Marca</label>
                                <select {...register('brand_id')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white">
                                    <option value="">Sin marca</option>
                                    {brands.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU / ID Producto</label>
                                <input {...register('itemNumber')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Mín. (Alerta)</label>
                                <input type="text" placeholder="0.00" {...register('reorderLevel', { onChange: e => e.target.value = e.target.value.replace(',', '.') })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                {errors.reorderLevel && <p className="text-xs text-red-500">{errors.reorderLevel.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Stock Inicial (Cantidad)
                                </label>
                                <input
                                    type="text"
                                    placeholder="0.00"
                                    {...register('receivingQuantity', { onChange: e => e.target.value = e.target.value.replace(',', '.') })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none"
                                />
                                {errors.receivingQuantity && <p className="text-xs text-red-500">{errors.receivingQuantity.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Costo *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input type="text" placeholder="0.00" {...register('costPrice', { onChange: e => e.target.value = e.target.value.replace(',', '.') })} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                </div>
                                {errors.costPrice && <p className="text-xs text-red-500">{errors.costPrice.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Precio Venta *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input type="text" placeholder="0.00" {...register('unitPrice', { onChange: e => e.target.value = e.target.value.replace(',', '.') })} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                </div>
                                {errors.unitPrice && <p className="text-xs text-red-500">{errors.unitPrice.message}</p>}
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Descripción</label>
                                <textarea {...register('description')} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none"></textarea>
                            </div>

                            {/* ── Sell By Selector ── */}
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Tipo de Venta
                                </label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="unit"
                                            {...register('sellBy')}
                                            className="accent-violet-600 w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-slate-700">
                                            📦 Por Unidad
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="weight"
                                            {...register('sellBy')}
                                            className="accent-violet-600 w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-slate-700">
                                            ⚖️ Por Peso / Granel
                                        </span>
                                    </label>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    {watchSellBy === 'weight'
                                        ? 'Al vender se pedirá el peso exacto (Kg/g).'
                                        : 'Se vende por pieza/unidad entera.'}
                                </p>
                            </div>
                            {/* ── Unit Label ── */}
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Etiqueta de Unidad
                                </label>
                                <input
                                    {...register('unitLabel')}
                                    maxLength={5}
                                    placeholder="und"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none"
                                />
                                <p className="text-[10px] text-slate-400">
                                    Ej: Kg, Mts, und, Lts — se muestra junto a la cantidad en el POS.
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="item-form"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Invoice Scanner Review Modal ─────────────────────────────────────────────
const InvoiceReviewModal = ({
    products,
    onClose,
    onSaveAll,
    isSaving,
}: {
    products: ScannedProduct[];
    onClose: () => void;
    onSaveAll: (products: ScannedProduct[]) => Promise<void>;
    isSaving: boolean;
}) => {
    const [editableProducts, setEditableProducts] = useState<ScannedProduct[]>(
        () => products.map(p => ({ ...p }))
    );

    const updateProduct = (index: number, field: keyof ScannedProduct, value: string | number) => {
        setEditableProducts(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeProduct = (index: number) => {
        setEditableProducts(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📄</span>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Revisión de Factura</h2>
                            <p className="text-xs text-slate-500 font-medium">
                                IA detectó {products.length} productos. Verifica y edita antes de guardar.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none p-1">&times;</button>
                </div>

                {/* Editable table */}
                <div className="flex-1 overflow-auto p-4">
                    {editableProducts.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <span className="text-4xl block mb-2">🗑️</span>
                            Has eliminado todos los productos. Cierra este modal.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-3 py-3">Producto</th>
                                    <th className="px-3 py-3">SKU</th>
                                    <th className="px-3 py-3">Categoría</th>
                                    <th className="px-3 py-3 text-right">Costo $</th>
                                    <th className="px-3 py-3 text-right">Precio Venta $</th>
                                    <th className="px-3 py-3 text-center">Cantidad</th>
                                    <th className="px-3 py-3 text-center w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {editableProducts.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors group">
                                        <td className="px-3 py-2">
                                            <input
                                                value={p.name}
                                                onChange={e => updateProduct(idx, 'name', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-transparent focus:bg-white"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                value={p.sku}
                                                onChange={e => updateProduct(idx, 'sku', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-transparent focus:bg-white"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                value={p.category}
                                                onChange={e => updateProduct(idx, 'category', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-transparent focus:bg-white"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={p.costPrice}
                                                onChange={e => updateProduct(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-transparent focus:bg-white"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={p.unitPrice}
                                                onChange={e => updateProduct(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-transparent focus:bg-white"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="number"
                                                min="1"
                                                value={p.quantity}
                                                onChange={e => updateProduct(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-20 mx-auto px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center font-bold focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-transparent focus:bg-white"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => removeProduct(idx)}
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                                                title="Quitar de la lista"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Info callout */}
                <div className="mx-4 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium flex items-start gap-2">
                    <span className="text-base leading-none">💡</span>
                    <div>
                        <strong>Lógica Upsert:</strong> Si un producto ya existe en el catálogo (mismo SKU), se <strong>sumará</strong> la cantidad
                        al stock actual y se actualizará el costo si cambió. Si no existe, se creará como producto nuevo.
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <span className="text-xs text-slate-400 font-medium">
                        {editableProducts.length} producto{editableProducts.length !== 1 ? 's' : ''} listos para cargar
                    </span>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={() => onSaveAll(editableProducts)}
                            disabled={isSaving || editableProducts.length === 0}
                            className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <><span className="animate-spin">⟳</span> Procesando Upsert...</>
                            ) : (
                                '💾 Guardar Todos'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── UPSERT Logic ─────────────────────────────────────────────────────────────
/**
 * For each scanned product:
 *   1. Search db.items by SKU (itemNumber). If no SKU, search by name.
 *   2. If FOUND (Update): patch() the document:
 *        - receivingQuantity = existing.receivingQuantity + scanned.quantity
 *        - Update costPrice if it changed
 *        - Update unitPrice if it changed
 *   3. If NOT FOUND (Insert): insert() a new document with scanned.quantity as receivingQuantity
 */
async function upsertScannedProducts(products: ScannedProduct[], tenantId: string): Promise<{ updated: number; inserted: number }> {
    const db = getOutboxDB();
    let updated = 0;
    let inserted = 0;

    for (const product of products) {
        let existing: ItemDocType | undefined = undefined;

        // 1. Try to find by SKU first
        if (product.sku) {
            existing = await db.items.where('itemNumber').equals(product.sku).first();
        }

        // 2. If not found by SKU, try by name (case-insensitive)
        if (!existing) {
            const allItems = await db.items.toArray();
            existing = allItems.find(
                (item) => item.name.toLowerCase().trim() === product.name.toLowerCase().trim()
            );
        }

        if (existing) {
            // ── UPDATE: sum stock and update prices ────────────────────────
            const updatedItem: ItemDocType = {
                ...existing,
                receivingQuantity: (existing.receivingQuantity || 0) + product.quantity,
                stock: (existing.receivingQuantity || 0) + product.quantity,
                costPrice: product.costPrice,
                unitPrice: product.unitPrice > existing.unitPrice
                    ? product.unitPrice
                    : existing.unitPrice,
                updatedAt: Date.now(),
            };
            await enqueueSyncEvent({
                entity_type: SyncEntityType.ITEM,
                action: SyncAction.UPDATE,
                payload: {
                    id: existing.id,
                    name: updatedItem.name,
                    category_id: updatedItem.category_id,
                    brand_id: updatedItem.brand_id,
                    itemNumber: updatedItem.itemNumber,
                    costPrice: updatedItem.costPrice,
                    unitPrice: updatedItem.unitPrice,
                    reorderLevel: updatedItem.reorderLevel,
                    receivingQuantity: updatedItem.receivingQuantity,
                    sellBy: existing.sellBy,
                },
                tenant_id: tenantId,
                localTable: 'items',
                localRecord: updatedItem,
            });
            updated++;
        } else {
            // ── INSERT: create new product ─────────────────────────────────
            const id = generateId();
            const now = Date.now();
            const newItem: ItemDocType = {
                id,
                storeId: tenantId,
                name: product.name,
                category_id: undefined,
                brand_id: undefined,
                itemNumber: product.sku || '',
                description: '',
                costPrice: product.costPrice,
                unitPrice: product.unitPrice,
                stock: product.quantity,
                reorderLevel: 0,
                receivingQuantity: product.quantity,
                allowAltDescription: false,
                isSerialized: false,
                sellBy: 'unit',
                updatedAt: now,
            };
            await enqueueSyncEvent({
                entity_type: SyncEntityType.ITEM,
                action: SyncAction.CREATE,
                payload: {
                    id,
                    name: newItem.name,
                    category_id: newItem.category_id,
                    brand_id: newItem.brand_id,
                    itemNumber: newItem.itemNumber,
                    costPrice: newItem.costPrice,
                    unitPrice: newItem.unitPrice,
                    reorderLevel: newItem.reorderLevel,
                    receivingQuantity: newItem.receivingQuantity,
                    sellBy: 'unit',
                },
                tenant_id: tenantId,
                localTable: 'items',
                localRecord: newItem,
            });
            inserted++;
        }
    }

    return { updated, inserted };
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────
export const InventoryPage = () => {
    const { items, isLoading } = useItems();
    const { hydrateLocalDB, isHydrating } = useInitialSync();
    const { user } = useAuth();
    const tenantId = user?.storeId || 'default-store';

    const [search, setSearch] = useState('');
    const [modalItem, setModalItem] = useState<ItemDocType | null | 'NEW'>(null);

    // Scanner state
    const [scannedProducts, setScannedProducts] = useState<ScannedProduct[] | null>(null);
    const [isSavingUpsert, setIsSavingUpsert] = useState(false);

    // Fetch categories and brands
    const [categories, setCategories] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [catRes, brandRes] = await Promise.all([
                    api.get('/categories'), // getCategories now returns Category model rows (id, name, sort_order)
                    api.get('/brands')
                ]);
                setCategories(catRes?.data || catRes || []);
                setBrands(brandRes?.data || brandRes || []);
            } catch (error) {
                console.error('Error fetching master data:', error);
            }
        };
        fetchMasterData();
    }, []);

    const getCategoryName = (id: string | undefined) => {
        if (!id) return 'Sin Categoría';
        const c = categories.find(c => c.id == id);
        return c ? c.name : 'Desconocida';
    };

    const getBrandName = (id: string | undefined) => {
        if (!id) return '';
        const b = brands.find(b => b.id == id);
        return b ? b.name : '';
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return items;
        return items.filter(
            i => i.name.toLowerCase().includes(q) ||
                getCategoryName(i.category_id).toLowerCase().includes(q) ||
                (i.itemNumber && i.itemNumber.toLowerCase().includes(q))
        );
    }, [items, search, categories]);

    const handleSave = async (data: ItemFormData) => {
        try {
            if (modalItem === 'NEW') {
                const id = generateId();
                const now = Date.now();
                const newItem: ItemDocType = {
                    id,
                    storeId: tenantId,
                    name: data.name,
                    category_id: data.category_id,
                    brand_id: data.brand_id,
                    itemNumber: data.itemNumber,
                    description: data.description,
                    costPrice: data.costPrice,
                    unitPrice: data.unitPrice,
                    stock: data.receivingQuantity ?? 1,
                    reorderLevel: data.reorderLevel ?? 0,
                    receivingQuantity: data.receivingQuantity ?? 1,
                    allowAltDescription: false,
                    isSerialized: false,
                    sellBy: data.sellBy,        // ← NUEVO
                    unitLabel: data.unitLabel || 'und',
                    updatedAt: now,
                };
                await enqueueSyncEvent({
                    entity_type: SyncEntityType.ITEM,
                    action: SyncAction.CREATE,
                    payload: {
                        id,
                        name: newItem.name,
                        category_id: newItem.category_id,
                        brand_id: newItem.brand_id,
                        itemNumber: newItem.itemNumber,
                        costPrice: newItem.costPrice,
                        unitPrice: newItem.unitPrice,
                        reorderLevel: newItem.reorderLevel,
                        receivingQuantity: newItem.receivingQuantity,
                        sellBy: data.sellBy,    // ← NUEVO
                        unitLabel: data.unitLabel || 'und',
                    },
                    tenant_id: tenantId,
                    localTable: 'items',
                    localRecord: newItem,
                });
            } else if (modalItem && typeof modalItem !== 'string') {
                const now = Date.now();
                const updatedItem: ItemDocType = {
                    ...modalItem,
                    name: data.name,
                    category_id: data.category_id,
                    brand_id: data.brand_id,
                    itemNumber: data.itemNumber,
                    description: data.description,
                    costPrice: data.costPrice,
                    unitPrice: data.unitPrice,
                    reorderLevel: data.reorderLevel ?? 0,
                    receivingQuantity: data.receivingQuantity ?? 1,
                    stock: data.receivingQuantity ?? 1, // Sincroniza localmente
                    sellBy: data.sellBy,        // ← NUEVO
                    unitLabel: data.unitLabel || 'und',
                    updatedAt: now,
                };
                await enqueueSyncEvent({
                    entity_type: SyncEntityType.ITEM,
                    action: SyncAction.UPDATE,
                    payload: {
                        id: modalItem.id,
                        name: updatedItem.name,
                        category_id: updatedItem.category_id,
                        brand_id: updatedItem.brand_id,
                        itemNumber: updatedItem.itemNumber,
                        costPrice: updatedItem.costPrice,
                        unitPrice: updatedItem.unitPrice,
                        reorderLevel: updatedItem.reorderLevel,
                        receivingQuantity: updatedItem.receivingQuantity,
                        sellBy: data.sellBy,    // ← NUEVO
                        unitLabel: data.unitLabel || 'und',
                    },
                    tenant_id: tenantId,
                    localTable: 'items',
                    localRecord: updatedItem,
                });
            }
            setModalItem(null);
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Error al guardar el producto');
        }
    };

    const handleDelete = async (item: ItemDocType) => {
        if (!window.confirm(`¿Estás seguro de eliminar "${item.name}"?`)) return;
        try {
            await enqueueSyncEvent({
                entity_type: SyncEntityType.ITEM,
                action: SyncAction.DELETE,
                payload: {
                    id: item.id,
                    name: item.name,
                    category_id: item.category_id,
                    brand_id: item.brand_id,
                    costPrice: item.costPrice,
                    unitPrice: item.unitPrice,
                    reorderLevel: item.reorderLevel,
                    receivingQuantity: item.receivingQuantity,
                },
                tenant_id: tenantId,
                localTable: 'items',
                localRecordKey: item.id,
            });
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error al eliminar');
        }
    };

    // ── Invoice scanner handlers ──────────────────────────────────
    const handleUpsertAll = async (products: ScannedProduct[]) => {
        setIsSavingUpsert(true);
        try {
            const result = await upsertScannedProducts(products, tenantId);
            toast.success(`Carga exitosa: ${result.inserted} nuevos, ${result.updated} actualizados`);
            setScannedProducts(null);
        } catch (err) {
            console.error('Upsert failed:', err);
            toast.error('Error al guardar productos. Intente de nuevo.');
        } finally {
            setIsSavingUpsert(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* ── Navbar Admin ── */}
            <AppHeader
                icon="📦"
                title="Gestión de Inventario"
                links={[{ to: '/', label: '← Dashboard' }, { to: '/pos', label: 'IR AL POS →' }]}
            />

            {/* ── Main Dashboard Area ── */}
            <main className="flex-1 overflow-auto p-8">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="relative w-full sm:w-96">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por SKU, nombre, categoría..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={hydrateLocalDB}
                                disabled={isHydrating}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                                    isHydrating 
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-violet-400 hover:text-violet-600 shadow-sm'
                                } flex items-center gap-2`}
                            >
                                <span className={isHydrating ? "animate-spin" : ""}>🔄</span>
                                {isHydrating ? 'Sincronizando...' : 'Forzar Sincronización'}
                            </button>
                            {/* Share Catalog Button */}
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/c/${tenantId}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success('¡Enlace del catálogo copiado al portapapeles!');
                                }}
                                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100 shadow-sm flex items-center gap-2 whitespace-nowrap"
                            >
                                🔗 Catálogo Público
                            </button>
                            {/* Scanner Button */}
                            <InvoiceScannerModal 
                                onScanSuccess={(products) => setScannedProducts(products)}
                                onError={(msg) => toast.error(msg)} 
                            />

                            {/* New Product Button */}
                            <button
                                onClick={() => setModalItem('NEW')}
                                className="bg-violet-600 hover:bg-violet-700 active:scale-95 transition-all text-white font-bold py-2 px-6 rounded-xl shadow-md flex items-center gap-2 whitespace-nowrap"
                            >
                                <span>+</span>
                                Nuevo Producto
                            </button>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                                        <th className="px-6 py-4">SKU</th>
                                        <th className="px-6 py-4">Nombre</th>
                                        <th className="px-6 py-4">Categoría</th>
                                        <th className="px-6 py-4 text-right">Costo</th>
                                        <th className="px-6 py-4 text-right">Precio Venta</th>
                                        <th className="px-6 py-4 text-right">Stock (Qty)</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                                                Cargando inventario...
                                            </td>
                                        </tr>
                                    ) : filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                                                Ningún producto encontrado
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                                <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 text-xs">
                                                    {item.itemNumber || '-'}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                                                    {item.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md text-xs font-medium">
                                                        {getCategoryName(item.category_id)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">
                                                    ${item.costPrice.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-violet-700 dark:text-violet-400">
                                                    ${item.unitPrice.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold text-sm ${
                                                        item.receivingQuantity <= (item.reorderLevel || 0)
                                                            ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/60 px-2 py-0.5 rounded-md'
                                                            : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {item.receivingQuantity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setModalItem(item)}
                                                            className="text-violet-700 flex items-center gap-1 hover:text-violet-800 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:hover:bg-violet-800/80 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item)}
                                                            className="text-red-700 flex items-center gap-1 hover:text-red-800 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/80 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Item Modal ── */}
            {modalItem && (
                <ItemModal
                    item={modalItem === 'NEW' ? null : modalItem}
                    categories={categories}
                    brands={brands}
                    onClose={() => setModalItem(null)}
                    onSave={handleSave}
                />
            )}

            {/* ── Invoice Review Modal ── */}
            {scannedProducts && (
                <InvoiceReviewModal
                    products={scannedProducts}
                    onClose={() => setScannedProducts(null)}
                    onSaveAll={handleUpsertAll}
                    isSaving={isSavingUpsert}
                />
            )}
        </div>
    );
};
