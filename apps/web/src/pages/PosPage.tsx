import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useItems } from '../hooks/useItems';
import { useSync } from '../hooks/useSync';
import { useCart } from '../contexts/CartProvider';
import { useAuth } from '../contexts/AuthProvider';
import { ItemDocType } from '../db/schemas/item.schema';
import { SaleDocType } from '../db/schemas/sale.schema';
import { Receipt } from '../components/Receipt';

// ─── Product Card ─────────────────────────────────────────────────────────────

const ProductCard = ({ item, onAdd }: { item: ItemDocType; onAdd: (item: ItemDocType) => void }) => (
    <button
        onClick={() => onAdd(item)}
        className="group bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-violet-400 hover:shadow-md hover:shadow-violet-100 active:scale-95 transition-all duration-150 flex flex-col gap-2"
    >
        <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 group-hover:text-violet-700 transition-colors">
                {item.name}
            </span>
            <span className="text-xs font-medium bg-slate-100 text-slate-500 rounded-md px-2 py-0.5 shrink-0">
                {item.category}
            </span>
        </div>
        <div className="mt-auto flex items-center justify-between">
            <span className="text-xl font-bold text-violet-700">${item.unitPrice.toFixed(2)}</span>
            <span className="text-xs text-slate-400">+ al carrito</span>
        </div>
    </button>
);

// ─── Cart Row ─────────────────────────────────────────────────────────────────

