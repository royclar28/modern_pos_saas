import React, { useEffect, useState } from 'react';

interface HalloweenThemeProps {
    isEnabled?: boolean;
}

/**
 * Tema Festivo de Halloween para MERX POS
 * 
 * - Inyecta paleta de calabaza y acentos estacionales cálidos.
 * - Elementos decorativos sutiles: telarañas en esquinas y arañita oscilante.
 * - Partículas ambiente flotantes de muy baja opacidad (sin estorbar la operativa del cajero).
 * - Widget flotante interactivo para que el usuario o cajero pueda activarlo o apagarlo a gusto.
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

    // Si está desactivado localmente pero Halloween está disponible globalmente,
    // mostramos únicamente el botoncito discreto en la esquina inferior.
    if (!isEnabled) {
        return (
            <div className="fixed bottom-4 left-4 z-[9999] pointer-events-auto print:hidden">
                <button
                    onClick={handleEnable}
                    title="Activar ambiente de Halloween en MERX POS"
                    className="flex items-center gap-1.5 bg-slate-900/85 hover:bg-slate-900 text-orange-400 hover:text-orange-300 px-3 py-1.5 rounded-full border border-orange-500/40 shadow-lg shadow-orange-950/20 text-xs font-semibold backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                >
                    <span className="text-sm">🎃</span>
                    <span>Activar Halloween</span>
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
                    background-color: rgba(67, 20, 7, 0.45) !important;
                }

                .theme-halloween .bg-violet-100 {
                    background-color: #ffedd5 !important;
                }
                .dark .theme-halloween .bg-violet-100,
                html.dark .theme-halloween .bg-violet-100 {
                    background-color: rgba(124, 45, 18, 0.45) !important;
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
                    box-shadow: 0 4px 14px 0 rgba(234, 88, 12, 0.28) !important;
                }

                .theme-halloween .focus\\:border-violet-500:focus,
                .theme-halloween .focus\\:border-primary:focus {
                    border-color: #ea580c !important;
                }

                .theme-halloween .focus\\:ring-violet-500:focus,
                .theme-halloween .focus\\:ring-primary:focus {
                    --tw-ring-color: #ea580c !important;
                }

                /* Resaltado ambiental en el Encabezado */
                .theme-halloween header {
                    border-bottom: 2px solid rgba(234, 88, 12, 0.5) !important;
                    box-shadow: 0 4px 20px -2px rgba(234, 88, 12, 0.22) !important;
                }

                /* Animación pendular de la araña */
                @keyframes spiderSwing {
                    0% { transform: rotate(10deg); }
                    50% { transform: rotate(-10deg); }
                    100% { transform: rotate(10deg); }
                }

                /* Animación de partículas flotantes suaves */
                @keyframes floatSpooky {
                    0% {
                        transform: translateY(105vh) translateX(0) scale(0.85);
                        opacity: 0;
                    }
                    15% {
                        opacity: 0.20;
                    }
                    85% {
                        opacity: 0.20;
                    }
                    100% {
                        transform: translateY(-15vh) translateX(35px) scale(1.15);
                        opacity: 0;
                    }
                }

                .spooky-particle {
                    position: fixed;
                    bottom: -40px;
                    z-index: 40;
                    pointer-events: none;
                    animation-name: floatSpooky;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                    will-change: transform, opacity;
                }

                .spider-container {
                    transform-origin: top center;
                    animation: spiderSwing 4.5s ease-in-out infinite;
                }

                @media print {
                    .theme-halloween-decorations {
                        display: none !important;
                    }
                }
                `}
            </style>

            {/* ── Telaraña Esquina Superior Izquierda ─────────────────────────────────── */}
            <div className="fixed top-0 left-0 z-50 pointer-events-none opacity-30 text-orange-400/80">
                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M0,0 L100,0 M0,0 L0,100 M0,0 L70,70 M0,0 L90,40 M0,0 L40,90" />
                    <path d="M20,0 Q20,20 0,20" />
                    <path d="M40,0 Q40,40 0,40" />
                    <path d="M65,0 Q65,65 0,65" />
                    <path d="M90,0 Q90,90 0,90" />
                </svg>
            </div>

            {/* ── Telaraña con Araña Colgante en Esquina Superior Derecha ─────────────── */}
            <div className="fixed top-0 right-0 z-50 pointer-events-none opacity-45">
                <svg width="110" height="110" viewBox="0 0 110 110" fill="none" stroke="#ea580c" strokeWidth="1.2" className="opacity-40">
                    <path d="M110,0 L10,0 M110,0 L110,100 M110,0 L40,70 M110,0 L20,40 M110,0 L70,90" />
                    <path d="M90,0 Q90,20 110,20" />
                    <path d="M70,0 Q70,40 110,40" />
                    <path d="M45,0 Q45,65 110,65" />
                    <path d="M20,0 Q20,90 110,90" />
                </svg>

                {/* Hilo y Arañita oscilante */}
                <div className="spider-container absolute top-0 right-12 flex flex-col items-center">
                    <div className="w-[1px] h-14 bg-gradient-to-b from-orange-500/70 via-orange-400/50 to-orange-400/80" />
                    <div className="text-base select-none -mt-1 filter drop-shadow-[0_2px_4px_rgba(234,88,12,0.4)]">
                        🕷️
                    </div>
                </div>
            </div>

            {/* ── Partículas Ambientales Suaves Flotando de Fondo ────────────────────── */}
            {[
                { emoji: '🎃', left: '8%', delay: '0s', duration: '16s', size: '20px' },
                { emoji: '🦇', left: '24%', delay: '4s', duration: '19s', size: '18px' },
                { emoji: '👻', left: '42%', delay: '8s', duration: '22s', size: '22px' },
                { emoji: '🍬', left: '60%', delay: '2s', duration: '17s', size: '16px' },
                { emoji: '🎃', left: '76%', delay: '6s', duration: '20s', size: '22px' },
                { emoji: '🦇', left: '90%', delay: '11s', duration: '18s', size: '18px' },
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

            {/* ── Botón / Píldora Flotante en Esquina Inferior ──────────────────────── */}
            <div className="fixed bottom-4 left-4 z-[9999] pointer-events-auto print:hidden">
                <div className="flex items-center gap-2 bg-slate-950/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-orange-500/50 shadow-xl shadow-orange-950/30 text-xs transition-all hover:border-orange-400">
                    <span className="text-sm animate-pulse">🎃</span>
                    <span className="text-orange-400 font-bold tracking-wide">Modo Halloween</span>
                    <button
                        onClick={handleDisable}
                        title="Desactivar efectos y volver a los colores habituales"
                        className="ml-1 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors"
                    >
                        Apagar
                    </button>
                </div>
            </div>
        </div>
    );
};
