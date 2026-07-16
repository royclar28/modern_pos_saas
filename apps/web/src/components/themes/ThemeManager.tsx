import React, { useEffect, useState } from 'react';
import { GLOBAL_SEASONAL_THEME, ThemeType } from '../../config/theme';
import { WorldCupTheme } from './WorldCupTheme';

/**
 * Gestor de Temas
 * Inyector de decoraciones estacionales según la configuración global
 * o la anulación local en la caja.
 */
export const ThemeManager: React.FC = () => {
    const [activeTheme, setActiveTheme] = useState<ThemeType>('none');

    useEffect(() => {
        // Revisar si hay una anulación local (opción guardada en Settings)
        const localOverride = localStorage.getItem('pos_seasonal_theme_override');
        
        if (localOverride === 'disabled') {
            setActiveTheme('none');
        } else {
            setActiveTheme(GLOBAL_SEASONAL_THEME);
        }
        
        // Escuchar cambios (por si el usuario lo desactiva en Ajustes)
        const handleStorageChange = () => {
            const override = localStorage.getItem('pos_seasonal_theme_override');
            if (override === 'disabled') {
                setActiveTheme('none');
            } else {
                setActiveTheme(GLOBAL_SEASONAL_THEME);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('pos_theme_changed', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('pos_theme_changed', handleStorageChange);
        };
    }, []);

    // Renderizar el componente adecuado según la constante
    if (activeTheme === 'worldcup') {
        return <WorldCupTheme />;
    }
    
    // Aquí puedes agregar más casos para 'christmas', 'halloween', etc. en el futuro.

    return null; // Sin decoraciones
};
