import React, { useEffect, useState } from 'react';

/**
 * Tema Mundialista
 * Inyecta clases globales y elementos decorativos sin afectar
 * la lógica o el layout de la app.
 */
export const WorldCupTheme: React.FC = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Agregar la clase de tema al documento
        document.body.classList.add('theme-worldcup');
        
        return () => {
            document.body.classList.remove('theme-worldcup');
        };
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" aria-hidden="true">
            {/* Animación de estilo CSS */}
            <style>
                {`
                :root {
                    /* Sobrescribir el color primario (violet) por un Verde Cancha (emerald/green) */
                    --color-primary: #10b981;
                    --color-primary-dark: #059669;
                }

                .theme-worldcup .bg-primary {
                    background-color: var(--color-primary) !important;
                }
                .theme-worldcup .text-primary {
                    color: var(--color-primary) !important;
                }
                .theme-worldcup .border-primary {
                    border-color: var(--color-primary) !important;
                }
                
                .theme-worldcup .bg-violet-600 {
                    background-color: var(--color-primary) !important;
                }
                .theme-worldcup .text-violet-600 {
                    color: var(--color-primary) !important;
                }
                .theme-worldcup .border-violet-500 {
                    border-color: var(--color-primary) !important;
                }
                .theme-worldcup .focus\\:border-violet-500:focus {
                    border-color: var(--color-primary) !important;
                }
                .theme-worldcup .focus\\:ring-violet-500:focus {
                    --tw-ring-color: var(--color-primary) !important;
                }
                .theme-worldcup .focus\\:ring-violet-400:focus {
                    --tw-ring-color: #34d399 !important;
                }
                .theme-worldcup .hover\\:border-violet-500:hover {
                    border-color: var(--color-primary) !important;
                }
                .theme-worldcup .group-hover\\:text-violet-800:hover {
                    color: var(--color-primary-dark) !important;
                }

                /* Pelotas de fútbol flotantes */
                @keyframes float-ball {
                    0% {
                        transform: translateY(110vh) rotate(0deg) scale(0.8);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.15;
                    }
                    90% {
                        opacity: 0.15;
                    }
                    100% {
                        transform: translateY(-20vh) rotate(360deg) scale(1.2);
                        opacity: 0;
                    }
                }

                .soccer-ball {
                    position: absolute;
                    bottom: -50px;
                    width: 40px;
                    height: 40px;
                    background-image: radial-gradient(circle at 30% 30%, #fff 0%, #eee 40%, #ccc 100%);
                    border-radius: 50%;
                    box-shadow: inset -2px -2px 4px rgba(0,0,0,0.3), 0 5px 10px rgba(0,0,0,0.1);
                    animation: float-ball 12s infinite linear;
                    z-index: 100;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 24px;
                    filter: grayscale(0.2);
                }
                
                .soccer-ball::after {
                    content: '⚽';
                }

                /* Fondo de grama para el header del POS si se desea */
                .theme-worldcup header {
                    position: relative;
                    overflow: hidden;
                }
                .theme-worldcup header::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: repeating-linear-gradient(
                        to right,
                        transparent,
                        transparent 40px,
                        rgba(255,255,255,0.03) 40px,
                        rgba(255,255,255,0.03) 80px
                    );
                    pointer-events: none;
                    z-index: 0;
                }
                `}
            </style>

            {/* Generar balones animados */}
            {[...Array(6)].map((_, i) => (
                <div 
                    key={i} 
                    className="soccer-ball"
                    style={{
                        left: `${15 + i * 15}%`,
                        animationDelay: `${i * 2.3}s`,
                        animationDuration: `${10 + (i % 3) * 3}s`,
                        transform: `scale(${0.8 + (i % 3) * 0.2})`
                    }}
                />
            ))}
        </div>
    );
};
