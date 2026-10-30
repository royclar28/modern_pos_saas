/**
 * ShiftManagerModal.tsx — Apertura y Cierre de Turnos de Caja.
 *
 * Two states:
 *   - NO OPEN SHIFT → Show "Open Shift" form (starting cash input)
 *   - OPEN SHIFT    → Show shift summary + "Close Shift" form (actual cash input)
 */
import { useState } from 'react';
import { useCashShift } from '../hooks/useCashShift';

const PAYMENT_LABELS: Record<string, string> = {
    DIVISA: '💵 Efectivo USD',
    EFECTIVO_BS: '🇻🇪 Efectivo Bs.',
    PAGO_MOVIL: '📱 Pago Móvil',
    PUNTO: '💳 Punto de Venta',
    FIADO: '📝 Crédito',
    OTRO: '📦 Otro',
};

interface ShiftManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShiftManagerModal = ({ isOpen, onClose }: ShiftManagerModalProps) => {
    const {
        hasOpenShift,
        currentShift,
        summary,
        openNewShift,
        closeShift,
    } = useCashShift();

    const [startingCash, setStartingCash] = useState('');
    const [actualCash, setActualCash] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [closeReport, setCloseReport] = useState<{
        expectedCash: number;
        actualCash: number;
        difference: number;
        salesSummary: Record<string, number>;
    } | null>(null);

    if (!isOpen) return null;

    const handleOpenShift = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(startingCash);
        if (isNaN(amount) || amount < 0) return;

        setIsSubmitting(true);
        try {
            await openNewShift(amount);
            setStartingCash('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseShift = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(actualCash);
        if (isNaN(amount) || amount < 0) return;

        setIsSubmitting(true);
        try {
            const report = await closeShift(amount);
            setCloseReport(report);
            setActualCash('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDismissReport = () => {
        setCloseReport(null);
        onClose();
    };

    const formatCurrency = (n: number) => `$${n.toFixed(2)}`;
    const shiftDuration = currentShift
        ? Math.floor((Date.now() - currentShift.openedAt) / 60_000)
        : 0;

    // ── CLOSE REPORT VIEW ─────────────────────────────────────────
    if (closeReport) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            ✅ Corte Z — Turno Cerrado
                        </h2>
                        <p className="text-emerald-100 text-sm mt-1">Resumen final del turno</p>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Summary grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">Esperado</div>
                                <div className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(closeReport.expectedCash)}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">Declarado</div>
                                <div className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(closeReport.actualCash)}</div>
                            </div>
                        </div>

                        {/* Difference */}
                        <div className={`rounded-xl p-4 text-center ${
                            closeReport.difference === 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50'
                                : closeReport.difference > 0
                                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50'
                                    : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50'
                        }`}>
                            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Diferencia</div>
                            <div className={`text-2xl font-black ${
                                closeReport.difference === 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : closeReport.difference > 0
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-red-600 dark:text-red-400'
                            }`}>
                                {closeReport.difference > 0 ? '+' : ''}{formatCurrency(closeReport.difference)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {closeReport.difference === 0 ? '✨ Caja cuadrada' : closeReport.difference > 0 ? 'Sobrante' : '⚠️ Faltante'}
                            </div>
                        </div>

                        {/* Sales by method */}
                        {Object.keys(closeReport.salesSummary).length > 0 && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                    Ventas por Método
                                </div>
                                {Object.entries(closeReport.salesSummary).map(([method, total]) => (
                                    <div key={method} className="px-4 py-2.5 flex justify-between items-center border-t border-slate-100 dark:border-slate-700 text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">{PAYMENT_LABELS[method] || method}</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(total)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleDismissReport}
                            className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
                        >
                            Cerrar Reporte
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── MAIN MODAL ────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-5 text-white ${
                    hasOpenShift
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {hasOpenShift ? '🟢 Turno Activo' : '🔒 Caja Cerrada'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition-colors"
                        >
                            ×
                        </button>
                    </div>
                    <p className="text-sm mt-1 opacity-80">
                        {hasOpenShift
                            ? `Abierto hace ${shiftDuration} min · ${currentShift?.terminalId}`
                            : 'Ingresa el fondo de caja para iniciar operaciones'}
                    </p>
                </div>

                <div className="p-6">
                    {!hasOpenShift ? (
                        /* ── OPEN SHIFT FORM ─────────────────────────── */
                        <form onSubmit={handleOpenShift} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    💰 Fondo de Caja Inicial (USD)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={startingCash}
                                    onChange={e => setStartingCash(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                    required
                                    className="w-full text-3xl font-black text-center py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30 outline-none transition-all"
                                />
                                <p className="text-xs text-slate-400 text-center">
                                    Declara cuánto efectivo hay en la gaveta antes de iniciar
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !startingCash}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-amber-200 dark:shadow-none transition-all"
                            >
                                {isSubmitting ? '⏳ Abriendo...' : '🔓 Abrir Turno'}
                            </button>
                        </form>
                    ) : (
                        /* ── CLOSE SHIFT VIEW ────────────────────────── */
                        <div className="space-y-5">
                            {/* Shift summary */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-violet-50 dark:bg-violet-950/40 rounded-xl p-3">
                                    <div className="text-xs text-violet-500 dark:text-violet-400 font-semibold uppercase">Fondo</div>
                                    <div className="text-lg font-black text-violet-700 dark:text-violet-300">
                                        {formatCurrency(currentShift?.startingCash || 0)}
                                    </div>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3">
                                    <div className="text-xs text-emerald-500 dark:text-emerald-400 font-semibold uppercase">Ventas</div>
                                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                                        {summary ? summary.saleCount : '—'}
                                    </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3">
                                    <div className="text-xs text-blue-500 dark:text-blue-400 font-semibold uppercase">Esperado</div>
                                    <div className="text-lg font-black text-blue-700 dark:text-blue-300">
                                        {summary ? formatCurrency(summary.expectedCash) : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Sales breakdown */}
                            {summary && Object.keys(summary.salesByMethod).length > 0 && (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                        Desglose por Método
                                    </div>
                                    {Object.entries(summary.salesByMethod).map(([method, total]) => (
                                        <div key={method} className="px-4 py-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-700 text-sm">
                                            <span className="text-slate-600 dark:text-slate-300">{PAYMENT_LABELS[method] || method}</span>
                                            <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(total)}</span>
                                        </div>
                                    ))}
                                    <div className="px-4 py-2.5 flex justify-between items-center border-t-2 border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-900">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">Total Vendido</span>
                                        <span className="font-black text-slate-900 dark:text-white">{formatCurrency(summary.totalSales)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Close form */}
                            <form onSubmit={handleCloseShift} className="space-y-3">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    🔢 Conteo Físico Final (USD)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={actualCash}
                                    onChange={e => setActualCash(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                    required
                                    className="w-full text-3xl font-black text-center py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30 outline-none transition-all"
                                />

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !actualCash}
                                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-all"
                                >
                                    {isSubmitting ? '⏳ Cerrando...' : '🔐 Cerrar Caja (Corte Z)'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
