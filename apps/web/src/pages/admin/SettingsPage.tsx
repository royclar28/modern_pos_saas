/**
 * SettingsPage.tsx
 *
 * Two-section admin panel:
 *   1. "Ajustes de Este Equipo" — local terminal name stored in localStorage.
 *   2. "Ajustes del Negocio"   — global store settings patched via PATCH /settings.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTerminal } from '../../hooks/useTerminal';
import { useSettings, StoreSettings } from '../../hooks/useSettings';
import { useHighVisibility } from '../../hooks/useHighVisibility';

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
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            {label}
        </label>
        {children}
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
                <h2 className="text-base font-bold text-slate-800">{title}</h2>
            </div>
            {badge && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
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
    const { raw, taxRate, isLoading, error, refetch } = useSettings();
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
    });

    const [isSavingGlobal, setIsSavingGlobal] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
            const apiUrl = `http://${window.location.hostname}:3333/api` || 'http://localhost:3333';
            const res = await fetch(`${apiUrl}/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(globalForm),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await refetch();
            showToast('Ajustes globales guardados', 'success');
        } catch (err) {
            showToast(`Error al guardar: ${(err as Error).message}`, 'error');
        } finally {
            setIsSavingGlobal(false);
        }
    };

    const inputClass =
        'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all';

    return (
        <div className="flex flex-col h-screen bg-slate-50">
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
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Page heading */}
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800">Ajustes</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Configura este equipo y los parámetros globales del negocio.
                        </p>
                    </div>

                    {/* ── SECTION 1: Este equipo ─────────────────────────────── */}
                    <Card icon="🖥️" title="Ajustes de Este Equipo" badge="Local">
                        <p className="text-sm text-slate-500 -mt-2">
                            Este identificador se guarda <strong>solo en este navegador</strong>. Cada caja registradora
                            debe tener un nombre único para que el Reporte Z pueda segregar las ventas por terminal.
                        </p>

                        {/* Multi-Caja explanation box */}
                        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800 space-y-1">
                            <p className="font-bold flex items-center gap-2">🔀 ¿Cómo funciona el Multi-Caja?</p>
                            <ul className="list-disc list-inside space-y-1 text-violet-700">
                                <li>Cada instancia del POS en un dispositivo diferente tiene su propio <code className="bg-violet-100 px-1 rounded text-xs">terminalId</code>.</li>
                                <li>El ID se escribe en cada ticket (<code className="bg-violet-100 px-1 rounded text-xs">SaleDoc.terminalId</code>) al momento del cobro.</li>
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
                                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-bold rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Guardar
                                </button>
                            </div>
                        </Field>

                        {/* Current value display */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-2.5">
                            <span>Terminal activa:</span>
                            <code className="font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded text-sm">
                                {getTerminalId()}
                            </code>
                        </div>

                        {/* High Visibility Mode Toggle */}
                        <div className="border-t border-slate-100 pt-5 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
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
                                            ? 'bg-violet-600'
                                            : 'bg-slate-300'
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
                                <div className="mt-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-800 font-medium flex items-center gap-2">
                                    <span className="text-lg">✅</span>
                                    <span>Modo de Alta Visibilidad <strong>ACTIVO</strong>. La interfaz POS mostrará elementos agrandados.</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* ── SECTION 2: Negocio (Global) ───────────────────────── */}
                    <Card icon="🏢" title="Ajustes del Negocio" badge="Global · Todos los terminales">
                        <p className="text-sm text-slate-500 -mt-2">
                            Estos valores se guardan en el servidor y afectan a <strong>todos los terminales</strong> simultáneamente.
                            El cambio en el IVA se aplica inmediatamente al siguiente ciclo de cobro en cada caja.
                        </p>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
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
                                    <Field label="Nombre del Negocio" hint="Aparece en tickets e informes">
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
                                            placeholder="America/Mexico_City"
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                {/* Warning when changing tax */}
                                {String(globalForm.default_tax_rate) !== String(raw.default_tax_rate) && (
                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
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
                                        className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
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
                        <div className="border-t border-slate-100 pt-5 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
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
                                            const apiUrl = `http://${window.location.hostname}:3333/api` || 'http://localhost:3333';
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
                                            : 'bg-slate-300'
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
                                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 font-medium flex items-center gap-2">
                                    <span className="text-lg">✅</span>
                                    <span>Ventas a Crédito <strong>HABILITADAS</strong>. La pestaña "Fiado" aparecerá en el modal de cobro.</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* ── Info footer ──────────────────────────────────────── */}
                    <p className="text-center text-xs text-slate-400 pb-4">
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
