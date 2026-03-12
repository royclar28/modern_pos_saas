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
    path: ["unitPrice"], // Attach error to unitPrice field
});

type ItemFormData = z.infer<typeof itemSchema>;

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
                            {/* Nombre */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nombre *</label>
                                <input {...register('name')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                            </div>

                            {/* Categoría */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Categoría *</label>
                                <input {...register('category')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
                            </div>

                            {/* SKU / Item Number */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU / ID Producto</label>
                                <input {...register('itemNumber')} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                            </div>

                            {/* Reorder Level */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Mín. (Alerta)</label>
                                <input type="number" step="0.01" {...register('reorderLevel', { valueAsNumber: true })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                            </div>

                            {/* Cost Price */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Costo *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                </div>
                                {errors.costPrice && <p className="text-xs text-red-500">{errors.costPrice.message}</p>}
                            </div>

                            {/* Unit Price */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Precio Venta *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input type="number" step="0.01" {...register('unitPrice', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                                </div>
                                {errors.unitPrice && <p className="text-xs text-red-500">{errors.unitPrice.message}</p>}
                            </div>

                            {/* Description (Full width) */}
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
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────
export const InventoryPage = () => {
    const { items, isLoading } = useItems();

    const [search, setSearch] = useState('');
    const [modalItem, setModalItem] = useState<ItemDocType | null | 'NEW'>(null);

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
                // Crear nuevo doc
                await db.items.insert({
                    id: crypto.randomUUID(), // Temporario, el backend debería asignarlo o usar UUIDv4
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
                    updatedAt: Date.now(), // Timestamp para RxDB sync
                });
            } else if (modalItem && typeof modalItem !== 'string') {
                // Actualizar existente
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
            if (doc) {
                // RxDB standard soft-delete trigger
                await doc.remove();
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error al eliminar');
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
                        <button
                            onClick={() => setModalItem('NEW')}
                            className="bg-violet-600 hover:bg-violet-700 active:scale-95 transition-all text-white font-bold py-2 px-6 rounded-xl shadow-md flex items-center gap-2 whitespace-nowrap"
                        >
                            <span>+</span>
                            Nuevo Producto
                        </button>
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
                                        <th className="px-6 py-4 text-right">Preview Venta</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400">
                                                Cargando inventario...
                                            </td>
                                        </tr>
                                    ) : filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
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

            {modalItem && (
                <ItemModal
                    item={modalItem === 'NEW' ? null : modalItem}
                    onClose={() => setModalItem(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};
