import React, { useEffect, useState } from 'react';

interface HalloweenThemeProps {
    isEnabled?: boolean;
}

/**
 * Tema Festivo de Halloween para MERX POS
 * 
 * - Paleta estacional vibrante de Calabaza y Neón místico.
 * - Telarañas de alta visibilidad (180px) con contraste optimizado tanto en modo claro como oscuro.
 * - Arañita oscilante con hilo de seda en la esquina superior derecha.
 * - Partículas de ambiente nítidas (🎃, 🦇, 👻, 🍬) con opacidad mejorada.
 * - Botón de control MINIMALISTA y NO INTRUSIVO (icono circular compacto de 36px con tooltip).
 */
export const HalloweenTheme: React.FC<HalloweenThemeProps> = ({ isEnabled = true }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isEnabled) {
            document.body.classList.add('theme-halloween');
        } else {
            document.body.classList.remove('theme-halloween');
        }

        return () => {
            document.body.classList.remove('theme-halloween');
        };
    }, [isEnabled]);

    const handleDisable = () => {
        localStorage.setItem('pos_seasonal_theme_override', 'disabled');
        window.dispatchEvent(new Event('pos_theme_changed'));
    };

    const handleEnable = () => {
        localStorage.removeItem('pos_seasonal_theme_override');
        window.dispatchEvent(new Event('pos_theme_changed'));
    };

    if (!mounted) return null;

    // Si está desactivado localmente por el usuario, mostramos un botón discreto circular
    if (!isEnabled) {
        return (
            <div className="fixed bottom-4 left-4 z-[9999] pointer-events-auto print:hidden">
                <button
                    onClick={handleEnable}
                    title="Activar decoraciones de Halloween"
                    className="w-9 h-9 rounded-full bg-slate-900/85 hover:bg-slate-900 text-orange-400 border border-orange-500/30 shadow-lg backdrop-blur-md flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-95 group relative"
                >
                    <span>🎃</span>
                    <span className="absolute left-11 bg-slate-900 text-white text-[11px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md border border-slate-700">
                        Activar Halloween
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div className="theme-halloween-decorations pointer-events-none print:hidden select-none" aria-hidden="true">
            {/* ── Estilos CSS globales inyectados para el tema ─────────────────────── */}
            <style>
                {`
                :root {
                    --color-primary: #ea580c;
                    --color-primary-hover: #c2410c;
                    --color-primary-light: #ffedd5;
                }

                /* Sobrescritura de botones y acentos violeta/indigo a Naranja Calabaza */
                .theme-halloween .bg-primary,
                .theme-halloween .bg-violet-600,
                .theme-halloween .bg-indigo-600 {
                    background-color: #ea580c !important;
                }

                .theme-halloween .hover\\:bg-primary-hover:hover,
                .theme-halloween .hover\\:bg-violet-700:hover,
                .theme-halloween .hover\\:bg-indigo-700:hover {
                    background-color: #c2410c !important;
                }

                .theme-halloween .text-primary,
                .theme-halloween .text-violet-600,
                .theme-halloween .text-indigo-600 {
                    color: #ea580c !important;
                }

                .theme-halloween .text-violet-800 {
                    color: #9a3412 !important;
                }

                .theme-halloween .bg-violet-50 {
                    background-color: #fff7ed !important;
                }
                .dark .theme-halloween .bg-violet-50,
                html.dark .theme-halloween .bg-violet-50 {
                    background-color: rgba(67, 20, 7, 0.5) !important;
                }

                .theme-halloween .bg-violet-100 {
                    background-color: #ffedd5 !important;
                }
                .dark .theme-halloween .bg-violet-100,
                html.dark .theme-halloween .bg-violet-100 {
                    background-color: rgba(124, 45, 18, 0.5) !important;
                }

                .theme-halloween .border-primary,
                .theme-halloween .border-violet-500,
                .theme-halloween .border-indigo-500 {
                    border-color: #ea580c !important;
                }

                .theme-halloween .border-violet-200 {
                    border-color: #fed7aa !important;
                }
                .dark .theme-halloween .border-violet-200,
                html.dark .theme-halloween .border-violet-200 {
                    border-color: #9a3412 !important;
                }

                .theme-halloween .shadow-violet-200 {
                    box-shadow: 0 4px 14px 0 rgba(234, 88, 12, 0.35) !important;
                }

                .theme-halloween .focus\\:border-violet-500:focus,
                .theme-halloween .focus\\:border-primary:focus {
                    border-color: #ea580c !important;
                }

                .theme-halloween .focus\\:ring-violet-500:focus,
                .theme-halloween .focus\\:ring-primary:focus {
                    --tw-ring-color: #ea580c !important;
                }

                /* Resaltado ambiental en el Encabezado del POS y Admin */
                .theme-halloween header {
                    border-bottom: 2px solid rgba(234, 88, 12, 0.6) !important;
                    box-shadow: 0 4px 20px -2px rgba(234, 88, 12, 0.3) !important;
                }

                /* Animación pendular de la araña */
                @keyframes spiderSwing {
                    0% { transform: rotate(12deg); }
                    50% { transform: rotate(-12deg); }
                    100% { transform: rotate(12deg); }
                }

                /* Animación de partículas flotantes suaves */
                @keyframes floatSpooky {
                    0% {
                        transform: translateY(105vh) translateX(0) scale(0.9);
                        opacity: 0;
                    }
                    12% {
                        opacity: 0.40;
                    }
                    88% {
                        opacity: 0.40;
                    }
                    100% {
                        transform: translateY(-15vh) translateX(45px) scale(1.2);
                        opacity: 0;
                    }
                }

                .spooky-particle {
                    position: fixed;
                    bottom: -50px;
                    z-index: 40;
                    pointer-events: none;
                    animation-name: floatSpooky;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                    will-change: transform, opacity;
                }

                .spider-container {
                    transform-origin: top center;
                    animation: spiderSwing 4s ease-in-out infinite;
                }

                @media print {
                    .theme-halloween-decorations {
                        display: none !important;
                    }
                }
                `}
            </style>

            {/* ── Telaraña Grande de Alta Visibilidad - Esquina Superior Izquierda ── */}
            <div className="fixed top-0 left-0 z-50 pointer-events-none drop-shadow-[0_2px_8px_rgba(234,88,12,0.35)]">
                <svg width="170" height="170" viewBox="0 0 170 170" fill="none" className="text-orange-500/75 dark:text-orange-400/85">
                    {/* Hilos estructurales */}
                    <path d="M0,0 L170,0" stroke="currentColor" strokeWidth="2" />
                    <path d="M0,0 L0,170" stroke="currentColor" strokeWidth="2" />
                    <path d="M0,0 L150,150" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M0,0 L165,75" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M0,0 L75,165" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M0,0 L168,40" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M0,0 L40,168" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M0,0 L168,115" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M0,0 L115,168" stroke="currentColor" strokeWidth="1.5" />

                    {/* Espirales concéntricas curvas */}
                    <path d="M30,0 Q30,30 0,30" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M60,0 Q60,60 0,60" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M95,0 Q95,95 0,95" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M135,0 Q135,135 0,135" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M165,0 Q165,165 0,165" stroke="currentColor" strokeWidth="1.6" />
                </svg>
            </div>

            {/* ── Telaraña Grande con Araña Animada - Esquina Superior Derecha ─────── */}
            <div className="fixed top-0 right-0 z-50 pointer-events-none drop-shadow-[0_2px_8px_rgba(234,88,12,0.35)]">
                <svg width="170" height="170" viewBox="0 0 170 170" fill="none" className="text-orange-500/75 dark:text-orange-400/85">
                    {/* Hilos estructurales */}
                    <path d="M170,0 L0,0" stroke="currentColor" strokeWidth="2" />
                    <path d="M170,0 L170,170" stroke="currentColor" strokeWidth="2" />
                    <path d="M170,0 L20,150" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M170,0 L5,75" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M170,0 L95,165" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M170,0 L2,40" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M170,0 L130,168" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M170,0 L2,115" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M170,0 L55,168" stroke="currentColor" strokeWidth="1.5" />

                    {/* Espirales concéntricas curvas */}
                    <path d="M140,0 Q140,30 170,30" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M110,0 Q110,60 170,60" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M75,0 Q75,95 170,95" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M35,0 Q35,135 170,135" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M5,0 Q5,165 170,165" stroke="currentColor" strokeWidth="1.6" />
                </svg>

                {/* Hilo de seda y Araña Colgante con movimiento pendular */}
                <div className="spider-container absolute top-0 right-16 flex flex-col items-center">
                    <div className="w-[1.5px] h-20 bg-gradient-to-b from-orange-400 via-orange-300 to-amber-200 shadow-sm" />
                    <div className="text-xl select-none -mt-1 filter drop-shadow-[0_3px_6px_rgba(234,88,12,0.6)] animate-pulse">
                        🕷️
                    </div>
                </div>
            </div>

            {/* ── Partículas Ambientales Nítidas Flotando de Fondo ──────────────────── */}
            {[
                { emoji: '🎃', left: '7%', delay: '0s', duration: '15s', size: '26px' },
                { emoji: '🦇', left: '22%', delay: '3.5s', duration: '18s', size: '24px' },
                { emoji: '👻', left: '38%', delay: '7s', duration: '20s', size: '28px' },
                { emoji: '🍬', left: '55%', delay: '1.5s', duration: '16s', size: '22px' },
                { emoji: '🎃', left: '72%', delay: '5s', duration: '19s', size: '26px' },
                { emoji: '🦇', left: '88%', delay: '9s', duration: '17s', size: '24px' },
            ].map((p, idx) => (
                <div
                    key={idx}
                    className="spooky-particle select-none"
                    style={{
                        left: p.left,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        fontSize: p.size,
                    }}
                >
                    {p.emoji}
                </div>
            ))}

            {/* ── Botón Discreto No Intrusivo (Icono Circular 36px) ────────────────── */}
            <div className="fixed bottom-4 left-4 z-[9999] pointer-events-auto print:hidden">
                <button
                    onClick={handleDisable}
                    title="Tema de Halloween activo (Clic para apagar)"
                    className="w-9 h-9 rounded-full bg-slate-950/85 hover:bg-slate-900 text-orange-400 border border-orange-500/50 shadow-lg shadow-orange-950/40 backdrop-blur-md flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 group relative"
                >
                    <span className="animate-pulse">🎃</span>
                    {/* Tooltip flotante al pasar el mouse */}
                    <span className="absolute left-11 bg-slate-900 text-slate-200 text-[11px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md border border-slate-700">
                        Apagar tema de Halloween
                    </span>
                </button>
            </div>
        </div>
    );
};
