/**
 * SettingsPage.tsx
 *
 * Refactored into a sidebar-nav + tabbed layout to reduce vertical scroll.
 * Tabs:
 *   1. Negocio       — Global store settings (IVA, name, currency, color)
 *   2. Este Equipo   — Local terminal settings (terminalId, high visibility)
 *   3. Facturación   — SENIAT fiscal resolutions management
 *   4. Seguridad     — Password change
 */
import { useState, useEffect } from 'react';
import { useTerminal } from '../../hooks/useTerminal';
import { useSettingsContext as useSettings } from '../../contexts/SettingsProvider';
import { useHighVisibility } from '../../hooks/useHighVisibility';
import { useFiscalPrinter } from '../../hooks/useFiscalPrinter';
import { AppHeader } from '../../components/AppHeader';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
const token = () => localStorage.getItem('pos_token');

// ─── Color Palette ─────────────────────────────────────────────────────────────
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</label>
        {children}
        {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="mb-6">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
    </div>
);

const Toast = ({ msg, type }: { msg: string; type: 'success' | 'error' }) => (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold animate-[fadeInUp_0.3s_ease] ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
        <span>{type === 'success' ? '✅' : '❌'}</span>{msg}
    </div>
);

const inputClass = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';

// ─── TABS ──────────────────────────────────────────────────────────────────────
type Tab = 'negocio' | 'equipo' | 'fiscal' | 'seguridad';

