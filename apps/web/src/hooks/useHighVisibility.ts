/**
 * useHighVisibility.ts
 *
 * Manages the "High Visibility Mode" preference for this terminal.
 * Stored in localStorage so it persists per-device (this is NOT a global
 * server setting — each physical POS station can decide independently).
 *
 * When enabled, the POS interface uses:
 *   - Colossal typography (text-3xl / text-5xl)
 *   - Oversized buttons and input targets
 *   - Simplified product cards (name + price only)
 *   - A giant checkout footer that occupies ~30% of the screen
 *
 * This is designed for:
 *   - Operators with reduced vision / accessibility needs
 *   - Small or low-resolution touchscreens on POS terminals
 *   - High-stress, fast-pace environments (street food, etc.)
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'pos_high_visibility';

export const useHighVisibility = () => {
    const [isHighVis, setIsHighVis] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const toggleHighVis = useCallback(() => {
        setIsHighVis(prev => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY, String(next));
            return next;
        });
    }, []);

    const setHighVis = useCallback((value: boolean) => {
        localStorage.setItem(STORAGE_KEY, String(value));
        setIsHighVis(value);
    }, []);

    return { isHighVis, toggleHighVis, setHighVis };
};
