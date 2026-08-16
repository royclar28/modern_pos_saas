import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Search, Store as StoreIcon, MessageCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface CatalogItem {
    id: string;
    name: string;
    description: string | null;
    unit_price: number;
    category?: { id: string; name: string };
    brand?: { id: string; name: string };
    sell_by: 'unit' | 'weight';
    unit_label?: string;
}

interface StoreInfo {
    id: string;
    name: string;
    whatsapp_number: string | null;
    logo_url: string | null;
    primary_color: string | null;
}

interface CartItem {
    item: CatalogItem;
    quantity: number;
}

export const CatalogPage = () => {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [store, setStore] = useState<StoreInfo | null>(null);
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                const res = await fetch(`${apiUrl}/catalog/${tenantId}`);
                if (!res.ok) {
                    throw new Error('Catálogo no encontrado o no disponible.');
                }
                const data = await res.json();
                setStore(data.store);
                setItems(data.items);
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

    const filteredItems = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return items;
        return items.filter(
            (i) =>
                i.name.toLowerCase().includes(q) ||
                (i.description && i.description.toLowerCase().includes(q)) ||
                (i.category?.name && i.category.name.toLowerCase().includes(q)) ||
                (i.brand?.name && i.brand.name.toLowerCase().includes(q))
        );
    }, [items, searchQuery]);

    const addToCart = (item: CatalogItem) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.item.id === item.id);
            if (existing) {
                return prev.map((c) =>
                    c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                );
            }
            return [...prev, { item, quantity: 1 }];
        });
        // Feedback visual
        const toast = document.createElement('div');
        toast.textContent = `Añadido: ${item.name}`;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10b981',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontWeight: '600',
            fontSize: '14px',
            zIndex: '9999',
            transition: 'opacity 0.3s',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        });
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((c) =>
                    c.item.id === itemId ? { ...c, quantity: c.quantity + delta } : c
                )
                .filter((c) => c.quantity > 0)
        );
    };

    const cartTotal = cart.reduce(
        (sum, c) => sum + c.item.unit_price * c.quantity,
        0
    );

    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    const sendOrderWhatsApp = () => {
        if (!store?.whatsapp_number) {
            alert('Esta tienda no tiene un número de WhatsApp configurado.');
            return;
        }

        let message = `*Nuevo Pedido - ${store.name}*\n\n`;
        cart.forEach((c) => {
            message += `- ${c.quantity}x ${c.item.name} ($${c.item.unit_price.toFixed(2)})\n`;
        });
        message += `\n*Total:* $${cartTotal.toFixed(2)}\n\n`;
        message += `Hola, me gustaría hacer este pedido.`;

        const encodedMessage = encodeURIComponent(message);
        // Limpiar número (quitar +, espacios, etc)
        const phone = store.whatsapp_number.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <StoreIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        Catálogo no disponible
                    </h1>
                    <p className="text-slate-500">{error || 'La tienda no existe.'}</p>
                </div>
            </div>
        );
    }

    const primaryColor = store.primary_color || '#7c3aed';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24">
            {/* Header */}
            <header
                className="bg-white shadow-sm sticky top-0 z-40 transition-all duration-300"
                style={{ borderBottom: `4px solid ${primaryColor}` }}
            >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} className="h-10 w-10 object-contain rounded-lg" />
                        ) : (
                            <div
                                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {store.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <h1 className="text-xl font-bold text-slate-800 truncate">
                            {store.name}
                        </h1>
                    </div>

                    {store.whatsapp_number && (
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ShoppingCart className="w-6 h-6" />
                            {cartCount > 0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </header>

            {/* Search */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="relative max-w-xl mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border-none rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-opacity-50 transition-shadow"
                        style={{ focusRingColor: primaryColor }}
                    />
                </div>
            </div>

            {/* Products Grid */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-lg">No se encontraron productos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col border border-slate-100/50"
                            >
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-slate-800 leading-tight">
                                            {item.name}
                                        </h3>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 shrink-0 ml-2">
                                            ${item.unit_price.toFixed(2)}
                                        </span>
                                    </div>

                                    {(item.category?.name || item.brand?.name) && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {item.category?.name && (
                                                <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                    {item.category.name}
                                                </span>
                                            )}
                                            {item.brand?.name && (
                                                <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                    {item.brand.name}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {item.description && (
                                        <p className="text-sm text-slate-500 line-clamp-2 flex-1">
                                            {item.description}
                                        </p>
                                    )}
                                </div>

                                {store.whatsapp_number && (
                                    <div className="p-4 pt-0 mt-auto">
                                        <button
                                            onClick={() => addToCart(item)}
                                            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            Añadir al Carrito
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Cart Modal / Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
                    <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-left">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">Tu Pedido</h2>
                            <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-12">
                                    <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500">Tu carrito está vacío.</p>
                                </div>
                            ) : (
                                cart.map((c) => (
                                    <div key={c.item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                                        <div className="flex-1 pr-4">
                                            <h4 className="font-semibold text-slate-800 text-sm leading-tight">{c.item.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">${c.item.unit_price.toFixed(2)} c/u</p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm">
                                                <button onClick={() => updateQuantity(c.item.id, -1)} className="px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-l-lg transition-colors">-</button>
                                                <span className="px-2 py-1 text-sm font-medium w-8 text-center">{c.quantity}</span>
                                                <button onClick={() => updateQuantity(c.item.id, 1)} className="px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-r-lg transition-colors">+</button>
                                            </div>
                                            <div className="text-right w-16 font-bold text-slate-800 text-sm">
                                                ${(c.item.unit_price * c.quantity).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-slate-100 p-6 bg-slate-50">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-600 font-medium">Total Estimado</span>
                                <span className="text-2xl font-bold text-slate-800">${cartTotal.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={sendOrderWhatsApp}
                                disabled={cart.length === 0}
                                className={clsx(
                                    "w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-sm text-base font-bold text-white transition-all",
                                    cart.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-[#25D366] hover:bg-[#128C7E] hover:shadow-md"
                                )}
                            >
                                <MessageCircle className="w-5 h-5 mr-2" />
                                Enviar por WhatsApp
                            </button>
                            <p className="text-center text-xs text-slate-400 mt-3">
                                El pago y entrega se coordinan con la tienda
                            </p>
                        </div>
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
