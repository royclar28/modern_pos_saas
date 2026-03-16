import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useItems } from '../../hooks/useItems';
import { getDatabase } from '../../db/database';
import { ItemDocType } from '../../db/schemas/item.schema';
import { Link } from 'react-router-dom';

// ─── Zod Schema for Validation ──────────────────────────────────────────────
const itemSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "El nombre es obligatorio"),
    category: z.string().min(2, "La categoría es obligatoria"),
    itemNumber: z.string().optional(),
    description: z.string().optional(),
    costPrice: z.number().min(0, "Debe ser mayor o igual a 0"),
    unitPrice: z.number().min(0, "Debe ser mayor o igual a 0"),
    reorderLevel: z.number().min(0).default(0),
    receivingQuantity: z.number().min(1).default(1),
}).refine((data) => data.unitPrice >= data.costPrice, {
    message: "El precio de venta debe ser mayor o igual al costo",
    path: ["unitPrice"],
});

type ItemFormData = z.infer<typeof itemSchema>;

// ─── Scanned Product Type ─────────────────────────────────────────────────────
interface ScannedProduct {
    name: string;
    sku: string;
    costPrice: number;
    unitPrice: number;
    quantity: number;
    category: string;
}

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
    onClose,
    onSave
}: {
    item?: ItemDocType | null;
    onClose: () => void;
    onSave: (data: ItemFormData) => Promise<void>;
}) => {
    const isEdit = !!item;
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: item ? {
            id: item.id,
            name: item.name,
            category: item.category,
            itemNumber: item.itemNumber || '',
            description: item.description || '',
            costPrice: item.costPrice,
            unitPrice: item.unitPrice,
            reorderLevel: item.reorderLevel,
            receivingQuantity: item.receivingQuantity,
        } : {
            costPrice: 0,
            unitPrice: 0,
            reorderLevel: 0,
            receivingQuantity: 1,
        }
    });

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
                    <form id="item-form" onSubmit={handleSubmit(onSave)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nombre *</label>
                                <input {...register('name')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Categoría *</label>
                                <input {...register('category')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU / ID Producto</label>
                                <input {...register('itemNumber')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Mín. (Alerta)</label>
                                <input type="number" step="0.01" {...register('reorderLevel', { valueAsNumber: true })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Costo *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                </div>
                                {errors.costPrice && <p className="text-xs text-red-500">{errors.costPrice.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Precio Venta *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input type="number" step="0.01" {...register('unitPrice', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                </div>
                                {errors.unitPrice && <p className="text-xs text-red-500">{errors.unitPrice.message}</p>}
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Descripción</label>
                                <textarea {...register('description')} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none"></textarea>
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
async function upsertScannedProducts(products: ScannedProduct[]): Promise<{ updated: number; inserted: number }> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    let updated = 0;
    let inserted = 0;

    for (const product of products) {
        let existingDoc = null;

        // 1. Try to find by SKU first
        if (product.sku) {
            const results = await db.items.find({
                selector: { itemNumber: { $eq: product.sku } }
            }).exec();
            if (results.length > 0) {
                existingDoc = results[0];
            }
        }

        // 2. If not found by SKU, try by name (case-insensitive)
        if (!existingDoc) {
            const allItems = await db.items.find().exec();
            existingDoc = allItems.find(
                (doc: any) => doc.name.toLowerCase().trim() === product.name.toLowerCase().trim()
            ) || null;
        }

        if (existingDoc) {
            // ── UPDATE: sum stock and update prices ────────────────────────
            await existingDoc.patch({
                receivingQuantity: (existingDoc.receivingQuantity || 0) + product.quantity,
                costPrice: product.costPrice,   // Always update to latest invoice cost
                unitPrice: product.unitPrice > existingDoc.unitPrice
                    ? product.unitPrice
                    : existingDoc.unitPrice,     // Only increase sale price, never decrease
                updatedAt: Date.now(),
            });
            updated++;
        } else {
            // ── INSERT: create new product ─────────────────────────────────
            await db.items.insert({
                id: crypto.randomUUID(),
                name: product.name,
                category: product.category || 'General',
                itemNumber: product.sku || '',
                description: '',
                costPrice: product.costPrice,
                unitPrice: product.unitPrice,
                reorderLevel: 0,
                receivingQuantity: product.quantity,
                allowAltDescription: false,
                isSerialized: false,
                updatedAt: Date.now(),
            });
            inserted++;
        }
    }

    return { updated, inserted };
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────
export const InventoryPage = () => {
    const { items, isLoading } = useItems();

    const [search, setSearch] = useState('');
    const [modalItem, setModalItem] = useState<ItemDocType | null | 'NEW'>(null);

    // Scanner state
    const [isScanning, setIsScanning] = useState(false);
    const [scannedProducts, setScannedProducts] = useState<ScannedProduct[] | null>(null);
    const [isSavingUpsert, setIsSavingUpsert] = useState(false);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return items;
        return items.filter(
            i => i.name.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q) ||
                (i.itemNumber && i.itemNumber.toLowerCase().includes(q))
        );
    }, [items, search]);

    const handleSave = async (data: ItemFormData) => {
        const db = await getDatabase();
        if (!db) return;

        try {
            if (modalItem === 'NEW') {
                await db.items.insert({
                    id: crypto.randomUUID(),
                    name: data.name,
                    category: data.category,
                    itemNumber: data.itemNumber,
                    description: data.description,
                    costPrice: data.costPrice,
                    unitPrice: data.unitPrice,
                    reorderLevel: data.reorderLevel,
                    receivingQuantity: data.receivingQuantity,
                    allowAltDescription: false,
                    isSerialized: false,
                    updatedAt: Date.now(),
                });
            } else if (modalItem && typeof modalItem !== 'string') {
                const doc = await db.items.findOne(modalItem.id).exec();
                if (doc) {
                    await doc.patch({
                        name: data.name,
                        category: data.category,
                        itemNumber: data.itemNumber,
                        description: data.description,
                        costPrice: data.costPrice,
                        unitPrice: data.unitPrice,
                        reorderLevel: data.reorderLevel,
                        receivingQuantity: data.receivingQuantity,
                        updatedAt: Date.now(),
                    });
                }
            }
            setModalItem(null);
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Error al guardar el producto');
        }
    };

    const handleDelete = async (item: ItemDocType) => {
        const db = await getDatabase();
        if (!db || !window.confirm(`¿Estás seguro de eliminar "${item.name}"?`)) return;
        try {
            const doc = await db.items.findOne(item.id).exec();
            if (doc) await doc.remove();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error al eliminar');
        }
    };

    // ── Invoice scanner handlers ──────────────────────────────────
    const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const token = localStorage.getItem('pos_token');
            const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3333';

            const formData = new FormData();
            formData.append('invoice', file);

            const res = await fetch(`${apiUrl}/inventory/scan-invoice`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.products && data.products.length > 0) {
                setScannedProducts(data.products);
            } else {
                toast.error('No se detectaron productos en la factura.');
            }
        } catch (err) {
            console.error('Invoice scan failed:', err);
            toast.error('Error al escanear la factura. Intente de nuevo.');
        } finally {
            setIsScanning(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const handleUpsertAll = async (products: ScannedProduct[]) => {
        setIsSavingUpsert(true);
        try {
            const result = await upsertScannedProducts(products);
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
        <div className="flex flex-col h-screen bg-slate-50">
            {/* ── Navbar Admin ── */}
            <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold tracking-tight">📦 Gestión de Inventario</h1>
                    <nav className="flex gap-4">
                        <Link to="/" className="text-sm text-slate-300 hover:text-white transition-colors">Volver al Dashboard</Link>
                        <Link to="/pos" className="text-sm text-slate-300 hover:text-white transition-colors">IR AL POS →</Link>
                    </nav>
                </div>
            </header>

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
                            {/* Scanner Button */}
                            <label
                                className={`cursor-pointer bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white font-bold py-2 px-5 rounded-xl shadow-md flex items-center gap-2 whitespace-nowrap ${
                                    isScanning ? 'opacity-60 pointer-events-none' : ''
                                }`}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleScanInvoice}
                                    disabled={isScanning}
                                />
                                {isScanning ? (
                                    <><span className="animate-spin">⟳</span> Escaneando...</>
                                ) : (
                                    <>📄 Escanear Factura</>
                                )}
                            </label>

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
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                        <th className="px-6 py-4">SKU</th>
                                        <th className="px-6 py-4">Nombre</th>
                                        <th className="px-6 py-4">Categoría</th>
                                        <th className="px-6 py-4 text-right">Costo</th>
                                        <th className="px-6 py-4 text-right">Precio Venta</th>
                                        <th className="px-6 py-4 text-right">Stock (Qty)</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-slate-400">
                                                Cargando inventario...
                                            </td>
                                        </tr>
                                    ) : filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                                                Ningún producto encontrado
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                                                    {item.itemNumber || '-'}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-slate-800">
                                                    {item.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-medium">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500">
                                                    ${item.costPrice.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-violet-700">
                                                    ${item.unitPrice.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold text-sm ${
                                                        item.receivingQuantity <= (item.reorderLevel || 0)
                                                            ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded-md'
                                                            : 'text-slate-700'
                                                    }`}>
                                                        {item.receivingQuantity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setModalItem(item)}
                                                            className="text-violet-600 flex items-center gap-1 hover:text-violet-800 bg-violet-50 px-3 py-1.5 rounded-lg active:scale-95"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item)}
                                                            className="text-red-600 flex items-center gap-1 hover:text-red-800 bg-red-50 px-3 py-1.5 rounded-lg active:scale-95"
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
