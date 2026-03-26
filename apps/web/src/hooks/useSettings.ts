/**
 * useSettings.ts
 *
 * Re-exports the SettingsProvider context hook for backward compatibility.
 * All settings state is now centralized in SettingsProvider.tsx
 */
export { useSettingsContext as useSettings } from '../contexts/SettingsProvider';
export type { ParsedSettings, StoreSettings } from '../contexts/SettingsProvider';
