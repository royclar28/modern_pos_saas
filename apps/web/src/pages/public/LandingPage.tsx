import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { Zap, ShieldCheck, BarChart3, MonitorSmartphone, Smartphone, Terminal, Globe } from 'lucide-react';

export const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
            {/* Header / Nav */}
            <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-violet-600 flex items-center justify-center text-white font-bold text-xl">
                        M
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">MerxPOS</span>
                </div>
                <nav>
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors shadow-sm">
                            Ir al Dashboard
                        </Link>
                    ) : (
                        <Link to="/login" className="px-5 py-2.5 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold transition-colors shadow-sm">
                            Iniciar Sesión
                        </Link>
                    )}
                </nav>
            </header>

            {/* Hero Section */}
            <main className="px-4">
                <section className="py-20 max-w-5xl mx-auto text-center">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                        Gestiona tu inventario y factura <br className="hidden md:block" />
                        <span className="text-violet-600 dark:text-violet-400">sin depender del internet.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto font-medium">
                        Rápido, seguro y 100% offline. Para tu negocio sin interrupciones.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        {isAuthenticated ? (
                            <Link to="/dashboard" className="px-8 py-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg transition-all shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:-translate-y-0.5">
                                Ir al Dashboard
                            </Link>
                        ) : (
                            <Link to="/register" className="px-8 py-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg transition-all shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:-translate-y-0.5">
                                Crear tu Punto de Venta Gratis
                            </Link>
                        )}
                    </div>
                </section>

                {/* Beneficios */}
                <section className="py-16 max-w-6xl mx-auto border-t border-slate-200 dark:border-slate-800">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="w-14 h-14 mx-auto bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-6">
                                <Zap size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Velocidad</h3>
                            <p className="text-slate-600 dark:text-slate-400">Factura en 3 segundos. Interfaz optimizada para que las filas de tu negocio avancen rápido.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="w-14 h-14 mx-auto bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-6">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Resiliencia</h3>
                            <p className="text-slate-600 dark:text-slate-400">Funciona sin internet. Tus datos se sincronizan automáticamente cuando vuelve la conexión.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="w-14 h-14 mx-auto bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6">
                                <BarChart3 size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Control</h3>
                            <p className="text-slate-600 dark:text-slate-400">Cuadre de caja exacto, historial de turnos y reportes detallados en tiempo real.</p>
                        </div>
                    </div>
                </section>

                {/* Vitrina Digital */}
                <section className="py-20 max-w-5xl mx-auto">
                    <div className="bg-slate-900 dark:bg-black rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                            <div className="flex-1">
                                <h2 className="text-3xl md:text-4xl font-black mb-4 flex items-center gap-3 flex-wrap">
                                    Tus clientes también podrán ver tu catálogo de productos online
                                    <span className="text-sm px-2 py-1 bg-violet-600 text-white rounded-lg font-bold shadow-sm whitespace-nowrap">🚀 Próximamente</span>
                                </h2>
                                <p className="text-slate-300 text-lg mb-6">
                                    Con nuestra Vitrina Digital integrada, tu catálogo se publica automáticamente. Recibe pedidos por WhatsApp y aumenta tus ventas.
                                </p>
                            </div>
                            <div className="flex-1 w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                                <div className="text-center font-bold text-lg mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                                    🏪 Ferretería El Sol
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-3 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl">
                                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-600 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">🔨</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-sm">Martillo Truper</div>
                                            <div className="text-violet-600 dark:text-violet-400 font-black text-sm mt-1">$12.50</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl">
                                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-600 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">🔩</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-sm">Tornillo 2" (Caja)</div>
                                            <div className="text-violet-600 dark:text-violet-400 font-black text-sm mt-1">$5.00</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Multiplataforma */}
                <section className="py-16 max-w-5xl mx-auto text-center mb-10">
                    <h2 className="text-3xl font-black mb-10">Disponible en todos tus dispositivos</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a
                            href="https://github.com/royclar28/modern_pos_saas/releases/latest/download/MerxPOS-Installer.msi"
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-500 hover:shadow-lg hover:-translate-y-1 transition-all group"
                        >
                            <MonitorSmartphone className="w-12 h-12 mb-3 text-slate-400 group-hover:text-violet-600 transition-colors" />
                            <span className="font-bold text-center">Windows (.msi)</span>
                        </a>
                        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed">
                            <Terminal className="w-12 h-12 mb-3 text-slate-400" />
                            <span className="font-bold text-center">Linux (.deb)</span>
                            <span className="text-xs text-slate-500 mt-2 font-semibold">⏳ Próximamente</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed">
                            <Smartphone className="w-12 h-12 mb-3 text-slate-400" />
                            <span className="font-bold text-center">Android (APK)</span>
                            <span className="text-xs text-slate-500 mt-2 font-semibold">⏳ Próximamente</span>
                        </div>
                        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-500 transition-colors group">
                            <Globe className="w-12 h-12 mb-3 text-slate-400 group-hover:text-violet-600 transition-colors" />
                            <span className="font-bold text-center">Usar Versión Web</span>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
};
