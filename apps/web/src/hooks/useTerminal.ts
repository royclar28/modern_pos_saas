/**
 * useTerminal.ts
 *
 * Reads and persists the terminal identifier for this browser/device.
 * The terminalId is stored in localStorage so it survives page refreshes
 * and is injected into every Sale document at checkout time.
 *
 * Multi-Terminal flow:
 *   - Each physical POS machine gets its own terminalId (e.g. "CAJA_01", "CAJA_PASILLO_2").
 *   - The ID is set once by the admin in the SettingsPage and stored locally.
 *   - The Sales Dashboard (Reporte Z) can filter by terminalId for per-register reports.
 */

const STORAGE_KEY = 'pos_terminal_id';
const DEFAULT_TERMINAL_ID = 'CAJA_01';

export const useTerminal = () => {
    const getTerminalId = (): string => {
        return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TERMINAL_ID;
    };

    const setTerminalId = (id: string): void => {
        const sanitized = id.trim() || DEFAULT_TERMINAL_ID;
        localStorage.setItem(STORAGE_KEY, sanitized);
    };

    return { getTerminalId, setTerminalId };
};
