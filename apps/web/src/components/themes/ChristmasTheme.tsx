import React, { useEffect, useState } from 'react';

interface ChristmasThemeProps {
    isEnabled?: boolean;
}

/**
 * Tema Festivo de Navidad para MERX POS
 * 
 * - Paleta estacional: Rojo navideño (#dc2626), Verde pino (#16a34a) y Destellos dorados (#f59e0b).
 * - Guirnalda festiva con lazo y acebo en la esquina superior izquierda.
 * - Esfera navideña colgante con sutil oscilación en la esquina superior derecha.
 * - Partículas de ambiente nítidas (❄️, 🎄, 🎁, ✨, 🔔) con opacidad balanceada.
 * - Botón de control minimalista y no intrusivo (icono circular compacto de 36px en la esquina).
 */
export const ChristmasTheme: React.FC<ChristmasThemeProps> = ({ isEnabled = true }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isEnabled) {
            document.body.classList.add('theme-christmas');
        } else {
            document.body.classList.remove('theme-christmas');
        }

        return () => {
            document.body.classList.remove('theme-christmas');
        };
    }, [isEnabled]);

    const handleDisable = () => {
        localStorage.setItem('pos_theme_override_christmas', 'disabled');
        window.dispatchEvent(new Event('pos_theme_changed'));
    };

    const handleEnable = () => {
        localStorage.removeItem('pos_theme_override_christmas');
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
                    title="Activar decoraciones de Navidad"
                    className="w-9 h-9 rounded-full bg-slate-900/85 hover:bg-slate-900 text-red-400 border border-red-500/30 shadow-lg backdrop-blur-md flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-95 group relative"
                >
                    <span>🎄</span>
                    <span className="absolute left-11 bg-slate-900 text-white text-[11px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md border border-slate-700">
                        Activar Navidad
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div className="theme-christmas-decorations pointer-events-none print:hidden select-none" aria-hidden="true">
            {/* ── Estilos CSS globales inyectados para el tema navideño ──────────── */}
            <style>
                {`
                :root {
                    --color-primary: #dc2626;
                    --color-primary-hover: #b91c1c;
                    --color-primary-light: #fee2e2;
                }

                /* Sobrescritura de botones y acentos violeta/indigo a Rojo Festivo */
                .theme-christmas .bg-primary,
                .theme-christmas .bg-violet-600,
                .theme-christmas .bg-indigo-600 {
                    background-color: #dc2626 !important;
                }

                .theme-christmas .hover\\:bg-primary-hover:hover,
                .theme-christmas .hover\\:bg-violet-700:hover,
                .theme-christmas .hover\\:bg-indigo-700:hover {
                    background-color: #b91c1c !important;
                }

                .theme-christmas .text-primary,
                .theme-christmas .text-violet-600,
                .theme-christmas .text-indigo-600 {
                    color: #dc2626 !important;
                }

                .theme-christmas .text-violet-800 {
                    color: #991b1b !important;
                }

                .theme-christmas .bg-violet-50 {
                    background-color: #fef2f2 !important;
                }
                .dark .theme-christmas .bg-violet-50,
                html.dark .theme-christmas .bg-violet-50 {
                    background-color: rgba(69, 10, 10, 0.45) !important;
                }

                .theme-christmas .bg-violet-100 {
                    background-color: #fee2e2 !important;
                }
                .dark .theme-christmas .bg-violet-100,
                html.dark .theme-christmas .bg-violet-100 {
                    background-color: rgba(127, 29, 29, 0.5) !important;
                }

                .theme-christmas .border-primary,
                .theme-christmas .border-violet-500,
                .theme-christmas .border-indigo-500 {
                    border-color: #dc2626 !important;
                }

                .theme-christmas .border-violet-200 {
                    border-color: #fecaca !important;
                }
                .dark .theme-christmas .border-violet-200,
                html.dark .theme-christmas .border-violet-200 {
                    border-color: #991b1b !important;
                }

                .theme-christmas .shadow-violet-200 {
                    box-shadow: 0 4px 14px 0 rgba(220, 38, 38, 0.35) !important;
                }

                .theme-christmas .focus\\:border-violet-500:focus,
                .theme-christmas .focus\\:border-primary:focus {
                    border-color: #dc2626 !important;
                }

                .theme-christmas .focus\\:ring-violet-500:focus,
                .theme-christmas .focus\\:ring-primary:focus {
                    --tw-ring-color: #dc2626 !important;
                }

                /* Resaltado ambiental en el Encabezado del POS y Admin */
                .theme-christmas header {
                    border-bottom: 2px solid rgba(220, 38, 38, 0.6) !important;
                    box-shadow: 0 4px 20px -2px rgba(220, 38, 38, 0.25) !important;
                }

                /* Animación pendular de la esfera navideña */
                @keyframes baubleSwing {
                    0% { transform: rotate(8deg); }
                    50% { transform: rotate(-8deg); }
                    100% { transform: rotate(8deg); }
                }

                /* Animación de partículas flotantes suaves (nieve y destellos) */
                @keyframes floatHoliday {
                    0% {
                        transform: translateY(105vh) translateX(0) scale(0.85);
                        opacity: 0;
                    }
                    15% {
                        opacity: 0.45;
                    }
                    85% {
                        opacity: 0.45;
                    }
                    100% {
                        transform: translateY(-12vh) translateX(30px) scale(1.15);
                        opacity: 0;
                    }
                }

                .holiday-particle {
                    position: fixed;
                    bottom: -50px;
                    z-index: 40;
                    pointer-events: none;
                    animation-name: floatHoliday;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                    will-change: transform, opacity;
                }

                .bauble-container {
                    transform-origin: top center;
                    animation: baubleSwing 3.5s ease-in-out infinite;
                }

                @media print {
                    .theme-christmas-decorations {
                        display: none !important;
                    }
                }
                `}
            </style>

            {/* ── Guirnalda con Acebo y Campanitas - Esquina Superior Izquierda ── */}
            <div className="fixed top-0 left-0 z-50 pointer-events-none drop-shadow-[0_2px_8px_rgba(220,38,38,0.35)]">
                <svg width="160" height="130" viewBox="0 0 160 130" fill="none" className="text-emerald-600 dark:text-emerald-500">
                    {/* Ramas de pino de la guirnalda */}
                    <path d="M0,0 Q60,10 110,40 Q80,25 0,0" fill="#15803d" opacity="0.9" />
                    <path d="M0,0 Q40,40 60,95 Q40,60 0,0" fill="#166534" opacity="0.9" />
                    <path d="M15,10 Q80,30 140,25 Q70,18 15,10" fill="#16a34a" opacity="0.85" />
                    
                    {/* Bayas rojas de acebo */}
                    <circle cx="50" cy="28" r="5" fill="#dc2626" />
                    <circle cx="58" cy="24" r="4.5" fill="#ef4444" />
                    <circle cx="55" cy="34" r="4" fill="#b91c1c" />
                    <circle cx="28" cy="52" r="4.5" fill="#dc2626" />
                    <circle cx="34" cy="58" r="4" fill="#ef4444" />

                    {/* Campanitas doradas */}
                    <g transform="translate(62, 38)">
                        {/* Campana 1 */}
                        <path d="M4,2 C8,2 12,6 13,15 L1,15 C2,6 6,2 10,2 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
                        <ellipse cx="7" cy="15" rx="7" ry="2" fill="#fbbf24" />
                        <circle cx="7" cy="17" r="1.5" fill="#b45309" />
                        {/* Campana 2 */}
                        <path d="M16,6 C19,6 23,10 24,18 L13,18 C14,10 17,6 20,6 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
                        <ellipse cx="18.5" cy="18" rx="6.5" ry="2" fill="#fde68a" />
                        <circle cx="18.5" cy="20" r="1.5" fill="#b45309" />
                        {/* Lazo rojo central */}
                        <path d="M8,4 Q13,1 18,4 Q15,7 13,10 Q11,7 8,4 Z" fill="#dc2626" />
                        <path d="M13,8 L10,18 L12,17 L14,18 Z" fill="#b91c1c" />
                        <circle cx="13" cy="7" r="2" fill="#ef4444" />
                    </g>
                </svg>
            </div>

            {/* ── Esfera Navideña Colgante Animada - Esquina Superior Derecha ─────── */}
            <div className="fixed top-0 right-0 z-50 pointer-events-none drop-shadow-[0_4px_12px_rgba(220,38,38,0.4)]">
                {/* Rama de pino superior derecha */}
                <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                    <path d="M140,0 Q90,12 40,32 Q80,20 140,0" fill="#15803d" opacity="0.9" />
                    <path d="M140,0 Q110,35 90,75 Q115,45 140,0" fill="#166534" opacity="0.85" />
                    <circle cx="105" cy="22" r="4.5" fill="#dc2626" />
                    <circle cx="112" cy="27" r="4" fill="#ef4444" />
                </svg>

                {/* Hilo dorado y Esfera navideña colgante con oscilación */}
                <div className="bauble-container absolute top-0 right-14 flex flex-col items-center">
                    {/* Cinta dorada */}
                    <div className="w-[1.5px] h-20 bg-gradient-to-b from-amber-400 via-amber-300 to-yellow-200 shadow-sm" />
                    
                    {/* Casquillo de la esfera */}
                    <div className="w-4 h-2 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 rounded-t-sm shadow-sm -mt-0.5" />
                    
                    {/* Esfera decorativa */}
                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-950 shadow-lg shadow-red-900/50 flex items-center justify-center -mt-0.5 border border-red-400/30">
                        {/* Brillo especular de la esfera */}
                        <div className="absolute top-1.5 left-2 w-3.5 h-2 bg-white/40 rounded-full rotate-[-30deg] blur-[0.5px]" />
                        {/* Estrella dorada en el centro de la esfera */}
                        <span className="text-amber-300 text-sm select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                            ★
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Partículas Ambientales Navideñas Flotando de Fondo ──────────────── */}
            {[
                { emoji: '❄️', left: '6%', delay: '0s', duration: '14s', size: '24px' },
                { emoji: '✨', left: '20%', delay: '3.5s', duration: '16s', size: '20px' },
                { emoji: '🎄', left: '35%', delay: '6.5s', duration: '19s', size: '26px' },
                { emoji: '❄️', left: '50%', delay: '1.2s', duration: '15s', size: '22px' },
                { emoji: '🎁', left: '66%', delay: '4.8s', duration: '18s', size: '24px' },
                { emoji: '🔔', left: '80%', delay: '2.5s', duration: '17s', size: '22px' },
                { emoji: '❄️', left: '92%', delay: '7s', duration: '15s', size: '24px' },
            ].map((p, idx) => (
                <div
                    key={idx}
                    className="holiday-particle select-none"
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
                    title="Tema de Navidad activo (Clic para apagar)"
                    className="w-9 h-9 rounded-full bg-slate-950/85 hover:bg-slate-900 text-red-400 border border-red-500/50 shadow-lg shadow-red-950/40 backdrop-blur-md flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 group relative"
                >
                    <span className="animate-pulse">🎄</span>
                    {/* Tooltip flotante al pasar el mouse */}
                    <span className="absolute left-11 bg-slate-900 text-slate-200 text-[11px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md border border-slate-700">
                        Apagar tema de Navidad
                    </span>
                </button>
            </div>
        </div>
    );
};
