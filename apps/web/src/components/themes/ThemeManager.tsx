import React, { useEffect, useState } from 'react';
import { GLOBAL_SEASONAL_THEME, ThemeType } from '../../config/theme';
import { WorldCupTheme } from './WorldCupTheme';
import { HalloweenTheme } from './HalloweenTheme';

/**
 * Gestor de Temas
 * Inyector de decoraciones estacionales según la configuración global
 * o la anulación local en la caja.
 */
export const ThemeManager: React.FC = () => {
    const [activeTheme, setActiveTheme] = useState<ThemeType>('none');

    useEffect(() => {
        const updateTheme = () => {
            const localOverride = localStorage.getItem('pos_seasonal_theme_override');
            if (localOverride === 'disabled') {
                setActiveTheme('none');
            } else {
                setActiveTheme(GLOBAL_SEASONAL_THEME);
            }
        };

        updateTheme();

        window.addEventListener('storage', updateTheme);
        window.addEventListener('pos_theme_changed', updateTheme);

        return () => {
            window.removeEventListener('storage', updateTheme);
            window.removeEventListener('pos_theme_changed', updateTheme);
        };
    }, []);

    // Renderizar según el tema estacional activo
    if (activeTheme === 'halloween') {
        return <HalloweenTheme isEnabled={true} />;
    }

    // Si globalmente está activo Halloween pero este terminal lo desactivó,
    // mostramos el botón discreto para permitir volver a activarlo cuando desee.
    if (GLOBAL_SEASONAL_THEME === 'halloween' && activeTheme === 'none') {
        return <HalloweenTheme isEnabled={false} />;
    }

    if (activeTheme === 'worldcup') {
        return <WorldCupTheme />;
    }

    return null;
};

