import React, { useState, useEffect } from 'react';
import { useSettingsContext } from '../../contexts/SettingsProvider';
import { GLOBAL_SEASONAL_THEME } from '../../config/theme';

interface DisplayCartItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
}

interface DisplayTotals {
    subtotal: number;
    taxAmount: number;
    total: number;
    taxPercent: number;
    itemCount: number;
}

export const CustomerDisplayPage: React.FC = () => {
    const { company, exchangeRate: settingsExchangeRate } = useSettingsContext();
    const [cartItems, setCartItems] = useState<DisplayCartItem[]>([]);
    const [totals, setTotals] = useState<DisplayTotals>({
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        taxPercent: 16,
        itemCount: 0,
    });
    const [exchangeRate, setExchangeRate] = useState<number>(settingsExchangeRate || 0);
    const [storeName, setStoreName] = useState<string>(company || 'Merx POS');
    const [saleSuccess, setSaleSuccess] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    // Reloj digital en vivo
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // Sincronizar nombre de tienda y tasa de configuración si no hay eventos
    useEffect(() => {
        if (company) setStoreName(company);
        if (settingsExchangeRate) setExchangeRate(settingsExchangeRate);
    }, [company, settingsExchangeRate]);

    // Escuchar mensajes del punto de venta en tiempo real (BroadcastChannel)
    useEffect(() => {
        if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

        const channel = new BroadcastChannel('merx_customer_display');

        channel.onmessage = (event) => {
            const data = event.data;
            if (!data) return;

            if (data.type === 'CART_UPDATE') {
                setCartItems(data.items || []);
                if (data.totals) setTotals(data.totals);
                if (data.exchangeRate) setExchangeRate(data.exchangeRate);
                if (data.company) setStoreName(data.company);
                setSaleSuccess(false);
            } else if (data.type === 'SALE_COMPLETED') {
                setSaleSuccess(true);
                setCartItems([]);
                if (data.total) {
                    setTotals(prev => ({ ...prev, total: data.total }));
                }
                // Regresar a pantalla de espera después de 6 segundos
                setTimeout(() => {
                    setSaleSuccess(false);
                }, 6000);
            } else if (data.type === 'CLEAR_CART') {
                setCartItems([]);
                setTotals({
                    subtotal: 0,
                    taxAmount: 0,
                    total: 0,
                    taxPercent: 16,
                    itemCount: 0,
                });
                setSaleSuccess(false);
            }
        };

        return () => {
            channel.close();
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
                setIsFullscreen(false);
            }
        }
    };

    const hasItems = cartItems.length > 0;

    return (
        <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden relative">
            {/* ── Fondos ambientales animados (Aurora Glow por GPU) ── */}
            <div
                className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none animate-pulse ${
                    GLOBAL_SEASONAL_THEME === 'christmas'
                        ? 'bg-red-600/20'
                        : 'bg-violet-600/25'
                }`}
                style={{ animationDuration: '8s' }}
            />
            <div
                className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none animate-pulse ${
                    GLOBAL_SEASONAL_THEME === 'christmas'
                        ? 'bg-emerald-600/20'
                        : 'bg-indigo-600/25'
                }`}
                style={{ animationDuration: '11s' }}
            />
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none bg-sky-500/10"
                style={{ animationDuration: '15s' }}
            />

            {/* ── Barra superior (Header) ── */}
            <header className="p-6 flex items-center justify-between border-b border-slate-800/80 backdrop-blur-md bg-slate-900/40 relative z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-2xl shadow-lg shadow-violet-600/30 font-black">
                        {GLOBAL_SEASONAL_THEME === 'christmas' ? '🎄' : '🛍️'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">{storeName}</h1>
                        <p className="text-xs text-slate-400 font-semibold tracking-wide flex items-center gap-2">
                            <span>● Visor de Atención al Cliente</span>
                            {GLOBAL_SEASONAL_THEME === 'christmas' && <span className="text-red-400 font-bold">· Edición Navideña ✨</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Tasa BCV */}
                    {exchangeRate > 0 && (
                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-sm">
                            <span className="text-xs uppercase font-black text-emerald-400 tracking-wider">Tasa BCV:</span>
                            <span className="text-base font-black text-white">Bs. {exchangeRate.toFixed(2)}</span>
                        </div>
                    )}

                    {/* Reloj Digital */}
                    <div className="hidden sm:flex items-center px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 font-mono text-sm text-slate-300">
                        {currentTime}
                    </div>

                    {/* Botón Pantalla Completa */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    >
                        {isFullscreen ? '✕' : '⛶'}
                    </button>
                </div>
            </header>

            {/* ── Contenido Principal ── */}
            <main className="flex-1 p-6 md:p-8 flex flex-col justify-center items-center relative z-10 overflow-hidden">
                {saleSuccess ? (
                    /* ── Estado: Venta Exitosa ── */
                    <div className="text-center max-w-xl p-10 bg-slate-900/90 border border-emerald-500/40 rounded-3xl shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse" />
                        <div className="relative inline-flex items-center justify-center mb-6">
                            <span className="absolute w-28 h-28 rounded-full bg-emerald-500/30 animate-ping" style={{ animationDuration: '2s' }} />
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-5xl shadow-xl shadow-emerald-500/30">
                                ✨
                            </div>
                        </div>
                        <h2 className="text-4xl font-black mb-3 tracking-tight">¡Muchas gracias por su compra!</h2>
                        <p className="text-slate-300 text-lg mb-6">Ha sido un placer atenderle en <strong>{storeName}</strong>.</p>
                        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 inline-block px-8">
                            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Monto Cancelado</span>
                            <span className="text-3xl font-black text-emerald-400">${totals.total.toFixed(2)}</span>
                            {exchangeRate > 0 && (
                                <span className="text-sm font-bold text-slate-400 block mt-0.5">
                                    ≈ Bs. {(totals.total * exchangeRate).toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>
                ) : hasItems ? (
                    /* ── Estado: Cobro en curso (Lista de artículos y Total) ── */
                    <div className="w-full h-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Lista de productos escaneados */}
                        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md flex flex-col overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                                <h2 className="text-lg font-black flex items-center gap-2 text-slate-200">
                                    <span>🛒</span> Artículos en su compra
                                </h2>
                                <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                                    {totals.itemCount} {totals.itemCount === 1 ? 'producto' : 'productos'}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {cartItems.map((item, idx) => (
                                    <div
                                        key={item.id + idx}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors"
                                    >
                                        <div className="flex-1 pr-4">
                                            <p className="font-bold text-base text-white">{item.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {item.quantity} x ${item.price.toFixed(2)}
                                                {exchangeRate > 0 && ` (Bs. ${(item.price * exchangeRate).toFixed(2)})`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-violet-400">${item.total.toFixed(2)}</p>
                                            {exchangeRate > 0 && (
                                                <p className="text-xs font-medium text-slate-400">
                                                    Bs. {(item.total * exchangeRate).toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tarjeta de TOTAL destacado */}
                        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-900/90 border-2 border-violet-500/50 rounded-3xl p-8 backdrop-blur-md flex flex-col justify-between shadow-2xl shadow-violet-500/10">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/40 text-violet-300 text-xs font-black mb-6">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>EN CAJA</span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</h3>
                                <div className="text-6xl sm:text-7xl font-black text-white tracking-tight mb-2">
                                    ${totals.total.toFixed(2)}
                                </div>
                                {exchangeRate > 0 && (
                                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                                        Bs. {(totals.total * exchangeRate).toFixed(2)}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-6 border-t border-slate-800 text-sm">
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal</span>
                                    <span className="font-bold text-white">${totals.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>IVA ({totals.taxPercent}%)</span>
                                    <span className="font-bold text-white">${totals.taxAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Estado: Modo Espera / Reposo (Fondo Dinámico + Bienvenida) ── */
                    <div className="text-center max-w-2xl px-6 py-12 relative">
                        {/* Dibujo animado flotante de bienvenida */}
                        <div className="relative inline-flex items-center justify-center mb-8">
                            <div
                                className="w-28 h-28 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-pink-500 shadow-2xl shadow-violet-600/40 flex items-center justify-center text-5xl"
                                style={{
                                    animation: 'customerFloat 4s ease-in-out infinite',
                                }}
                            >
                                {GLOBAL_SEASONAL_THEME === 'christmas' ? '🎄' : '✨'}
                            </div>
                        </div>

                        <h2 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 drop-shadow-md">
                            ¡Bienvenidos!
                        </h2>
                        <p className="text-xl sm:text-2xl font-light text-slate-300 mb-8 max-w-lg mx-auto leading-relaxed">
                            En <strong className="font-bold text-white">{storeName}</strong> es un verdadero gusto atenderle.
                        </p>

                        <div className="inline-flex flex-wrap items-center justify-center gap-4 p-4 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-xl">
                            <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold px-3 py-1">
                                <span>💵</span> Divisas $
                            </div>
                            <span className="text-slate-700">|</span>
                            <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold px-3 py-1">
                                <span>📱</span> Pago Móvil
                            </div>
                            <span className="text-slate-700">|</span>
                            <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold px-3 py-1">
                                <span>💳</span> Punto de Venta
                            </div>
                            <span className="text-slate-700">|</span>
                            <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold px-3 py-1">
                                <span>💰</span> Efectivo Bs.
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Estilo CSS inyectado para la animación flotante suave */}
            <style>
                {`
                @keyframes customerFloat {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-14px) rotate(4deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                `}
            </style>
        </div>
    );
};
