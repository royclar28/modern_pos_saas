import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useItems } from '../hooks/useItems';
import { useSync } from '../hooks/useSync';
import { useCart } from '../contexts/CartProvider';
import { useSettingsContext as useSettings } from '../contexts/SettingsProvider';
import { useAuth } from '../contexts/AuthProvider';
import { useHighVisibility } from '../hooks/useHighVisibility';
import { ItemDocType } from '../db/schemas/item.schema';
import { SaleDocType } from '../db/schemas/sale.schema';
import { Receipt } from '../components/Receipt';
import { CheckoutModal } from '../components/CheckoutModal';
import { PaymentData } from '../components/CheckoutModal';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

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
    success(msg: string, _opts?: any) { this._show('✅ ' + msg, '#16a34a'); },
    error(msg: string, _opts?: any) { this._show('❌ ' + msg, '#dc2626'); },
};

// ─── Number Formatter ────────────────────────────────────────────────────────
const formatCurrency = (val: number) => val.toFixed(2);

// ─── Audio Beep API ───────────────────────────────────────────────────────────
const playBeep = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.error('Audio beep failed', e);
    }
};

// ─── Product Card (Dual Mode) ─────────────────────────────────────────────────
const ProductCard = ({ item, onAdd, exchangeRate, hv }: { item: ItemDocType; onAdd: (item: ItemDocType) => void; exchangeRate: number; hv: boolean }) => (
    <button
        onClick={() => { onAdd(item); playBeep(); }}
        className={`group bg-white border border-slate-200 text-left hover:border-violet-500 hover:shadow-lg hover:shadow-violet-200/50 active:scale-95 transition-all duration-150 flex flex-col relative overflow-hidden ${
            hv
                ? 'rounded-2xl p-4 gap-2 min-h-[120px]'
                : 'rounded-lg p-2.5 gap-1.5 h-24'
        }`}
    >
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-50 to-transparent -rotate-45 translate-x-8 -translate-y-8 rounded-full z-0 group-hover:scale-150 transition-transform duration-500" />
        <div className="flex items-start justify-between gap-1 z-10">
            <span className={`font-bold text-slate-700 leading-tight group-hover:text-violet-800 transition-colors ${
                hv ? 'text-xl line-clamp-1' : 'text-xs line-clamp-2'
            }`}>
                {item.name}
            </span>
        </div>
        <div className="mt-auto flex justify-between items-end z-10 w-full">
            <div className="flex flex-col">
                <span className={`font-black text-violet-700 ${hv ? 'text-3xl' : 'text-sm'}`}>
                    ${formatCurrency(item.unitPrice)}
                </span>
                {!hv && (
                    <span className="text-[10px] text-slate-400 font-medium leading-none">
                        Bs. {formatCurrency(item.unitPrice * exchangeRate)}
                    </span>
                )}
            </div>
            {!hv && (
                <span className="text-[9px] font-bold tracking-wider uppercase text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 truncate max-w-[60px]">
                    {item.category}
                </span>
            )}
        </div>
    </button>
);

