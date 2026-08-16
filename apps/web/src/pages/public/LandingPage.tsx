import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import {
    Zap, ShieldCheck, BarChart3, WifiOff, CheckCircle2, ArrowRight,
    Github, Twitter, Mail, Package, Printer, TrendingUp, ChevronLeft, ChevronRight,
    Store, ShoppingCart, Gift, Settings2
} from 'lucide-react';
import { ThemeManager } from '../../components/themes/ThemeManager';

// ── Carrusel de screenshots ───────────────────────────────────────────────────
const screenshots = [
    { src: '/vista_principal_dark2.png', label: 'Dashboard Principal', desc: 'Visión global de tu negocio en tiempo real' },
    { src: '/venta.png',                 label: 'Punto de Venta',       desc: 'Cobra rápido con escaneo de códigos de barra' },
    { src: '/inventario.png',            label: 'Inventario',           desc: 'Gestiona productos, stock y precios' },
    { src: '/metricas.png',              label: 'Reporte Z / Arqueo',   desc: 'Cuadre de caja por método de pago' },
    { src: '/sorteos.png',               label: 'Sorteos en Vivo',      desc: 'Fideliza clientes con sorteos transmitidos' },
    { src: '/ajuste2.png',               label: 'Configuración',        desc: 'Personaliza IVA, moneda, tema y marca' },
];

