import { useState } from 'react';
import { useItems } from '../hooks/useItems';
import { useSync } from '../hooks/useSync';
import { getDatabase } from '../db/database';
import { useAuth } from '../contexts/AuthProvider';
import { Link } from 'react-router-dom';

const PRODUCT_CATEGORIES = ['ALIMENTOS', 'BEBIDAS', 'LIMPIEZA', 'ASEO', 'ELECTRÓNICA'];

const createRandomItem = async () => {
    const db = await getDatabase();
    const id = `item_${Date.now()}`;
    await db.items.insert({
        id,
        name: `Producto ${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        category: PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)],
        costPrice: parseFloat((Math.random() * 50 + 1).toFixed(2)),
        unitPrice: parseFloat((Math.random() * 100 + 10).toFixed(2)),
        reorderLevel: 10,
        receivingQuantity: 1,
        allowAltDescription: false,
        isSerialized: false,
        updatedAt: Date.now(),
        deleted: false,
    });
};

export const ProductsPage = () => {
    const { items, isLoading } = useItems();
    const { user, logout } = useAuth();
    const [inserting, setInserting] = useState(false);
    useSync(); // Start live replication when this page mounts

    const handleCreateRandom = async () => {
        setInserting(true);
        try {
            await createRandomItem();
        } finally {
            setInserting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-slate-300 hover:text-white text-sm">← Dashboard</Link>
                    <h1 className="text-xl font-bold">📦 Inventario de Productos</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-slate-300 text-sm">{user?.username}</span>
                    <button
                        onClick={logout}
                        className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
                    >
                        Salir
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-6xl mx-auto">
                {/* Controls */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Catálogo Local</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {items.length} producto(s) — sincronizado via
                            <span className="font-mono text-purple-600 ml-1">RxDB ⟷ NestJS</span>
                        </p>
                    </div>
                    <button
                        onClick={handleCreateRandom}
                        disabled={inserting}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg shadow-sm transition-all"
                    >
                        {inserting ? '⏳ Creando...' : '+ Crear Producto Random'}
                    </button>
                </div>

                {/* Sync status badge */}
                <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 w-fit">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Sincronización en vivo activa — los datos aparecen sin recargar la página
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-200">
                                <th className="text-left px-6 py-4 font-semibold text-slate-600">Nombre</th>
                                <th className="text-left px-6 py-4 font-semibold text-slate-600">Categoría</th>
                                <th className="text-right px-6 py-4 font-semibold text-slate-600">Costo</th>
                                <th className="text-right px-6 py-4 font-semibold text-slate-600">Precio Venta</th>
                                <th className="text-right px-6 py-4 font-semibold text-slate-600">Margen</th>
                                <th className="text-center px-6 py-4 font-semibold text-slate-600">Origen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400">
                                        <div className="animate-spin text-2xl mb-2">⟳</div>
                                        Cargando base de datos local...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-400">
                                        <p className="text-4xl mb-3">📭</p>
                                        <p className="font-semibold">Sin productos todavía</p>
                                        <p className="text-xs mt-1">Inserta uno desde PostgreSQL o usa el botón de arriba</p>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => {
                                    const margin = item.unitPrice > 0
                                        ? (((item.unitPrice - item.costPrice) / item.unitPrice) * 100).toFixed(1)
                                        : '0';
                                    const isLocal = item.id.startsWith('item_');
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">${item.costPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-slate-800">${item.unitPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-semibold ${parseFloat(margin) > 20 ? 'text-green-600' : 'text-orange-500'}`}>
                                                    {margin}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-xs px-2 py-1 rounded font-medium ${isLocal ? 'bg-yellow-50 text-yellow-700' : 'bg-purple-50 text-purple-700'}`}>
                                                    {isLocal ? '📱 Local' : '☁️ Server'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {items.length > 0 && (
                    <p className="text-slate-400 text-xs mt-3 text-right">
                        Leyendo de IndexedDB local via RxDB — sin peticiones al servidor
                    </p>
                )}
            </main>
        </div>
    );
};
