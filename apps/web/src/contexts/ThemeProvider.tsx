import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

/**
 * ThemeProvider — White-Labeling Motor
 *
 * Reads the store's `primaryColor` from the backend when the user logs in,
 * and injects it as CSS custom properties on `document.documentElement`.
 *
 * Tailwind is configured to read `--color-primary` for the `primary` color,
 * allowing every tenant to have a unique brand color experience.
 */

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
        s = 0,
        l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const [themeReady, setThemeReady] = useState(false);

    useEffect(() => {
        if (!user || !token) {
            setThemeReady(true);
            return;
        }

        const applyTheme = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await fetch(`${API_URL}/settings`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) throw new Error('Failed to fetch settings');

                const settings = await response.json();
                const primaryColor = settings.primaryColor || '#7C3AED'; // Default violet

                // Inject CSS custom properties
                const root = document.documentElement.style;
                root.setProperty('--color-primary', primaryColor);

                // Generate hover (slightly darker) and light variants
                const hsl = hexToHSL(primaryColor);
                if (hsl) {
                    root.setProperty(
                        '--color-primary-hover',
                        `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 10, 5)}%)`
                    );
                    root.setProperty(
                        '--color-primary-light',
                        `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(hsl.l + 35, 95)}%)`
                    );
                }
            } catch (error) {
                console.warn('ThemeProvider: Could not fetch store theme, using defaults', error);
                document.documentElement.style.setProperty('--color-primary', '#7C3AED');
                document.documentElement.style.setProperty('--color-primary-hover', '#6D28D9');
                document.documentElement.style.setProperty('--color-primary-light', '#EDE9FE');
            } finally {
                setThemeReady(true);
            }
        };

        applyTheme();
    }, [user, token]);

    if (!themeReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return <>{children}</>;
};