// ─── Cart Row (Dual Mode) ─────────────────────────────────────────────────────
const CartRow = ({
    item, onRemove, onQtyChange, exchangeRate, hv
}: {
    item: import('../contexts/CartProvider').CartItem;
    onRemove: (id: string) => void;
    onQtyChange: (id: string, qty: number) => void;
    exchangeRate: number;
    hv: boolean;
}) => {
    const lineTotal = item.product.unitPrice * item.quantity * (1 - item.discount / 100);
    return (
        <div className={`flex items-center border-b border-slate-100 last:border-0 group ${
            hv ? 'gap-3 py-3' : 'gap-2 py-2'
        }`}>
            <div className="flex-1 min-w-0">
                <p className={`font-bold text-slate-800 truncate leading-tight ${hv ? 'text-lg' : 'text-xs'}`}>
                    {item.product.name}
                </p>
                {!hv && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[10px] text-slate-500 font-medium">${formatCurrency(item.product.unitPrice)}</p>
                        <span className="text-[9px] text-slate-300">•</span>
                        <p className="text-[9px] text-slate-400">Bs. {formatCurrency(item.product.unitPrice * exchangeRate)}</p>
                    </div>
                )}
            </div>
            <div className={`flex items-center bg-slate-50 rounded-lg border border-slate-100 ${
                hv ? 'gap-1 p-1' : 'gap-0.5 p-0.5'
            }`}>
                <button
                    onClick={() => onQtyChange(item.product.id, item.quantity - 1)}
                    className={`rounded hover:bg-white hover:shadow-sm text-slate-600 font-bold flex items-center justify-center transition-all ${
                        hv ? 'w-10 h-10 text-2xl' : 'w-5 h-5 text-xs'
                    }`}
                >−</button>
                <span className={`text-center font-bold text-slate-800 ${hv ? 'w-10 text-xl' : 'w-6 text-xs'}`}>
                    {item.quantity}
                </span>
                <button
                    onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
                    className={`rounded hover:bg-white hover:shadow-sm text-slate-600 font-bold flex items-center justify-center transition-all ${
                        hv ? 'w-10 h-10 text-2xl' : 'w-5 h-5 text-xs'
                    }`}
                >+</button>
            </div>
            <div className={`flex flex-col text-right px-1 ${hv ? 'w-24' : 'w-16'}`}>
                <span className={`font-black text-slate-800 ${hv ? 'text-xl' : 'text-xs'}`}>
                    ${formatCurrency(lineTotal)}
                </span>
                {!hv && (
                    <span className="text-[9px] text-slate-400 font-medium">
                        Bs. {formatCurrency(lineTotal * exchangeRate)}
                    </span>
                )}
            </div>
            <button
                onClick={() => onRemove(item.product.id)}
                className={`text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all leading-none shrink-0 ${
                    hv ? 'opacity-100 p-2.5 text-2xl' : 'opacity-0 group-hover:opacity-100 p-1.5 text-sm'
                }`}
                title="Eliminar"
            >×</button>
        </div>
    );
};