const ScreenshotCarousel: React.FC = () => {
    const [active, setActive] = useState(0);
    const prev = () => setActive(i => (i - 1 + screenshots.length) % screenshots.length);
    const next = () => setActive(i => (i + 1) % screenshots.length);

    return (
        <div className="relative w-full">
            {/* Imagen principal */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-violet-900/40 border border-slate-700 aspect-video bg-slate-900">
                <img
                    src={screenshots[active].src}
                    alt={screenshots[active].label}
                    className="w-full h-full object-cover transition-opacity duration-300"
                />
                {/* Overlay label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-4">
                    <p className="text-white font-black text-lg">{screenshots[active].label}</p>
                    <p className="text-slate-300 text-sm">{screenshots[active].desc}</p>
                </div>
                {/* Nav buttons */}
                <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
                    <ChevronLeft size={20} />
                </button>
                <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {screenshots.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all w-20 h-12 ${i === active ? 'border-violet-500 opacity-100 scale-105' : 'border-slate-700 opacity-50 hover:opacity-80'}`}
                    >
                        <img src={s.src} alt={s.label} className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>
        </div>
    );
};

// ── Feature Card ─────────────────────────────────────────────────────────────
const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    desc: string;
    screenshot: string;
    screenshotAlt: string;
    reverse?: boolean;
    tag?: string;
}> = ({ icon, title, desc, screenshot, screenshotAlt, reverse, tag }) => (
    <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 items-center`}>
        <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 rounded-full px-4 py-1.5 text-sm font-bold">
                {icon}
                {tag && <span className="ml-1 text-xs bg-emerald-500 text-white rounded-full px-2 py-0.5">{tag}</span>}
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">{desc}</p>
        </div>
        <div className="flex-1 w-full max-w-xl">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-700">
                <img src={screenshot} alt={screenshotAlt} className="w-full h-auto object-cover" />
            </div>
        </div>
    </div>
);

// ── Landing Page ──────────────────────────────────────────────────────────────
export const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans flex flex-col">
            <ThemeManager />

            {/* ── Navbar ──────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">M</div>
                        <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">MerxPOS</span>
                    </div>
                    <nav className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <Link to="/dashboard" className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors shadow-sm text-sm">
                                Ir al Dashboard →
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 font-medium text-sm transition-colors">
                                    Iniciar Sesión
                                </Link>
                                <Link to="/register" className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors shadow-sm text-sm">
                                    Empezar Gratis
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="flex-grow">

                {/* ── Hero ────────────────────────────────────────────────── */}
                <section className="py-16 md:py-24 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-14">
                    {/* Text */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-bold text-sm mb-6 border border-violet-200 dark:border-violet-800">
                            🚀 El POS hecho para Venezuela y Latinoamérica
                        </div>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                            Vende, controla y{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-500">crece sin límites.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0">
                            El Punto de Venta más rápido para tu tienda. Factura, gestiona inventario, cuadra caja y organiza sorteos, incluso{' '}
                            <strong className="text-slate-800 dark:text-slate-200">sin internet</strong>.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                            {isAuthenticated ? (
                                <Link to="/dashboard" className="px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-lg transition-all shadow-lg shadow-violet-600/30 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                    Ir al Dashboard <ArrowRight size={20} />
                                </Link>
                            ) : (
                                <>
                                    <Link to="/register" className="px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-lg transition-all shadow-lg shadow-violet-600/30 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                        30 días gratis <ArrowRight size={20} />
                                    </Link>
                                    <Link to="/login" className="px-8 py-4 rounded-full border-2 border-slate-300 dark:border-slate-700 hover:border-violet-400 text-slate-700 dark:text-slate-300 font-bold text-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                        Iniciar Sesión
                                    </Link>
                                </>
                            )}
                        </div>
                        {/* Social proof */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 justify-center lg:justify-start text-sm text-slate-500">
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> Sin tarjeta de crédito</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> Funciona offline</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> Multi-dispositivo</span>
                        </div>
                    </div>

                    {/* Screenshot carousel */}
                    <div className="flex-1 w-full max-w-2xl">
                        <ScreenshotCarousel />
                    </div>
                </section>

                {/* ── Diseñado para ───────────────────────────────────────── */}
                <section className="py-10 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                    <div className="max-w-6xl mx-auto px-6 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Diseñado para tu tipo de negocio</p>
                        <div className="flex flex-wrap justify-center gap-8">
                            {[
                                { icon: <Store size={18} className="text-violet-500" />, label: 'Minimarkets' },
                                { icon: <Package size={18} className="text-emerald-500" />, label: 'Ferreterías' },
                                { icon: <ShoppingCart size={18} className="text-amber-500" />, label: 'Boutiques' },
                                { icon: <ShieldCheck size={18} className="text-blue-500" />, label: 'Farmacias' },
                                { icon: <Printer size={18} className="text-pink-500" />, label: 'Licorerías' },
                                { icon: <Gift size={18} className="text-rose-500" />, label: 'Tiendas de Ropa' },
                            ].map(({ icon, label }) => (
                                <div key={label} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                    {icon} {label}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Features con screenshots reales ─────────────────────── */}
                <section className="py-24 max-w-6xl mx-auto px-6 space-y-28">
                    <FeatureCard
                        icon={<><Zap size={16} /> Punto de Venta</>}
                        title="Cobra en segundos, no en minutos."
                        desc="Interface diseñada para velocidad. Escanea con código de barras, busca por nombre, aplica descuentos y cobra en múltiples métodos de pago — todo desde una sola pantalla."
                        screenshot="/venta.png"
                        screenshotAlt="Pantalla del Punto de Venta de MerxPOS"
                    />

                    <FeatureCard
                        icon={<><Package size={16} /> Inventario</>}
                        title="Tu inventario, siempre al día."
                        desc="Añade productos manualmente o carga facturas de proveedores con IA en segundos. Recibe alertas de stock bajo antes de quedarte sin productos."
                        screenshot="/inventario.png"
                        screenshotAlt="Gestión de Inventario de MerxPOS"
                        reverse
                    />

                    <FeatureCard
                        icon={<><BarChart3 size={16} /> Reportes</>}
                        title="Arqueo de caja al centavo."
                        desc="El Reporte Z desglosa cada venta por método de pago — dólares, bolívares, pago móvil, punto, banco. Cierra tu caja con precisión absoluta todos los días."
                        screenshot="/metricas.png"
                        screenshotAlt="Reporte Z de Caja de MerxPOS"
                    />

                    <FeatureCard
                        icon={<><Gift size={16} /> Sorteos en Vivo</>}
                        title="Fideliza clientes con sorteos en vivo."
                        desc="Crea sorteos, comparte el link con tus participantes y transmite el momento del ganador en tiempo real. Con cuenta regresiva, re-sorteo automático y notificación por WhatsApp."
                        screenshot="/sorteos.png"
                        screenshotAlt="Módulo de Sorteos en Vivo de MerxPOS"
                        reverse
                        tag="Único"
                    />
                </section>

                {/* ── Offline banner ───────────────────────────────────────── */}
                <section className="py-16 bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
                    <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center gap-10">
                        <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                                <WifiOff size={40} className="text-white" />
                            </div>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-black mb-3">¿Se fue el internet? Sigue vendiendo.</h2>
                            <p className="text-violet-200 text-lg">
                                MerxPOS funciona 100% offline. Todo se guarda localmente y se sincroniza automáticamente cuando vuelve la conexión. Sin excusas, sin interrupciones.
                            </p>
                        </div>
                        {!isAuthenticated && (
                            <Link to="/register" className="flex-shrink-0 px-8 py-4 bg-white text-violet-700 font-black rounded-full hover:bg-violet-50 transition-colors shadow-xl text-lg whitespace-nowrap">
                                Probar Gratis →
                            </Link>
                        )}
                    </div>
                </section>

                {/* ── Cómo empezar ─────────────────────────────────────────── */}
                <section className="py-24 max-w-5xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-black mb-4">Empieza en 3 simples pasos</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Sin instalaciones complicadas. Sin contratos forzosos.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-violet-300 to-indigo-300 dark:from-violet-800 dark:to-indigo-800 z-0" />
                        {[
                            { n: '1', color: 'from-violet-500 to-violet-600', title: 'Crea tu cuenta', desc: 'Regístrate con tu email, sin tarjeta de crédito. Tienes 30 días para explorar todo.', img: '/registro.png' },
                            { n: '2', color: 'from-indigo-500 to-indigo-600', title: 'Configura tu tienda', desc: 'Agrega tus productos, pon el nombre de tu negocio y ajusta el IVA y moneda.', img: '/ajuste2.png' },
                            { n: '3', color: 'from-emerald-500 to-emerald-600', title: '¡Empieza a vender!', desc: 'Abre tu caja y atiende a tus clientes desde cualquier dispositivo con internet.', img: '/venta.png' },
                        ].map(({ n, color, title, desc, img }) => (
                            <div key={n} className="relative z-10 text-center group">
                                <div className="w-20 h-20 mx-auto bg-white dark:bg-slate-800 shadow-xl rounded-full flex items-center justify-center mb-6 border-4 border-slate-100 dark:border-slate-700">
                                    <span className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br ${color}`}>{n}</span>
                                </div>
                                <div className="rounded-xl overflow-hidden shadow-md mb-4 border border-slate-200 dark:border-slate-700 group-hover:shadow-lg transition-shadow">
                                    <img src={img} alt={title} className="w-full aspect-video object-cover object-top" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                    {!isAuthenticated && (
                        <div className="text-center mt-14">
                            <Link to="/register" className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xl transition-all shadow-2xl shadow-violet-600/30 hover:-translate-y-1 hover:shadow-violet-600/50">
                                Crear mi cuenta gratis <ArrowRight size={24} />
                            </Link>
                            <p className="text-slate-500 text-sm mt-3">30 días de prueba · Sin tarjeta · Sin compromiso</p>
                        </div>
                    )}
                </section>

                {/* ── Configuración destacada ──────────────────────────────── */}
                <section className="py-16 bg-slate-100 dark:bg-slate-800/50">
                    <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-sm font-bold mb-4">
                                <Settings2 size={16} /> Totalmente configurable
                            </div>
                            <h2 className="text-3xl font-black mb-4 text-slate-900 dark:text-white">Adapta MerxPOS a tu negocio</h2>
                            <ul className="space-y-3">
                                {[
                                    'Nombre, logo y color de tu marca',
                                    'IVA, símbolo de moneda y zona horaria',
                                    'Múltiples cajas (terminales) independientes',
                                    'Control de acceso por roles: Admin, Cajero, Gerente',
                                    'Ventas a crédito (fiados) con cuaderno digital',
                                    'Tema claro u oscuro por equipo',
                                ].map(item => (
                                    <li key={item} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                                        <CheckCircle2 size={18} className="text-violet-500 shrink-0" />
                                        <span className="font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 w-full max-w-xl space-y-3">
                            <div className="rounded-xl overflow-hidden shadow-xl border border-slate-300 dark:border-slate-600">
                                <img src="/ajuste2.png" alt="Configuración del negocio" className="w-full" />
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg">M</div>
                                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">MerxPOS</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                                Transformando la manera en que los negocios venezolanos y latinoamericanos administran sus ventas.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="text-slate-400 hover:text-violet-600 transition-colors"><Twitter size={20} /></a>
                                <a href="https://github.com/royclar28/modern_pos_saas" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-violet-600 transition-colors"><Github size={20} /></a>
                                <a href="mailto:soporte@merxpos.com" className="text-slate-400 hover:text-violet-600 transition-colors"><Mail size={20} /></a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Producto</h4>
                            <ul className="space-y-3 text-sm">
                                {['Características', 'Precios', 'Descargas'].map(l => (
                                    <li key={l}><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Recursos</h4>
                            <ul className="space-y-3 text-sm">
                                {['Centro de Ayuda', 'Guías de inicio', 'Sugerencias'].map(l => (
                                    <li key={l}><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Legal</h4>
                            <ul className="space-y-3 text-sm">
                                {['Términos de Servicio', 'Política de Privacidad'].map(l => (
                                    <li key={l}><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
                        <p>© {new Date().getFullYear()} MerxPOS. Todos los derechos reservados.</p>
                        <p>Hecho con ❤️ para comerciantes</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
