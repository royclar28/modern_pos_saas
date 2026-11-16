import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Search, Store as StoreIcon, MessageCircle, MapPin, Calendar, CreditCard, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface CatalogItem {
    id: string;
    name: string;
    description: string | null;
    unit_price: number;
    stock?: number;
    category?: { id: string; name: string };
    brand?: { id: string; name: string };
    sell_by: 'unit' | 'weight';
    unit_label?: string;
}

interface StoreInfo {
    id: string;
    name: string;
    whatsapp_number: string | null;
    rif?: string | null;
    logo_url: string | null;
    primary_color: string | null;
    currency_symbol?: string;
}

interface CartItem {
    item: CatalogItem;
    quantity: number;
}

export const CatalogPage = () => {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [store, setStore] = useState<StoreInfo | null>(null);
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [exchangeRate, setExchangeRate] = useState<number>(36.5);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Checkout form fields
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryZone, setDeliveryZone] = useState('');
    const [deliveryDay, setDeliveryDay] = useState('Sábado');
    const [paymentMethod, setPaymentMethod] = useState('Pago Móvil');
    const [paymentRef, setPaymentRef] = useState('');
    const [orderNotes, setOrderNotes] = useState('');

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                const res = await fetch(`${apiUrl}/catalog/${tenantId}`);
                if (!res.ok) {
                    throw new Error('Catálogo no encontrado o no disponible.');
                }
                const data = await res.json();
                
                const parsedItems = data.items.map((item: any) => ({
                    ...item,
                    unit_price: Number(item.unit_price) || 0,
                    stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : undefined
                }));
                
                setStore(data.store);
                if (data.exchange_rate) {
                    setExchangeRate(Number(data.exchange_rate) || 36.5);
                }
                setItems(parsedItems);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (tenantId) {
            fetchCatalog();
        }
    }, [tenantId]);

    // Categories list
    const categories = useMemo(() => {
        const set = new Set<string>();
        items.forEach((i) => {
            if (i.category?.name) set.add(i.category.name);
        });
        return Array.from(set);
    }, [items]);

    const filteredItems = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return items.filter((i) => {
            const matchesQuery = !q ||
                i.name.toLowerCase().includes(q) ||
                (i.description && i.description.toLowerCase().includes(q)) ||
                (i.category?.name && i.category.name.toLowerCase().includes(q));
            
            const matchesCat = selectedCategory === 'all' || i.category?.name === selectedCategory;
            return matchesQuery && matchesCat;
        });
    }, [items, searchQuery, selectedCategory]);

    const showToast = (text: string, isError = false) => {
        const toast = document.createElement('div');
        toast.textContent = text;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: isError ? '#ef4444' : '#10b981',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '9999px',
            fontWeight: '600',
            fontSize: '14px',
            zIndex: '9999',
            transition: 'opacity 0.3s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        });
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2200);
    };

    const addToCart = (item: CatalogItem) => {
        const existing = cart.find((c) => c.item.id === item.id);
        const currentQty = existing ? existing.quantity : 0;

        // Check stock availability
        if (item.stock !== undefined && currentQty >= item.stock) {
            showToast(`Solo hay ${item.stock} disponibles de este producto`, true);
            return;
        }

        setCart((prev) => {
            if (existing) {
                return prev.map((c) =>
                    c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                );
            }
            return [...prev, { item, quantity: 1 }];
        });

        showToast(`Agregado: ${item.name}`);
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart((prev) => {
            return prev.map((c) => {
                if (c.item.id !== itemId) return c;
                const newQty = c.quantity + delta;
                if (newQty <= 0) return null as any;

                if (c.item.stock !== undefined && newQty > c.item.stock) {
                    showToast(`Existencia máxima alcanzada (${c.item.stock})`, true);
                    return c;
                }
                return { ...c, quantity: newQty };
            }).filter(Boolean);
        });
    };

    const cartTotal = cart.reduce(
        (sum, c) => sum + c.item.unit_price * c.quantity,
        0
    );

    const cartTotalBs = cartTotal * exchangeRate;
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    const formatBs = (val: number) => {
        return val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const sendOrderWhatsApp = () => {
        if (!store?.whatsapp_number) {
            alert('Esta tienda no tiene un número de WhatsApp configurado.');
            return;
        }
        if (!customerName.trim()) {
            alert('Por favor ingresa tu nombre para el pedido.');
            return;
        }
        if (!deliveryZone.trim()) {
            alert('Por favor indica tu zona o dirección de entrega (ej. Yaritagua, Cambural).');
            return;
        }

        let message = `🍨 *NUEVO PEDIDO - ${store.name.toUpperCase()}*\n`;
        message += `────────────────────────────\n`;
        message += `👤 *Cliente:* ${customerName.trim()}\n`;
        if (customerPhone.trim()) {
            message += `📱 *Teléfono:* ${customerPhone.trim()}\n`;
        }
        message += `📍 *Zona / Entrega:* ${deliveryZone.trim()}\n`;
        message += `📅 *Día de Entrega:* ${deliveryDay}\n`;
        message += `💳 *Método de Pago:* ${paymentMethod}${paymentRef.trim() ? ` (Ref: ${paymentRef.trim()})` : ''}\n`;
        if (orderNotes.trim()) {
            message += `📝 *Nota:* ${orderNotes.trim()}\n`;
        }
        message += `────────────────────────────\n`;
        message += `*DETALLE DEL PEDIDO:*\n`;
        cart.forEach((c) => {
            const itemBs = (c.item.unit_price * c.quantity) * exchangeRate;
            message += `• ${c.quantity}x ${c.item.name} → $${(c.item.unit_price * c.quantity).toFixed(2)} (Bs. ${formatBs(itemBs)})\n`;
        });
        message += `────────────────────────────\n`;
        message += `💰 *TOTAL:* $${cartTotal.toFixed(2)} (Bs. ${formatBs(cartTotalBs)})\n`;
        message += `*(Tasa BCV: Bs. ${formatBs(exchangeRate)})*\n\n`;
        message += `Hola, acabo de realizar este pedido desde su carrito web. ¿Me confirman disponibilidad y entrega?`;

        const encodedMessage = encodeURIComponent(message);
        const phone = store.whatsapp_number.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-3"></div>
                    <p className="text-slate-500 font-medium">Cargando menú y existencias...</p>
                </div>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <StoreIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        Tienda no disponible
                    </h1>
                    <p className="text-slate-500">{error || 'La tienda solicitada no existe o el catálogo está deshabilitado.'}</p>
                </div>
            </div>
        );
    }

    const primaryColor = store.primary_color || '#7c3aed';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-28">
            {/* Header */}
            <header
                className="bg-white shadow-sm sticky top-0 z-40 transition-all"
                style={{ borderBottom: `4px solid ${primaryColor}` }}
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} className="h-10 w-10 object-contain rounded-lg" />
                        ) : (
                            <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {store.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 leading-tight truncate">
                                {store.name}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                Tasa del día: <span className="font-semibold text-slate-700">Bs. {formatBs(exchangeRate)}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
                    >
                        <ShoppingCart className="w-5 h-5 text-slate-700" />
                        {cartCount > 0 && (
                            <span
                                className="px-2 py-0.5 text-xs font-bold text-white rounded-full shadow-sm"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Search and Category Filter */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-3">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar sabor, presentación o producto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 text-sm rounded-2xl bg-white border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    />
                </div>

                {categories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={clsx(
                                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                                selectedCategory === 'all'
                                    ? "text-white shadow-sm"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            )}
                            style={selectedCategory === 'all' ? { backgroundColor: primaryColor } : {}}
                        >
                            Todos
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={clsx(
                                    "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                                    selectedCategory === cat
                                        ? "text-white shadow-sm"
                                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                )}
                                style={selectedCategory === cat ? { backgroundColor: primaryColor } : {}}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Products Grid */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-6">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm mt-4">
                        <p className="text-slate-400 text-base">No hay productos que coincidan con la búsqueda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredItems.map((item) => {
                            const isOutOfStock = item.stock !== undefined && item.stock <= 0;
                            const cartQty = cart.find(c => c.item.id === item.id)?.quantity || 0;
                            const bsPrice = item.unit_price * exchangeRate;

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-slate-100 flex flex-col justify-between p-4"
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                            <h3 className="text-base font-bold text-slate-800 leading-snug">
                                                {item.name}
                                            </h3>
                                            <div className="text-right shrink-0">
                                                <div className="text-base font-extrabold text-slate-900">
                                                    ${item.unit_price.toFixed(2)}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                    Bs. {formatBs(bsPrice)}
                                                </div>
                                            </div>
                                        </div>

                                        {item.category?.name && (
                                            <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mb-2">
                                                {item.category.name}
                                            </span>
                                        )}

                                        {item.description && (
                                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-3">
                                        {/* Stock badge */}
                                        <div>
                                            {isOutOfStock ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                                    <AlertCircle className="w-3 h-3" /> Agotado
                                                </span>
                                            ) : item.stock !== undefined ? (
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md",
                                                    item.stock <= 3 ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50"
                                                )}>
                                                    <CheckCircle className="w-3 h-3" />
                                                    {item.stock <= 3 ? `¡Solo ${item.stock} disponibles!` : `${item.stock} disponibles`}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-medium text-emerald-600">
                                                    Disponible
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        {isOutOfStock ? (
                                            <button
                                                disabled
                                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
                                            >
                                                Agotado
                                            </button>
                                        ) : cartQty > 0 ? (
                                            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="w-7 h-7 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-center text-xs font-bold text-slate-800">
                                                    {cartQty}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center shadow-sm transition-colors"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-95 transition-all"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                Pedir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Bottom Floating Bar when cart has items */}
            {cartCount > 0 && !isCartOpen && (
                <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full shadow-xl rounded-2xl p-3.5 text-white flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <ShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-medium text-white/90">
                                    {cartCount} {cartCount === 1 ? 'producto' : 'productos'} en el carrito
                                </div>
                                <div className="text-base font-extrabold leading-tight">
                                    ${cartTotal.toFixed(2)} · <span className="text-xs font-normal">Bs. {formatBs(cartTotalBs)}</span>
                                </div>
                            </div>
                        </div>

                        <span className="bg-white text-slate-900 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm">
                            Ver Pedido →
                        </span>
                    </button>
                </div>
            )}

            {/* Cart Drawer / Modal with Delivery Checkout */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsCartOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-left">
                        {/* Drawer Header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-slate-700" />
                                <h2 className="text-lg font-bold text-slate-800">Resumen de tu Pedido</h2>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-2xl leading-none p-1"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {cart.length === 0 ? (
                                <div className="text-center py-16">
                                    <ShoppingCart className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Tu carrito está vacío.</p>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="mt-4 px-4 py-2 text-xs font-bold text-white rounded-xl"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        Explorar Helados
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Items List */}
                                    <div className="space-y-2.5">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Productos Seleccionados
                                        </h3>
                                        {cart.map((c) => (
                                            <div
                                                key={c.item.id}
                                                className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100"
                                            >
                                                <div className="flex-1 pr-3">
                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">
                                                        {c.item.name}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        ${c.item.unit_price.toFixed(2)} c/u
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm">
                                                        <button
                                                            onClick={() => updateQuantity(c.item.id, -1)}
                                                            className="px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-l-lg transition-colors font-bold text-sm"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="px-2 py-1 text-xs font-bold w-7 text-center">
                                                            {c.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateQuantity(c.item.id, 1)}
                                                            className="px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-r-lg transition-colors font-bold text-sm"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <div className="text-right w-16 font-extrabold text-slate-800 text-sm">
                                                        ${(c.item.unit_price * c.quantity).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Delivery and Customer Details Form */}
                                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-3.5">
                                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-slate-500" />
                                            Datos para la Entrega
                                        </h3>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Tu Nombre o Quién Recibe *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej. Rusmary, Karla Herrera..."
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                                <Phone className="w-3 h-3 text-slate-400" /> Teléfono de Contacto
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="Ej. 0416-1234567"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-slate-400" /> Zona / Lugar *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Ej. Yaritagua, Cambural"
                                                    value={deliveryZone}
                                                    onChange={(e) => setDeliveryZone(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" /> Día de Entrega
                                                </label>
                                                <select
                                                    value={deliveryDay}
                                                    onChange={(e) => setDeliveryDay(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 font-medium"
                                                >
                                                    <option value="Sábado">Sábado</option>
                                                    <option value="Viernes">Viernes</option>
                                                    <option value="Domingo">Domingo</option>
                                                    <option value="Hoy / Inmediato">Hoy / Inmediato</option>
                                                    <option value="Otro día">Otro día</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Payment method */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                                <CreditCard className="w-3 h-3 text-slate-400" /> Forma de Pago
                                            </label>
                                            <div className="grid grid-cols-3 gap-1.5 text-xs">
                                                {['Pago Móvil', 'Efectivo $', 'Efectivo Bs'].map((method) => (
                                                    <button
                                                        key={method}
                                                        type="button"
                                                        onClick={() => setPaymentMethod(method)}
                                                        className={clsx(
                                                            "py-1.5 px-2 rounded-lg font-semibold border transition-all text-center",
                                                            paymentMethod === method
                                                                ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>

                                            {paymentMethod === 'Pago Móvil' && (
                                                <div className="mt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Nº Referencia o comprobante (últimos 4 dígitos)"
                                                        value={paymentRef}
                                                        onChange={(e) => setPaymentRef(e.target.value)}
                                                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Nota o detalle (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ej. entregar en la tarde..."
                                                value={orderNotes}
                                                onChange={(e) => setOrderNotes(e.target.value)}
                                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        {cart.length > 0 && (
                            <div className="border-t border-slate-100 p-5 bg-slate-50 space-y-3">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-xs text-slate-500 font-semibold uppercase">Total en Divisa</span>
                                        <span className="text-xl font-extrabold text-slate-900">${cartTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-xs text-slate-500 font-medium">Equivalente BCV</span>
                                        <span className="text-sm font-bold text-slate-700">Bs. {formatBs(cartTotalBs)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={sendOrderWhatsApp}
                                    className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#25D366] hover:bg-[#128C7E] active:scale-[0.99] transition-all"
                                >
                                    <MessageCircle className="w-5 h-5 mr-2" />
                                    Enviar Pedido por WhatsApp
                                </button>
                                <p className="text-center text-[11px] text-slate-400">
                                    Se abrirá WhatsApp con el pedido listo para enviar a la tienda.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideLeft {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-left {
                    animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
};
export default CatalogPage;