const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'negocio',   icon: '🏢', label: 'Negocio'         },
    { id: 'equipo',    icon: '🖥️', label: 'Este Equipo'     },
    { id: 'fiscal',    icon: '📄', label: 'Facturación'     },
    { id: 'seguridad', icon: '🔒', label: 'Seguridad'       },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const SettingsPage = () => {
    const { getTerminalId, setTerminalId } = useTerminal();
    const { raw, taxRate, isLoading, error, refetch, setCompany, setPrimaryColor, toggleDarkMode, darkMode } = useSettings();
    const { isHighVis, toggleHighVis } = useHighVisibility();
    const { port, connect, testPrinter } = useFiscalPrinter();

    const [activeTab, setActiveTab] = useState<Tab>('negocio');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Local terminal form
    const [localTerminal, setLocalTerminal] = useState('');
    useEffect(() => { setLocalTerminal(getTerminalId()); }, []);
    const handleSaveTerminal = () => {
        const trimmed = localTerminal.trim();
        if (!trimmed) return;
        setTerminalId(trimmed);
        showToast(`Caja guardada como "${trimmed}"`, 'success');
    };

    // Global settings form
    const [globalForm, setGlobalForm] = useState({ company: '', currency_symbol: '', default_tax_rate: '', timezone: '', primaryColor: '#7C3AED', enable_credit_sales: 'false' });
    useEffect(() => {
        if (raw) setGlobalForm({ company: raw.company || '', currency_symbol: raw.currency_symbol || '$', default_tax_rate: String(raw.default_tax_rate ?? 16), timezone: raw.timezone || 'America/Caracas', primaryColor: raw.primaryColor || '#7C3AED', enable_credit_sales: raw.enable_credit_sales || 'false' });
    }, [raw]);

    const [isSavingGlobal, setIsSavingGlobal] = useState(false);
    const handleSaveGlobal = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingGlobal(true);
        try {
            const res = await fetch(`${apiUrl}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(globalForm) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setCompany(globalForm.company);
            setPrimaryColor(globalForm.primaryColor || '#7C3AED');
            localStorage.setItem('pos_store_name', globalForm.company);
            await refetch();
            showToast('Ajustes globales guardados', 'success');
        } catch (err) {
            showToast(`Error al guardar: ${(err as Error).message}`, 'error');
        } finally {
            setIsSavingGlobal(false);
        }
    };

    // Password form
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isChangingPwd, setIsChangingPwd] = useState(false);
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwdForm.newPassword !== pwdForm.confirmPassword) return showToast('Las contraseñas no coinciden', 'error');
        if (pwdForm.newPassword.length < 6) return showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        setIsChangingPwd(true);
        try {
            const res = await fetch(`${apiUrl}/auth/change-password`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
            showToast('Contraseña actualizada con éxito', 'success');
            setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            showToast(error.message || 'Hubo un error', 'error');
        } finally {
            setIsChangingPwd(false);
        }
    };

    // Fiscal resolutions
    const [docTypes, setDocTypes] = useState<any[]>([]);
    const [resolutions, setResolutions] = useState<any[]>([]);
    const [isLoadingFiscal, setIsLoadingFiscal] = useState(false);
    const [isSavingFiscal, setIsSavingFiscal] = useState(false);
    const [showFiscalForm, setShowFiscalForm] = useState(false);
    const [fiscalForm, setFiscalForm] = useState({ document_type_id: '', prefix: '', from_number: '', to_number: '', resolution_number: '', resolution_date: '' });

    const fetchFiscalData = async () => {
        setIsLoadingFiscal(true);
        try {
            const [dtRes, rRes] = await Promise.all([
                fetch(`${apiUrl}/fiscal/document-types`, { headers: { Authorization: `Bearer ${token()}` } }),
                fetch(`${apiUrl}/fiscal/resolutions`, { headers: { Authorization: `Bearer ${token()}` } }),
            ]);
            if (dtRes.ok) setDocTypes(await dtRes.json());
            if (rRes.ok) setResolutions(await rRes.json());
        } catch {}
        setIsLoadingFiscal(false);
    };

    useEffect(() => { if (activeTab === 'fiscal') fetchFiscalData(); }, [activeTab]);

    const handleSaveFiscal = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingFiscal(true);
        try {
            const res = await fetch(`${apiUrl}/fiscal/resolutions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ ...fiscalForm, from_number: Number(fiscalForm.from_number), to_number: Number(fiscalForm.to_number) }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
            showToast('Resolución fiscal registrada', 'success');
            setShowFiscalForm(false);
            setFiscalForm({ document_type_id: '', prefix: '', from_number: '', to_number: '', resolution_number: '', resolution_date: '' });
            fetchFiscalData();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsSavingFiscal(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            <AppHeader
                icon="⚙️"
                title="Configuración"
                links={[{ to: '/', label: '← Dashboard' }, { to: '/pos', label: 'Ir al POS →' }]}
                actions={
                    <div className="flex items-center gap-2 text-xs text-slate-400 mr-2">
                        {isLoading ? <span className="animate-pulse">Cargando ajustes...</span> : error ? <span className="text-amber-400">⚠️ Usando valores offline</span> : null}
                    </div>
                }
            />

            <div className="flex flex-1 overflow-hidden">
                {/* ── Sidebar Nav ─────────────────────────────────────────── */}
                <aside className="w-56 shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col gap-1 p-3 overflow-y-auto">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 pt-2 pb-1">Ajustes</p>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${activeTab === tab.id ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <span className="text-base">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </aside>

                {/* ── Tab Content ─────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-2xl mx-auto space-y-6">

                        {/* ═══════════ TAB: NEGOCIO ═══════════ */}
                        {activeTab === 'negocio' && (
                            <>
                                <SectionHeader title="Ajustes del Negocio" subtitle="Parámetros globales que afectan a todos los terminales." />
                                {isLoading ? (
                                    <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
                                ) : (
                                    <form id="global-settings-form" onSubmit={handleSaveGlobal} className="space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <Field label="Tasa de IVA (%)" hint={`Valor en uso: ${taxRate}%`}>
                                                <div className="relative">
                                                    <input id="tax-rate-input" type="number" min="0" max="100" step="0.01" value={globalForm.default_tax_rate} onChange={e => setGlobalForm(f => ({ ...f, default_tax_rate: e.target.value }))} className={inputClass + ' pr-8'} required />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
                                                </div>
                                            </Field>
                                            <Field label="Símbolo de Moneda" hint="Ejemplo: $, Bs., €">
                                                <input id="currency-symbol-input" type="text" maxLength={5} value={globalForm.currency_symbol} onChange={e => setGlobalForm(f => ({ ...f, currency_symbol: e.target.value }))} className={inputClass} required />
                                            </Field>
                                            <Field label="Nombre del Negocio" hint="Aparece en tickets y la interfaz">
                                                <input id="company-name-input" type="text" value={globalForm.company} onChange={e => setGlobalForm(f => ({ ...f, company: e.target.value }))} className={inputClass} />
                                            </Field>
                                            <Field label="Zona Horaria" hint="Afecta el cálculo de fechas">
                                                <input id="timezone-input" type="text" value={globalForm.timezone} onChange={e => setGlobalForm(f => ({ ...f, timezone: e.target.value }))} placeholder="America/Caracas" className={inputClass} />
                                            </Field>
                                        </div>

                                        {/* Color Palette */}
                                        <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                                            <Field label="Color de la Marca" hint="Elige un color de la paleta">
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {COLOR_PALETTE.map(c => (
                                                        <button key={c.hex} type="button" onClick={() => { setGlobalForm(f => ({ ...f, primaryColor: c.hex })); setPrimaryColor(c.hex); }} className={`w-9 h-9 rounded-xl transition-all hover:scale-110 relative group ${globalForm.primaryColor?.toUpperCase() === c.hex.toUpperCase() ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-110' : ''}`} style={{ backgroundColor: c.hex }} title={c.name}>
                                                            {globalForm.primaryColor?.toUpperCase() === c.hex.toUpperCase() && <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">✓</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <input id="primary-color-input" type="color" value={globalForm.primaryColor} onChange={e => { setGlobalForm(f => ({ ...f, primaryColor: e.target.value })); setPrimaryColor(e.target.value); }} className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-200 dark:border-slate-600 p-0.5" />
                                                    <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{globalForm.primaryColor}</span>
                                                </div>
                                                <div className="h-2 rounded-full mt-2 transition-colors" style={{ backgroundColor: globalForm.primaryColor }} />
                                            </Field>
                                        </div>

                                        {/* Dark Mode */}
                                        <div className="border-t border-slate-100 dark:border-slate-700 pt-5 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">🌙 Modo Oscuro</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Solo afecta a este terminal</p>
                                            </div>
                                            <button type="button" id="dark-mode-toggle" onClick={toggleDarkMode} className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${darkMode ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} aria-label="Toggle Dark Mode">
                                                <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {/* Ventas a Crédito */}
                                        <div className="border-t border-slate-100 dark:border-slate-700 pt-5 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">📒 Ventas a Crédito</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Habilita el módulo de deudas (Fiados)</p>
                                            </div>
                                            <button type="button" id="credit-sales-toggle" onClick={async () => {
                                                const newValue = globalForm.enable_credit_sales === 'true' ? 'false' : 'true';
                                                setGlobalForm(f => ({ ...f, enable_credit_sales: newValue }));
                                                try {
                                                    await fetch(`${apiUrl}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ enable_credit_sales: newValue }) });
                                                    refetch();
                                                    showToast(newValue === 'true' ? 'Ventas a crédito habilitadas' : 'Ventas a crédito deshabilitadas', 'success');
                                                } catch { showToast('Error al guardar', 'error'); }
                                            }} className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${globalForm.enable_credit_sales === 'true' ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`} aria-label="Toggle Ventas a Crédito">
                                                <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${globalForm.enable_credit_sales === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {String(globalForm.default_tax_rate) !== String(raw.default_tax_rate) && (
                                            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                                                <span className="text-xl">⚠️</span>
                                                <p>Estás cambiando el IVA de <strong>{raw.default_tax_rate}%</strong> a <strong>{globalForm.default_tax_rate}%</strong>. Afectará todos los terminales.</p>
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-2">
                                            <button id="save-global-settings-btn" type="submit" disabled={isSavingGlobal} className="px-8 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                                                {isSavingGlobal ? <><span className="animate-spin">⟳</span> Guardando...</> : '💾 Guardar Ajustes Globales'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </>
                        )}

                        {/* ═══════════ TAB: EQUIPO ═══════════ */}
                        {activeTab === 'equipo' && (
                            <>
                                <SectionHeader title="Ajustes de Este Equipo" subtitle="Configuración local del terminal. Solo afecta a este dispositivo." />
                                
                                <div className="bg-primary-light dark:bg-slate-700 border border-primary/20 dark:border-slate-600 rounded-xl p-4 text-sm text-primary dark:text-slate-300 space-y-1">
                                    <p className="font-bold flex items-center gap-2">🔀 ¿Cómo funciona el Multi-Caja?</p>
                                    <ul className="list-disc list-inside space-y-1 opacity-90">
                                        <li>Cada instancia del POS en un dispositivo tiene su propio <code className="bg-white/50 dark:bg-slate-600 px-1 rounded text-xs">terminalId</code>.</li>
                                        <li>El ID se escribe en cada ticket al momento del cobro.</li>
                                        <li>El Reporte Z puede segregar ventas por terminal.</li>
                                    </ul>
                                </div>

                                <Field label="Nombre de Esta Caja" hint='Ejemplo: "Caja Principal", "Caja 2", "Ventanilla B"'>
                                    <div className="flex gap-3">
                                        <input id="terminal-id-input" type="text" value={localTerminal} onChange={e => setLocalTerminal(e.target.value)} placeholder="CAJA_01" className={inputClass} onKeyDown={e => e.key === 'Enter' && handleSaveTerminal()} />
                                        <button id="save-terminal-btn" onClick={handleSaveTerminal} disabled={!localTerminal.trim()} className="px-5 py-2 bg-primary hover:bg-primary-hover active:scale-95 text-white text-sm font-bold rounded-lg shadow-sm transition-all disabled:opacity-40 whitespace-nowrap">Guardar</button>
                                    </div>
                                </Field>

                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-lg px-4 py-2.5">
                                    <span>Terminal activa:</span>
                                    <code className="font-mono font-bold text-primary bg-primary-light dark:bg-slate-600 px-2 py-0.5 rounded text-sm">{getTerminalId()}</code>
                                </div>

                                {/* High Visibility */}
                                <div className="border-t border-slate-100 dark:border-slate-700 pt-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><span>👁️</span> Modo de Alta Visibilidad</p>
                                        <p className="text-xs text-slate-400 mt-1 max-w-sm">Textos grandes y botones enormes. Ideal para pantallas pequeñas o visión reducida. Solo afecta a <strong>este terminal</strong>.</p>
                                    </div>
                                    <button id="high-vis-toggle" onClick={toggleHighVis} className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${isHighVis ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} aria-label="Toggle High Visibility Mode">
                                        <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isHighVis ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                {isHighVis && (
                                    <div className="bg-primary-light dark:bg-slate-700 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary dark:text-slate-300 font-medium flex items-center gap-2">
                                        <span>✅</span><span>Modo de Alta Visibilidad <strong>ACTIVO</strong>.</span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ═══════════ TAB: FACTURACIÓN FISCAL ═══════════ */}
                        {activeTab === 'fiscal' && (
                            <>
                                <SectionHeader title="Facturación Fiscal (SENIAT)" subtitle="Gestiona los lotes de números de control autorizados por el SENIAT para emitir documentos fiscales." />

                                {/* Impresora Fiscal (Web Serial) */}
                                <div className="mb-6 p-4 bg-violet-50 dark:bg-slate-800 rounded-2xl border border-violet-100 dark:border-slate-700">
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">🖨️ Impresora Fiscal Física</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        Conecta tu impresora fiscal (Ej. The Factory HKA) directamente por USB/COM usando Web Serial.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={async () => {
                                            try {
                                                await connect();
                                                showToast('Impresora conectada exitosamente', 'success');
                                            } catch (e: any) {
                                                showToast(e.message || 'Error al conectar', 'error');
                                            }
                                        }} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all">
                                            {port ? 'Reconectar Puerto' : 'Conectar Impresora'}
                                        </button>
                                        <button type="button" onClick={async () => {
                                            try {
                                                await testPrinter();
                                                showToast('Comando de prueba enviado', 'success');
                                            } catch (e: any) {
                                                showToast('Error de comunicación: ' + e.message, 'error');
                                            }
                                        }} className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition-all">
                                            Test de Conexión
                                        </button>
                                    </div>
                                    {port && (
                                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Puerto autorizado. Listo para facturar en la Caja.
                                        </div>
                                    )}
                                </div>

                                {isLoadingFiscal ? (
                                    <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}</div>
                                ) : (
                                    <>
                                        {/* Resoluciones activas */}
                                        {resolutions.length === 0 ? (
                                            <div className="text-center py-12 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600">
                                                <p className="text-4xl mb-3">📄</p>
                                                <p className="font-bold text-slate-600 dark:text-slate-300">Sin resoluciones registradas</p>
                                                <p className="text-sm text-slate-400 mt-1">Registra el lote que te autorizó el SENIAT para comenzar a emitir facturas digitales.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Resoluciones Registradas</p>
                                                {resolutions.map((r: any) => {
                                                    const used = r.current_number - r.from_number;
                                                    const total = r.to_number - r.from_number + 1;
                                                    const pct = Math.min(100, Math.round((used / total) * 100));
                                                    return (
                                                        <div key={r.id} className={`bg-white dark:bg-slate-800 rounded-2xl border ${r.is_active ? 'border-emerald-400 dark:border-emerald-600 shadow-sm shadow-emerald-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700 opacity-60'} p-4`}>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        {r.is_active && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase">Activa</span>}
                                                                        <span className="font-bold text-slate-800 dark:text-white text-sm">{r.document_type?.name ?? 'Tipo desconocido'}</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 mt-1">
                                                                        Rango: <span className="font-mono">{r.prefix}{String(r.from_number).padStart(8,'0')}</span> → <span className="font-mono">{r.prefix}{String(r.to_number).padStart(8,'0')}</span>
                                                                    </p>
                                                                    {r.resolution_number && <p className="text-xs text-slate-400">Providencia: <strong>{r.resolution_number}</strong> | Fecha: {r.resolution_date}</p>}
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-sm font-black text-slate-800 dark:text-white font-mono">{r.prefix}{String(r.current_number).padStart(8,'0')}</p>
                                                                    <p className="text-[10px] text-slate-400">Próximo a emitir</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3">
                                                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                                                    <span>{used} usados de {total}</span>
                                                                    <span>{pct}%</span>
                                                                </div>
                                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Botón añadir */}
                                        {!showFiscalForm ? (
                                            <button onClick={() => setShowFiscalForm(true)} className="w-full mt-4 py-3 border-2 border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary-light dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                                                ＋ Registrar Nuevo Rango / Lote
                                            </button>
                                        ) : (
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mt-4">
                                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">📋 Nuevo Rango Fiscal</h3>
                                                <form onSubmit={handleSaveFiscal} className="space-y-4">
                                                    <Field label="Tipo de Documento">
                                                        <select required value={fiscalForm.document_type_id} onChange={e => setFiscalForm(f => ({ ...f, document_type_id: e.target.value }))} className={inputClass}>
                                                            <option value="">Seleccionar tipo...</option>
                                                            {docTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.code} — {dt.name}</option>)}
                                                        </select>
                                                    </Field>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Field label="Número Inicial" hint="Ej: 1">
                                                            <input required type="number" min="1" value={fiscalForm.from_number} onChange={e => setFiscalForm(f => ({ ...f, from_number: e.target.value }))} className={inputClass} placeholder="1" />
                                                        </Field>
                                                        <Field label="Número Final" hint="Ej: 5000">
                                                            <input required type="number" min="1" value={fiscalForm.to_number} onChange={e => setFiscalForm(f => ({ ...f, to_number: e.target.value }))} className={inputClass} placeholder="5000" />
                                                        </Field>
                                                    </div>

                                                    <Field label="Prefijo (opcional)" hint='Ej: "00-" si el SENIAT lo requiere'>
                                                        <input type="text" maxLength={10} value={fiscalForm.prefix} onChange={e => setFiscalForm(f => ({ ...f, prefix: e.target.value }))} className={inputClass} placeholder="Ej: 00-" />
                                                    </Field>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Field label="N° de Providencia" hint="Número de la resolución del SENIAT">
                                                            <input type="text" value={fiscalForm.resolution_number} onChange={e => setFiscalForm(f => ({ ...f, resolution_number: e.target.value }))} className={inputClass} />
                                                        </Field>
                                                        <Field label="Fecha de Providencia">
                                                            <input type="date" value={fiscalForm.resolution_date} onChange={e => setFiscalForm(f => ({ ...f, resolution_date: e.target.value }))} className={inputClass} />
                                                        </Field>
                                                    </div>

                                                    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                                                        ⚠️ <strong>Al registrar un nuevo rango</strong>, el rango anterior del mismo tipo de documento se desactivará automáticamente.
                                                    </div>

                                                    <div className="flex gap-3 pt-2">
                                                        <button type="button" onClick={() => setShowFiscalForm(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Cancelar</button>
                                                        <button type="submit" disabled={isSavingFiscal} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover disabled:opacity-50 transition-all">
                                                            {isSavingFiscal ? 'Guardando...' : '✅ Registrar Rango'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* ═══════════ TAB: SEGURIDAD ═══════════ */}
                        {activeTab === 'seguridad' && (
                            <>
                                <SectionHeader title="Seguridad de la Cuenta" subtitle="Actualiza tu contraseña de acceso al sistema." />
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <Field label="Contraseña Actual">
                                        <input type="password" required value={pwdForm.currentPassword} onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} className={inputClass} placeholder="••••••••" />
                                    </Field>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="Nueva Contraseña">
                                            <input type="password" required minLength={6} value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} className={inputClass} placeholder="Min 6 caracteres" />
                                        </Field>
                                        <Field label="Confirmar Nueva Contraseña">
                                            <input type="password" required minLength={6} value={pwdForm.confirmPassword} onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} className={inputClass} placeholder="Repetir clave" />
                                        </Field>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <button type="submit" disabled={isChangingPwd || !pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword} className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl shadow-md disabled:bg-slate-300 dark:disabled:bg-slate-600 transition-colors flex items-center justify-center min-w-[180px]">
                                            {isChangingPwd ? 'Actualizando...' : 'Cambiar Contraseña'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                    </div>
                </main>
            </div>

            {toast && <Toast msg={toast.msg} type={toast.type} />}
        </div>
    );
};

export default SettingsPage;
