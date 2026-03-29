/**
 * SettingsPage.tsx
 *
 * Two-section admin panel:
 *   1. "Ajustes de Este Equipo" — local terminal name stored in localStorage.
 *   2. "Ajustes del Negocio"   — global store settings patched via PATCH /settings.
 *   3. "Apariencia"            — color picker palette + dark mode toggle.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTerminal } from '../../hooks/useTerminal';
import { useSettingsContext as useSettings, StoreSettings } from '../../contexts/SettingsProvider';
import { useHighVisibility } from '../../hooks/useHighVisibility';

// ─── Color Palette ────────────────────────────────────────────────────────────
const COLOR_PALETTE = [
    { name: 'Violeta', hex: '#7C3AED' },
    { name: 'Índigo', hex: '#4F46E5' },
    { name: 'Azul', hex: '#2563EB' },
    { name: 'Cian', hex: '#0891B2' },
    { name: 'Esmeralda', hex: '#059669' },
    { name: 'Verde', hex: '#16A34A' },
    { name: 'Ámbar', hex: '#D97706' },
    { name: 'Naranja', hex: '#EA580C' },
    { name: 'Rosa', hex: '#DB2777' },
    { name: 'Rojo', hex: '#DC2626' },
    { name: 'Slate', hex: '#475569' },
    { name: 'Zinc', hex: '#3F3F46' },
];

// ─── Reusable Field ───────────────────────────────────────────────────────────
const Field = ({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {label}
        </label>
        {children}
        {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
);

// ─── Card wrapper ─────────────────────────────────────────────────────────────
const Card = ({
    title,
    icon,
    badge,
    children,
}: {
    title: string;
    icon: string;
    badge?: string;
    children: React.ReactNode;
}) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
                <h2 className="text-base font-bold text-slate-800 dark:text-white">{title}</h2>
            </div>
            {badge && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-primary-light dark:bg-slate-700 text-primary dark:text-slate-300 px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}
        </div>
        <div className="p-6 space-y-5">{children}</div>
    </div>
);

// ─── Toast notification ───────────────────────────────────────────────────────
const Toast = ({ msg, type }: { msg: string; type: 'success' | 'error' }) => (
    <div
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold animate-[fadeInUp_0.3s_ease] ${
            type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
        }`}
    >
        <span>{type === 'success' ? '✅' : '❌'}</span>
        {msg}
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const SettingsPage = () => {
    const { getTerminalId, setTerminalId } = useTerminal();
    const { raw, taxRate, isLoading, error, refetch, setCompany, setPrimaryColor, toggleDarkMode, darkMode } = useSettings();
    const { isHighVis, toggleHighVis } = useHighVisibility();

    // Local terminal form state
    const [localTerminal, setLocalTerminal] = useState('');

    // Global settings form state — mirrors the API shape
    const [globalForm, setGlobalForm] = useState<StoreSettings>({
        default_tax_rate: '16',
        currency_symbol: '$',
        exchange_rate: '1',
        company: '',
        timezone: '',
        language: 'es',
        enable_credit_sales: 'false',
        primaryColor: '#7C3AED',
    });

    const [isSavingGlobal, setIsSavingGlobal] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Security (Change Password) state
    const [pwdForm, setPwdForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isChangingPwd, setIsChangingPwd] = useState(false);

    // Populate forms once settings are fetched
    useEffect(() => {
        setLocalTerminal(getTerminalId());
    }, []);

    useEffect(() => {
        if (!isLoading) {
            setGlobalForm({
                default_tax_rate: raw.default_tax_rate,
                currency_symbol: raw.currency_symbol,
                exchange_rate: raw.exchange_rate,
                company: raw.company,
                timezone: raw.timezone,
                language: raw.language,
                enable_credit_sales: raw.enable_credit_sales,
                primaryColor: raw.primaryColor || '#7C3AED',
            });
        }
    }, [isLoading, raw]);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Save terminal ID locally ─────────────────────────────────────────────
    const handleSaveTerminal = () => {
        const trimmed = localTerminal.trim();
        if (!trimmed) return;
        setTerminalId(trimmed);
        showToast(`Caja guardada como "${trimmed}"`, 'success');
    };

    // ── Save global settings via PATCH /settings ─────────────────────────────
    const handleSaveGlobal = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingGlobal(true);
        try {
            const token = localStorage.getItem('pos_token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
            const res = await fetch(`${apiUrl}/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(globalForm),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            // Instant reactivity: update global context immediately
            setCompany(globalForm.company);
            setPrimaryColor(globalForm.primaryColor || '#7C3AED');

            // Cache store name for LoginPage
            localStorage.setItem('pos_store_name', globalForm.company);

            await refetch();
            showToast('Ajustes globales guardados', 'success');
        } catch (err) {
            showToast(`Error al guardar: ${(err as Error).message}`, 'error');
        } finally {
            setIsSavingGlobal(false);
        }
    };

    // ── Handle Password Change ───────────────────────────────────────────────
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            return showToast('Las contraseñas no coinciden', 'error');
        }
        if (pwdForm.newPassword.length < 6) {
            return showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        }

        setIsChangingPwd(true);
        try {
            const token = localStorage.getItem('pos_token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
            const res = await fetch(`${apiUrl}/auth/change-password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword: pwdForm.currentPassword,
                    newPassword: pwdForm.newPassword
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al cambiar contraseña');
            }

            showToast('Contraseña actualizada con éxito', 'success');
            setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            showToast(error.message || 'Hubo un error', 'error');
        } finally {
            setIsChangingPwd(false);
        }
    };

    const inputClass =
        'w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* ── Navbar ──────────────────────────────────────────────────────── */}
            <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <span>⚙️</span>
                        <span>Configuración del Sistema</span>
                    </h1>
                    <nav className="hidden sm:flex gap-4">
                        <Link to="/" className="text-sm text-slate-300 hover:text-white transition-colors">
                            ← Dashboard
                        </Link>
                        <Link to="/admin/sales" className="text-sm text-slate-300 hover:text-white transition-colors">
                            Reporte Z
                        </Link>
                        <Link to="/pos" className="text-sm text-slate-300 hover:text-white transition-colors">
                            Ir al POS →
                        </Link>
                        <button
                            onClick={toggleDarkMode}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1 rounded-lg text-sm transition-colors ml-4"
                            title="Alternar Modo Oscuro"
                        >
                            {darkMode ? '🌞' : '🌙'}
                        </button>
                    </nav>
                </div>

                {/* Live status */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    {isLoading ? (
                        <span className="animate-pulse">Cargando ajustes...</span>
                    ) : error ? (
                        <span className="text-amber-400">⚠️ Usando valores offline</span>
                    ) : (
                        <span className="text-emerald-400">● Conectado al servidor</span>
                    )}
                </div>
            </header>

            {/* ── Main Content ──────────────────────────────────────────────── */}
            <main className="flex-1 overflow-auto p-6 md:p-8">
                <div className="max-w-3xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">

                    {/* Page heading */}
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Ajustes</h2>
                        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">
                            Configura este equipo y los parámetros globales del negocio.
                        </p>
                    </div>

                    {/* ── SECTION 1: Este equipo ─────────────────────────────── */}
                    <Card icon="🖥️" title="Ajustes de Este Equipo" badge="Local">
                        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
                            Este identificador se guarda <strong>solo en este navegador</strong>. Cada caja registradora
                            debe tener un nombre único para que el Reporte Z pueda segregar las ventas por terminal.
                        </p>

                        {/* Multi-Caja explanation box */}
                        <div className="bg-primary-light dark:bg-slate-700 border border-primary/20 dark:border-slate-600 rounded-xl p-4 text-sm text-primary dark:text-slate-300 space-y-1">
                            <p className="font-bold flex items-center gap-2">🔀 ¿Cómo funciona el Multi-Caja?</p>
                            <ul className="list-disc list-inside space-y-1 opacity-90">
                                <li>Cada instancia del POS en un dispositivo diferente tiene su propio <code className="bg-white/50 dark:bg-slate-600 px-1 rounded text-xs">terminalId</code>.</li>
                                <li>El ID se escribe en cada ticket (<code className="bg-white/50 dark:bg-slate-600 px-1 rounded text-xs">SaleDoc.terminalId</code>) al momento del cobro.</li>
                                <li>Las ventas de todas las cajas se sincronizan al mismo servidor en segundo plano.</li>
                                <li>El Reporte Z puede cruzar ventas por terminal para cerrar cada caja de forma independiente.</li>
                            </ul>
                        </div>

                        <Field label="Nombre de Esta Caja" hint='Ejemplo: "Caja Principal", "Caja Pasillo 2", "Ventanilla B"'>
                            <div className="flex gap-3">
                                <input
                                    id="terminal-id-input"
                                    type="text"
                                    value={localTerminal}
                                    onChange={(e) => setLocalTerminal(e.target.value)}
                                    placeholder="CAJA_01"
                                    className={inputClass}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTerminal()}
                                />
                                <button
                                    id="save-terminal-btn"
                                    onClick={handleSaveTerminal}
                                    disabled={!localTerminal.trim()}
                                    className="px-5 py-2 bg-primary hover:bg-primary-hover active:scale-95 text-white text-sm font-bold rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Guardar
                                </button>
                            </div>
                        </Field>

                        {/* Current value display */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-lg px-4 py-2.5">
                            <span>Terminal activa:</span>
                            <code className="font-mono font-bold text-primary bg-primary-light dark:bg-slate-600 px-2 py-0.5 rounded text-sm">
                                {getTerminalId()}
                            </code>
                        </div>

                        {/* High Visibility Mode Toggle */}
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-5 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="text-lg">👁️</span> Modo de Alta Visibilidad
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-md">
                                        Activa textos gigantes, botones enormes y una interfaz simplificada
                                        ideal para pantallas pequeñas o personas con visión reducida.
                                        Solo afecta a <strong>este terminal</strong>.
                                    </p>
                                </div>
                                <button
                                    id="high-vis-toggle"
                                    onClick={toggleHighVis}
                                    className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${
                                        isHighVis
                                            ? 'bg-primary'
                                            : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                                    aria-label="Toggle High Visibility Mode"
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                                            isHighVis ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                            {isHighVis && (
                                <div className="mt-3 bg-primary-light dark:bg-slate-700 border border-primary/20 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-primary dark:text-slate-300 font-medium flex items-center gap-2">
                                    <span className="text-lg">✅</span>
                                    <span>Modo de Alta Visibilidad <strong>ACTIVO</strong>. La interfaz POS mostrará elementos agrandados.</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* ── SECTION 2: Negocio (Global) ───────────────────────── */}
                    <Card icon="🏢" title="Ajustes del Negocio" badge="Global · Todos los terminales">
                        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
                            Estos valores se guardan en el servidor y afectan a <strong>todos los terminales</strong> simultáneamente.
                            El cambio en el IVA se aplica inmediatamente al siguiente ciclo de cobro en cada caja.
                        </p>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <form id="global-settings-form" onSubmit={handleSaveGlobal} className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* IVA */}
                                    <Field
                                        label="Tasa de IVA (%)"
                                        hint={`Valor actual en uso: ${taxRate}%`}
                                    >
                                        <div className="relative">
                                            <input
                                                id="tax-rate-input"
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={globalForm.default_tax_rate}
                                                onChange={(e) =>
                                                    setGlobalForm((f) => ({ ...f, default_tax_rate: e.target.value }))
                                                }
                                                className={inputClass + ' pr-8'}
                                                required
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
                                        </div>
                                    </Field>

                                    {/* Currency */}
                                    <Field
                                        label="Símbolo de Moneda"
                                        hint="Ejemplo: $, €, Q, S/"
                                    >
                                        <input
                                            id="currency-symbol-input"
                                            type="text"
                                            maxLength={5}
                                            value={globalForm.currency_symbol}
                                            onChange={(e) =>
                                                setGlobalForm((f) => ({ ...f, currency_symbol: e.target.value }))
                                            }
                                            className={inputClass}
                                            required
                                        />
                                    </Field>

                                    {/* Company */}
                                    <Field label="Nombre del Negocio" hint="Aparece en tickets, login y toda la interfaz">
                                        <input
                                            id="company-name-input"
                                            type="text"
                                            value={globalForm.company}
                                            onChange={(e) =>
                                                setGlobalForm((f) => ({ ...f, company: e.target.value }))
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    {/* Timezone */}
                                    <Field label="Zona Horaria" hint="Afecta el cálculo de fechas en reportes">
                                        <input
                                            id="timezone-input"
                                            type="text"
                                            value={globalForm.timezone}
                                            onChange={(e) =>
                                                setGlobalForm((f) => ({ ...f, timezone: e.target.value }))
                                            }
                                            placeholder="America/Caracas"
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                {/* ── Color Palette Section ── */}
                                <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                                    <Field label="Color de la Marca" hint="Elige un color de la paleta o usa el selector personalizado">
                                        <div className="space-y-3">
                                            {/* Predefined palette */}
                                            <div className="flex flex-wrap gap-2">
                                                {COLOR_PALETTE.map(c => (
                                                    <button
                                                        key={c.hex}
                                                        type="button"
                                                        onClick={() => {
                                                            setGlobalForm(f => ({ ...f, primaryColor: c.hex }));
                                                            setPrimaryColor(c.hex);
                                                        }}
                                                        className={`w-10 h-10 rounded-xl transition-all duration-200 shadow-sm hover:scale-110 hover:shadow-md relative group ${
                                                            globalForm.primaryColor?.toUpperCase() === c.hex.toUpperCase()
                                                                ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-110'
                                                                : ''
                                                        }`}
                                                        style={{ backgroundColor: c.hex }}
                                                        title={c.name}
                                                    >
                                                        {globalForm.primaryColor?.toUpperCase() === c.hex.toUpperCase() && (
                                                            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">✓</span>
                                                        )}
                                                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            {c.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Custom color picker */}
                                            <div className="flex items-center gap-3 pt-2">
                                                <input
                                                    id="primary-color-input"
                                                    type="color"
                                                    value={globalForm.primaryColor}
                                                    onChange={(e) => {
                                                        setGlobalForm((f) => ({ ...f, primaryColor: e.target.value }));
                                                        setPrimaryColor(e.target.value);
                                                    }}
                                                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-200 dark:border-slate-600 p-0.5"
                                                />
                                                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{globalForm.primaryColor}</span>
                                                <span className="text-xs text-slate-400">← Color personalizado</span>
                                            </div>

                                            {/* Live preview bar */}
                                            <div
                                                className="h-3 rounded-full shadow-inner transition-colors duration-300"
                                                style={{ backgroundColor: globalForm.primaryColor }}
                                            />
                                        </div>
                                    </Field>
                                </div>

                                {/* Warning when changing tax */}
                                {String(globalForm.default_tax_rate) !== String(raw.default_tax_rate) && (
                                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                                        <span className="text-xl leading-none">⚠️</span>
                                        <p>
                                            Estás cambiando el IVA de <strong>{raw.default_tax_rate}%</strong> a{' '}
                                            <strong>{globalForm.default_tax_rate}%</strong>. Este cambio afectará
                                            todos los nuevos tickets emitidos en todos los terminales.
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button
                                        id="save-global-settings-btn"
                                        type="submit"
                                        disabled={isSavingGlobal}
                                        className="px-8 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSavingGlobal ? (
                                            <>
                                                <span className="animate-spin">⟳</span>
                                                Guardando...
                                            </>
                                        ) : (
                                            '💾 Guardar Ajustes Globales'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ── Credit Sales Toggle ─────────────────────────── */}
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-5 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="text-lg">📒</span> Permitir Ventas a Crédito (Fiado)
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-md">
                                        Habilita la opción de vender a crédito en el punto de venta.
                                        Al activarlo, aparecerá una pestaña "Fiado" en el modal de cobro
                                        y se habilitará el cuaderno digital de deudas.
                                    </p>
                                </div>
                                <button
                                    id="credit-sales-toggle"
                                    onClick={async () => {
                                        const newValue = globalForm.enable_credit_sales === 'true' ? 'false' : 'true';
                                        setGlobalForm(f => ({ ...f, enable_credit_sales: newValue }));
                                        // Auto-save this toggle immediately
                                        try {
                                            const token = localStorage.getItem('pos_token');
                                            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
                                            await fetch(`${apiUrl}/settings`, {
                                                method: 'PATCH',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    Authorization: `Bearer ${token}`,
                                                },
                                                body: JSON.stringify({ enable_credit_sales: newValue }),
                                            });
                                            refetch();
                                            showToast(
                                                newValue === 'true'
                                                    ? 'Ventas a crédito habilitadas'
                                                    : 'Ventas a crédito deshabilitadas',
                                                'success'
                                            );
                                        } catch {
                                            showToast('Error al guardar configuración', 'error');
                                        }
                                    }}
                                    className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${
                                        globalForm.enable_credit_sales === 'true'
                                            ? 'bg-emerald-600'
                                            : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                                    aria-label="Toggle Ventas a Crédito"
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                                            globalForm.enable_credit_sales === 'true' ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                            {globalForm.enable_credit_sales === 'true' && (
                                <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
                                    <span className="text-lg">✅</span>
                                    <span>Ventas a Crédito <strong>HABILITADAS</strong>. La pestaña "Fiado" aparecerá en el modal de cobro.</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* ── SECTION 4: Seguridad ─────────────────────────────── */}
                    <Card icon="🔒" title="Seguridad de la Cuenta" badge="Personal">
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Contraseña Actual
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={pwdForm.currentPassword}
                                    onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={pwdForm.newPassword}
                                        onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                        placeholder="Min 6 caracteres"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={pwdForm.confirmPassword}
                                        onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                        placeholder="Repetir clave"
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isChangingPwd || !pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword}
                                    className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl shadow-md disabled:bg-slate-300 disabled:dark:bg-slate-600 transition-colors flex items-center justify-center min-w-[180px]"
                                >
                                    {isChangingPwd ? 'Actualizando...' : 'Cambiar Contraseña'}
                                </button>
                            </div>
                        </form>
                    </Card>

                    {/* ── Info footer ──────────────────────────────────────── */}
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 pb-4">
                        Los cambios globales se replican en tiempo real a todos los terminales conectados.
                        Los terminales offline usarán el último valor conocido hasta que recuperen conectividad.
                    </p>
                </div>
            </main>

            {toast && <Toast msg={toast.msg} type={toast.type} />}
        </div>
    );
};

export default SettingsPage;
