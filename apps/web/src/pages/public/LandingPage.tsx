import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { 
    Zap, ShieldCheck, BarChart3, MonitorSmartphone, Smartphone, Terminal, Globe, 
    Store, ShoppingCart, Package, Printer, TrendingUp, WifiOff, CheckCircle2, ArrowRight,
    Github, Twitter, Mail
} from 'lucide-react';
import { ThemeManager } from '../../components/themes/ThemeManager';

export const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans flex flex-col">
            <ThemeManager />
            {/* Header / Nav */}
            <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
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
            <main className="flex-grow px-4">
                <section className="py-16 md:py-24 max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">
                    <div className="flex-1 text-center lg:text-left">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-bold text-sm mb-6 border border-violet-200 dark:border-violet-800">
                            🚀 La nueva forma de administrar tu negocio
                        </div>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                            Vende, controla y <br className="hidden lg:block" />
                            <span className="text-violet-600 dark:text-violet-400">crece sin límites.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 font-medium">
                            El Punto de Venta más fácil para tu tienda. Factura rápido, gestiona tu inventario y cuadra tu caja al instante, incluso <strong className="text-slate-800 dark:text-slate-200">sin conexión a internet</strong>.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                            {isAuthenticated ? (
                                <Link to="/dashboard" className="px-8 py-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg transition-all shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                    Ir al Dashboard <ArrowRight size={20} />
                                </Link>
                            ) : (
                                <Link to="/register" className="px-8 py-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg transition-all shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                    Empieza Gratis Ahora <ArrowRight size={20} />
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 w-full max-w-lg lg:max-w-none">
                        {/* Placeholder para captura del dashboard */}
                        <div className="relative rounded-2xl bg-slate-800 shadow-2xl border border-slate-700 p-2 overflow-hidden aspect-video flex items-center justify-center group">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-blue-500/20"></div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/30 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="relative z-10 text-center space-y-4 text-slate-400">
                                <MonitorSmartphone size={48} className="mx-auto text-slate-500 opacity-50" />
                                <p className="font-semibold text-sm">[ Aquí irá la captura de tu Dashboard del POS ]</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Nichos - Diseñado para tu negocio */}
                <section className="py-12 border-y border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-8">Diseñado especialmente para:</p>
                        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold"><Store className="text-violet-500" /> Minimarkets</div>
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold"><Package className="text-emerald-500" /> Ferreterías</div>
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold"><ShoppingCart className="text-amber-500" /> Boutiques</div>
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold"><ShieldCheck className="text-blue-500" /> Farmacias</div>
                        </div>
                    </div>
                </section>

                {/* Beneficios Principales */}
                <section className="py-20 max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">Todo lo que necesitas, en un solo lugar</h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">Olvídate de cuadernos y sistemas lentos. MerxPOS te da herramientas profesionales fáciles de usar.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center mb-5">
                                <Package size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Inventario Fácil</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Añade productos, usa códigos de barra y recibe alertas cuando te estés quedando sin stock.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-5">
                                <Printer size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Facturación Rápida</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Atiende más clientes en menos tiempo. Compatible con impresoras térmicas y gavetas de dinero.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-5">
                                <TrendingUp size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Reportes Claros</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Conoce tus ventas diarias, cuadra tu caja al centavo y descubre cuáles son tus productos estrella.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-5">
                                <WifiOff size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Vende Sin Internet</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">¿Se fue el internet? No hay problema. Sigue vendiendo y todo se sincronizará automáticamente después.</p>
                        </div>
                    </div>
                </section>

                {/* Cómo Funciona */}
                <section className="py-20 bg-slate-100 dark:bg-slate-800/50 rounded-3xl max-w-6xl mx-auto mb-20 px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-black mb-4">Empieza en 3 simples pasos</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Línea conectora (visible solo en desktop) */}
                        <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-0.5 bg-slate-200 dark:bg-slate-700 z-0"></div>
                        
                        <div className="relative z-10 text-center">
                            <div className="w-20 h-20 mx-auto bg-white dark:bg-slate-800 border-4 border-violet-100 dark:border-violet-900 shadow-xl rounded-full flex items-center justify-center text-3xl font-black text-violet-600 dark:text-violet-400 mb-6">
                                1
                            </div>
                            <h3 className="text-xl font-bold mb-2">Crea tu cuenta</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">Regístrate en segundos, sin tarjetas de crédito ni contratos forzosos.</p>
                        </div>
                        <div className="relative z-10 text-center">
                            <div className="w-20 h-20 mx-auto bg-white dark:bg-slate-800 border-4 border-emerald-100 dark:border-emerald-900 shadow-xl rounded-full flex items-center justify-center text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-6">
                                2
                            </div>
                            <h3 className="text-xl font-bold mb-2">Sube tus productos</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">Añade tus artículos, precios e inventario inicial de forma masiva o uno por uno.</p>
                        </div>
                        <div className="relative z-10 text-center">
                            <div className="w-20 h-20 mx-auto bg-white dark:bg-slate-800 border-4 border-blue-100 dark:border-blue-900 shadow-xl rounded-full flex items-center justify-center text-3xl font-black text-blue-600 dark:text-blue-400 mb-6">
                                3
                            </div>
                            <h3 className="text-xl font-bold mb-2">¡Empieza a Vender!</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">Abre tu caja y atiende a tus clientes con el sistema más veloz del mercado.</p>
                        </div>
                    </div>
                </section>

                {/* Vitrina Digital (Mantenido y adaptado) */}
                <section className="py-10 max-w-5xl mx-auto mb-20">
                    <div className="bg-slate-900 dark:bg-black rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                            <div className="flex-1">
                                <h2 className="text-3xl md:text-4xl font-black mb-4 flex items-center gap-3 flex-wrap">
                                    Vende también por internet
                                    <span className="text-sm px-2 py-1 bg-violet-600 text-white rounded-lg font-bold shadow-sm whitespace-nowrap">🚀 Próximamente</span>
                                </h2>
                                <p className="text-slate-300 text-lg mb-6">
                                    Tus clientes podrán ver tu catálogo de productos online. Recibe pedidos directamente a tu WhatsApp e intégralos a tu caja.
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-2 text-slate-300"><CheckCircle2 className="text-violet-400" size={20} /> Catálogo siempre actualizado</li>
                                    <li className="flex items-center gap-2 text-slate-300"><CheckCircle2 className="text-violet-400" size={20} /> Sin comisiones por venta</li>
                                </ul>
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
                    <h2 className="text-3xl font-black mb-10">Úsalo en tus dispositivos favoritos</h2>
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
                            <span className="font-bold text-center">Versión Web</span>
                        </Link>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded bg-violet-600 flex items-center justify-center text-white font-bold text-xl">
                                    M
                                </div>
                                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">MerxPOS</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                                Transformando la manera en que los pequeños y medianos negocios administran sus ventas e inventario.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="text-slate-400 hover:text-violet-600 transition-colors"><Twitter size={20} /></a>
                                <a href="https://github.com/royclar28/modern_pos_saas" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-violet-600 transition-colors"><Github size={20} /></a>
                                <a href="mailto:soporte@merxpos.com" className="text-slate-400 hover:text-violet-600 transition-colors"><Mail size={20} /></a>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Producto</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Características</a></li>
                                <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Precios</a></li>
                                <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Vitrina Digital</a></li>
                                <li><a href="https://github.com/royclar28/modern_pos_saas/releases/latest" target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Descargas</a></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Recursos</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Centro de Ayuda</a></li>
                                <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Blog</a></li>
                                <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Guías de inicio</a></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Legal</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Términos de Servicio</a></li>
                                <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-sm transition-colors">Política de Privacidad</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-slate-200 dark:border-slate-800 text-center flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            &copy; {new Date().getFullYear()} MerxPOS. Todos los derechos reservados.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            Hecho con ❤️ para comerciantes
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