// ─── Success Modal ────────────────────────────────────────────────────────────
const SuccessModal = ({ sale, onClose, exchangeRate }: { sale: SaleDocType; onClose: () => void; exchangeRate: number }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4 print:bg-transparent print:backdrop-blur-none print:p-0">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center print:hidden animate-in zoom-in-95 duration-300">
            <div className="text-6xl mb-4 animate-bounce">✅</div>
            <h2 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">¡Venta Exitosa!</h2>
            <p className="text-slate-500 text-sm mb-6 font-medium">Guardada en local, sincronización en cola.</p>
            <div className="bg-slate-50 rounded-2xl p-5 mb-6 text-left space-y-2 border border-slate-100 shadow-inner">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Ticket ID</span>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">{sale.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500 font-medium">Subtotal</span>
                    <span className="font-bold text-slate-700">${formatCurrency(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">IVA ({sale.taxPercent}%)</span>
                    <span className="font-bold text-slate-700">${formatCurrency(sale.taxAmount)}</span>
                </div>
                <div className="flex justify-between items-center font-bold border-t border-slate-200 pt-3 mt-3">
                    <span className="text-slate-600">Total Pagado</span>
                    <div className="text-right">
                        <div className="text-xl text-violet-700 font-black">${formatCurrency(sale.total)}</div>
                        <div className="text-xs text-slate-500 font-medium">Bs. {formatCurrency(sale.total * exchangeRate)}</div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={() => window.print()} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    🖨️ Imprimir Ticket
                </button>
                <button onClick={onClose} className="w-full bg-violet-100 hover:bg-violet-200 text-violet-800 font-bold py-4 rounded-2xl transition-all active:scale-95">
                    Nueva Venta [Enter]
                </button>
            </div>
        </div>
        <div className="hidden print:block absolute inset-0 bg-white">
            <Receipt sale={sale} />
        </div>
    </div>
);

// ─── POS Page ─────────────────────────────────────────────────────────────────

export const PosPage = () => {
    const { items, isLoading } = useItems();
    const { cartItems, totals, addToCart, removeFromCart, setQuantity, clearCart, checkout, exchangeRate, refetchSettings } = useCart();
    const { enableCreditSales } = useSettings();
    const { user } = useAuth();
    const { isHighVis } = useHighVisibility();
    useSync();

    // Alias for readability in JSX
    const hv = isHighVis;

    const [search, setSearch] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [completedSale, setCompletedSale] = useState<SaleDocType | null>(null);
    const [isSyncingBCV, setIsSyncingBCV] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return items;
        return items.filter(
            i => i.name.toLowerCase().includes(q) ||
                 i.category.toLowerCase().includes(q) ||
                 (i.itemNumber && i.itemNumber.toLowerCase().includes(q))
        );
    }, [items, search]);

    // Barcode Scanner Integration
    useBarcodeScanner(useCallback((barcode) => {
        if (isCheckoutModalOpen || completedSale) return;
        const item = items.find(i =>
            i.itemNumber === barcode ||
            i.id === barcode ||
            i.name.toLowerCase() === barcode.toLowerCase()
        );
        if (item) { addToCart(item); playBeep(); }
        else { toast.error(`Producto no encontrado: ${barcode}`); }
    }, [items, addToCart, isCheckoutModalOpen, completedSale]));

    const processCheckout = async (paymentData: PaymentData) => {
        if (cartItems.length === 0 || isProcessing) return;
        setIsProcessing(true);
        try {
            const sale = await checkout(user?.username ?? 'unknown', paymentData);
            setIsCheckoutModalOpen(false);
            setCompletedSale(sale);
        } catch (err) {
            console.error('Checkout failed:', err);
            toast.error('Error al procesar la venta. Intente de nuevo.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSyncBCV = async () => {
        setIsSyncingBCV(true);
        try {
            const token = localStorage.getItem('pos_token');
            const apiUrl = `http://${window.location.hostname}:3333/api` || 'http://localhost:3333';
            await fetch(`${apiUrl}/settings/bcv/sync`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            refetchSettings();
            toast.success('Tasa BCV actualizada');
        } catch(e) {
            console.error('Error synchronizing BCV API:', e);
            toast.error('Error al actualizar tasa');
        } finally {
            setIsSyncingBCV(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (completedSale) {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    setCompletedSale(null);
                    searchInputRef.current?.focus();
                }
                return;
            }
            if (isCheckoutModalOpen) return;
            if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
            else if (e.key === 'F12') { e.preventDefault(); if (cartItems.length > 0) setIsCheckoutModalOpen(true); }
            else if (e.key === 'Escape') { e.preventDefault(); clearCart(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [completedSale, isCheckoutModalOpen, cartItems.length, clearCart]);

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* ── Navbar (Topbar) ──────────────────────────────────────────────────────── */}
            <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold tracking-tight">
                        <span className="text-primary mr-2">●</span>{'POS Terminal'}
                    </h1>
                    <nav className="hidden sm:flex gap-4">
                        <Link to="/" className="text-sm text-slate-300 hover:text-white transition-colors">
                            ← Dashboard
                        </Link>
                        {user?.role === 'SUPER_ADMIN' || user?.role === 'STORE_ADMIN' ? (
                            <Link to="/admin/settings" className="text-sm text-slate-300 hover:text-white transition-colors">
                                Ajustes
                            </Link>
                        ) : null}
                        <button
                            onClick={() => document.documentElement.classList.toggle('dark')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1 rounded-lg text-sm transition-colors ml-4"
                            title="Alternar Modo Oscuro"
                        >
                            🌞/🌙
                        </button>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSyncBCV}
                        disabled={isSyncingBCV}
                        className="text-xs bg-slate-800 border border-slate-700/80 hover:bg-slate-700 px-3 py-1.5 text-slate-200 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-sm disabled:opacity-50"
                        title="Actualizar Tasa BCV Manualmente"
                    >
                        Tasa BCV: Bs. {formatCurrency(exchangeRate)} <span className={`text-[10px] ${isSyncingBCV ? 'animate-spin' : ''}`}>🔄</span>
                    </button>
                    {!hv && <div className="h-4 w-px bg-slate-700" />}
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                        <span className="text-slate-300 text-xs font-bold">{user?.username}</span>
                    </div>
                </div>
            </header>

            {/* ── Main Layout (Left: Grid, Right: Cart) ─────────────────────────────── */}
            <main className="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto">
                <section className="flex-1 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800 transition-colors">
                    {/* Search Bar */}
                    <div className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0 z-10 flex gap-3 items-center ${
                        hv ? 'px-4 py-2' : 'px-4 py-3'
                    }`}>
                        <div className="relative flex-1">
                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 ${hv ? 'text-xl' : 'text-sm'}`}>🔍</span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={hv ? "Buscar o escanear..." : "Buscar artículo o escanear código de barras... [F2]"}
                                className={`w-full border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-0 focus:border-violet-500 font-medium transition-all shadow-sm ${
                                    hv
                                        ? 'pl-12 pr-4 py-4 text-xl rounded-2xl'
                                        : 'pl-10 pr-4 py-3 text-sm rounded-xl'
                                }`}
                            />
                            {search && (
                                <button
                                    onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors ${
                                        hv ? 'p-2 text-xl' : 'p-1'
                                    }`}
                                >✕</button>
                            )}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-4 scroller">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <div className="text-center">
                                    <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-sm font-medium animate-pulse text-violet-600">Sincronizando catálogo...</p>
                                </div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center fade-in">
                                <span className="text-6xl mb-4 grayscale opacity-50">📦</span>
                                <h3 className={`font-bold text-slate-700 ${hv ? 'text-3xl' : 'text-lg'}`}>No hay resultados</h3>
                                <p className={`text-slate-400 mt-1 max-w-xs leading-relaxed ${hv ? 'text-lg' : 'text-sm'}`}>
                                    Verifica el nombre del producto o escanea un código de barras válido.
                                </p>
                            </div>
                        ) : (
                            <div className={`gap-2.5 pb-10 fade-in grid ${
                                hv
                                    ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                            }`}>
                                {filtered.map(item => (
                                    <ProductCard key={item.id} item={item} onAdd={addToCart} exchangeRate={exchangeRate} hv={hv} />
                                ))}
                            </div>
                        )}
                    </div>

                    {!hv && (
                        <div className="px-4 py-1.5 bg-slate-200/50 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-500 tracking-wide uppercase shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                RxDB IndexedDB Sync
                            </div>
                            <div className="flex gap-4">
                                <span>{filtered.length} Artículos</span>
                                <span className="hidden sm:inline">Atajos: [F2] Búsqueda | [F12] Cobro Rápido | [Esc] Cancelar</span>
                            </div>
                        </div>
                    )}
                </section>

                {/* ── RIGHT: Ticket / Cart (slides in on mobile) ─────────── */}
                <div className={`flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shrink-0 shadow-2xl z-20 transition-transform duration-300 ${
                    hv ? 'w-[420px]' : 'w-80 xl:w-96'
                } fixed inset-y-0 right-0 md:static md:translate-x-0 ${
                    mobileCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
                }`}>
                    {/* Cart Header */}
                    <div className={`bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 ${
                        hv ? 'px-5 py-4' : 'px-4 py-3'
                    }`}>
                        <div className="flex items-center gap-2">
                            <span className={hv ? 'text-3xl' : 'text-xl'}>🧾</span>
                            <div>
                                <h2 className={`font-black text-slate-800 dark:text-white tracking-tight leading-none mb-0.5 ${
                                    hv ? 'text-xl' : 'text-sm'
                                }`}>Ticket Actual</h2>
                                <p className={`font-semibold text-slate-400 uppercase tracking-wider ${
                                    hv ? 'text-sm' : 'text-[10px]'
                                }`}>
                                    {totals.itemCount} artículo{totals.itemCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        {cartItems.length > 0 && (
                            <button
                                onClick={clearCart}
                                className={`font-bold bg-white dark:bg-slate-700 text-red-500 hover:text-white hover:bg-red-500 border border-slate-200 dark:border-slate-600 hover:border-red-500 rounded-lg transition-all shadow-sm active:scale-95 ${
                                    hv ? 'text-sm px-4 py-2' : 'text-[10px] px-2.5 py-1.5'
                                }`}
                                title="[Esc] Limpiar Todo"
                            >LIMPIAR</button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className={`flex-1 overflow-y-auto bg-white dark:bg-slate-900 scroll-smooth relative ${
                        hv ? 'px-5 py-3' : 'px-4 py-2'
                    }`}>
                        {cartItems.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-800/50">
                                <div className={`bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3 ${
                                    hv ? 'w-24 h-24' : 'w-16 h-16'
                                }`}>
                                    <span className={`opacity-50 grayscale ${hv ? 'text-5xl' : 'text-3xl'}`}>🛒</span>
                                </div>
                                <h3 className={`font-bold text-slate-700 dark:text-slate-300 ${hv ? 'text-2xl' : 'text-sm'}`}>Carrito Vacío</h3>
                                <p className={`text-slate-400 font-medium mt-1 ${hv ? 'text-base' : 'text-xs'}`}>
                                    {hv ? 'Escanea o toca un producto.' : 'Escanea artículos o selecciónalos del catálogo a la izquierda.'}
                                </p>
                            </div>
                        ) : (
                            <div className="fade-in">
                                {cartItems.map(ci => (
                                    <CartRow
                                        key={ci.product.id}
                                        item={ci}
                                        onRemove={removeFromCart}
                                        onQtyChange={setQuantity}
                                        exchangeRate={exchangeRate}
                                        hv={hv}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Totals + Checkout — In HV mode this becomes a GIANT footer */}
                    <div className={`shrink-0 bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 flex flex-col ${
                        hv ? 'px-6 py-6 gap-4' : 'px-5 py-4 gap-3'
                    }`}>
                        {!hv && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <span>Subtotal</span>
                                    <span>${formatCurrency(totals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <span>IVA ({totals.taxPercent}%)</span>
                                    <span>${formatCurrency(totals.taxAmount)}</span>
                                </div>
                            </div>
                        )}

                        <div className={`flex justify-between items-end ${
                            hv ? '' : 'border-t border-slate-300 dark:border-slate-600 pt-2 mt-2'
                        }`}>
                            <span className={`font-bold text-slate-700 dark:text-slate-300 tracking-tight ${hv ? 'text-2xl' : 'text-sm'}`}>TOTAL</span>
                            <div className="text-right flex flex-col">
                                <span className={`font-black text-violet-700 leading-none ${hv ? 'text-5xl' : 'text-2xl'}`}>
                                    ${formatCurrency(totals.total)}
                                </span>
                                <span className={`font-bold text-slate-500 dark:text-slate-400 ${hv ? 'text-xl mt-1' : 'text-xs mt-1'}`}>
                                    Bs. {formatCurrency(totals.total * exchangeRate)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCheckoutModalOpen(true)}
                            disabled={cartItems.length === 0 || isProcessing}
                            className={`w-full font-black tracking-wider transition-all
                                bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700
                                text-white shadow-xl shadow-violet-200/50 flex justify-center items-center gap-2
                                border border-violet-500 active:scale-[0.98]
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 disabled:from-slate-400 disabled:to-slate-400 disabled:border-slate-400
                                ${hv
                                    ? 'py-8 rounded-3xl text-2xl'
                                    : 'py-4 rounded-2xl text-sm'
                                }
                            `}
                        >
                            <span className={hv ? 'text-3xl' : 'text-lg leading-none mt-[-2px]'}>💳</span>
                            <span>COBRAR TICKET</span>
                            <span className={`font-bold opacity-60 bg-black/10 rounded ${
                                hv ? 'ml-3 text-sm px-2 py-1' : 'ml-2 text-[10px] px-1.5 py-0.5'
                            }`}>[F12]</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* ── Mobile Cart FAB (Floating Action Button) ──────────── */}
            <button
                onClick={() => setMobileCartOpen(!mobileCartOpen)}
                className={`md:hidden fixed bottom-6 right-6 z-30 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white font-black text-lg transition-all active:scale-90 print:hidden ${
                    cartItems.length > 0
                    ? 'bg-gradient-to-br from-violet-600 to-indigo-600 animate-pulse'
                    : 'bg-slate-700'
                }`}
            >
                🛒
                {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                        {totals.itemCount}
                    </span>
                )}
            </button>
            {/* Mobile Cart Overlay */}
            {mobileCartOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 z-10 print:hidden"
                    onClick={() => setMobileCartOpen(false)}
                />
            )}

            {/* ── Modals ──────────────────────────────────────────────── */}
            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                total={totals.total}
                exchangeRate={exchangeRate}
                onClose={() => setIsCheckoutModalOpen(false)}
                onConfirm={processCheckout}
                isProcessing={isProcessing}
                enableCreditSales={enableCreditSales}
            />

            {completedSale && (
                <SuccessModal sale={completedSale} onClose={() => setCompletedSale(null)} exchangeRate={exchangeRate} />
            )}

            {/* Global Styles */}
            <style dangerouslySetInnerHTML={{__html: `
                .scroller::-webkit-scrollbar { width: 6px; }
                .scroller::-webkit-scrollbar-track { background: transparent; }
                .scroller::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
                .scroller:hover::-webkit-scrollbar-thumb { background-color: #94a3b8; }
                .fade-in { animation: fadeIn 0.2s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
};