const CartRow = ({
    item,
    onRemove,
    onQtyChange,
}: {
    item: import('../contexts/CartProvider').CartItem;
    onRemove: (id: string) => void;
    onQtyChange: (id: string, qty: number) => void;
}) => {
    const lineTotal = item.product.unitPrice * item.quantity * (1 - item.discount / 100);

    return (
        <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 group">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.product.name}</p>
                <p className="text-xs text-slate-400">${item.product.unitPrice.toFixed(2)} c/u</p>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onQtyChange(item.product.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition-colors"
                >
                    −
                </button>
                <span className="w-8 text-center font-semibold text-slate-800 text-sm">{item.quantity}</span>
                <button
                    onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition-colors"
                >
                    +
                </button>
            </div>
            <span className="text-sm font-semibold text-slate-800 w-16 text-right">${lineTotal.toFixed(2)}</span>
            <button
                onClick={() => onRemove(item.product.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all text-lg leading-none ml-1"
                title="Eliminar"
            >
                ×
            </button>
        </div>
    );
};

// ─── Success Modal ────────────────────────────────────────────────────────────

const SuccessModal = ({ sale, onClose }: { sale: SaleDocType; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:bg-transparent print:backdrop-blur-none print:p-0">

        {/* Screen UI - Hidden on Print */}
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center print:hidden">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">¡Venta Registrada!</h2>
            <p className="text-slate-500 text-sm mb-6">
                Guardada en RxDB — se sincronizará al servidor.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">ID</span>
                    <span className="font-mono text-xs text-slate-700">{sale.id.slice(-12)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-semibold">${sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IVA ({sale.taxPercent}%)</span>
                    <span className="font-semibold">${sale.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-violet-700">${sale.total.toFixed(2)}</span>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    onClick={() => window.print()}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    🖨️ Imprimir Ticket
                </button>
                <button
                    onClick={onClose}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                    Nueva Venta
                </button>
            </div>
        </div>

        {/* Print UI - Hidden on Screen */}
        <div className="hidden print:block absolute inset-0 bg-white">
            <Receipt sale={sale} />
        </div>
    </div>
);

// ─── POS Page ─────────────────────────────────────────────────────────────────

export const PosPage = () => {
    const { items, isLoading } = useItems();
    const { cartItems, totals, addToCart, removeFromCart, setQuantity, clearCart, checkout } = useCart();
    const { user } = useAuth();
    useSync();

    const [search, setSearch] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [completedSale, setCompletedSale] = useState<SaleDocType | null>(null);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return items;
        return items.filter(
            i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
        );
    }, [items, search]);

    const handleCheckout = async () => {
        if (cartItems.length === 0 || isProcessing) return;
        setIsProcessing(true);
        try {
            const sale = await checkout(user?.username ?? 'unknown');
            setCompletedSale(sale);
        } catch (err) {
            console.error('Checkout failed:', err);
            alert('Error al procesar la venta. Intente de nuevo.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-hidden print:bg-white print:h-auto print:overflow-visible">
            {/* ── Top Bar ────────────────────────────────────────────────────── */}
            <header className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 shadow-lg print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-slate-400 hover:text-white text-sm transition-colors">
                        ← Dashboard
                    </Link>
                    <h1 className="text-lg font-bold tracking-tight">🛒 Punto de Venta</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full font-medium">
                        ● Sync Activa
                    </span>
                    <span className="text-slate-400 text-sm">{user?.username}</span>
                </div>
            </header>

            {/* ── Main Layout: Left (Catalog) + Right (Ticket) ──────────────── */}
            <div className="flex flex-1 gap-0 overflow-hidden print:hidden">

                {/* ── LEFT: Product Catalog ──────────────────────────────────── */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Search Bar */}
                    <div className="px-5 py-4 bg-white border-b border-slate-200 shrink-0">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre o categoría..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-48 text-slate-400">
                                <div className="text-center">
                                    <div className="text-3xl animate-spin mb-2">⟳</div>
                                    <p className="text-sm">Cargando catálogo local…</p>
                                </div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex items-center justify-center h-48 text-slate-400 text-center">
                                <div>
                                    <p className="text-4xl mb-2">📭</p>
                                    <p className="font-semibold">Sin resultados</p>
                                    <p className="text-xs mt-1">Intenta con otro término de búsqueda</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filtered.map(item => (
                                    <ProductCard key={item.id} item={item} onAdd={addToCart} />
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-center text-slate-400 py-2 bg-white border-t border-slate-100">
                        {filtered.length} producto(s) disponibles — datos de IndexedDB local (RxDB)
                    </p>
                </div>

                {/* ── RIGHT: Ticket / Cart ───────────────────────────────────── */}
                <div className="w-80 xl:w-96 flex flex-col bg-white border-l border-slate-200 shrink-0">
                    {/* Cart Header */}
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="font-bold text-slate-800">Ticket</h2>
                            <p className="text-xs text-slate-400">
                                {totals.itemCount} artículo(s)
                            </p>
                        </div>
                        {cartItems.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto px-5">
                        {cartItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center py-12">
                                <p className="text-5xl mb-3">🛒</p>
                                <p className="font-semibold text-slate-400">Carrito vacío</p>
                                <p className="text-xs text-slate-300 mt-1">Toca un producto para agregarlo</p>
                            </div>
                        ) : (
                            cartItems.map(ci => (
                                <CartRow
                                    key={ci.product.id}
                                    item={ci}
                                    onRemove={removeFromCart}
                                    onQtyChange={setQuantity}
                                />
                            ))
                        )}
                    </div>

                    {/* Totals + Checkout */}
                    <div className="shrink-0 border-t border-slate-200 px-5 py-4 space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Subtotal</span>
                            <span>${totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>IVA ({totals.taxPercent}%)</span>
                            <span>${totals.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl text-slate-900 border-t border-slate-200 pt-2 mt-2">
                            <span>Total</span>
                            <span className="text-violet-700">${totals.total.toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={cartItems.length === 0 || isProcessing}
                            className="
                w-full mt-3 py-4 rounded-xl font-bold text-lg tracking-wide transition-all
                bg-violet-600 hover:bg-violet-700 active:scale-95
                text-white shadow-lg shadow-violet-200
                disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100
              "
                        >
                            {isProcessing ? '⏳ Procesando…' : '💳 COBRAR'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Success Modal ──────────────────────────────────────────────── */}
            {completedSale && (
                <SuccessModal sale={completedSale} onClose={() => setCompletedSale(null)} />
            )}
        </div>
    );
};
