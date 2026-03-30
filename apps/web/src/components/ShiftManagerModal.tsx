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
    FIADO: '📝 Fiado',
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
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in">
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
                            <div className="bg-slate-50 rounded-xl p-3 text-center">
                                <div className="text-slate-500 text-xs font-semibold uppercase">Esperado</div>
                                <div className="text-lg font-bold text-slate-800">{formatCurrency(closeReport.expectedCash)}</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 text-center">
                                <div className="text-slate-500 text-xs font-semibold uppercase">Declarado</div>
                                <div className="text-lg font-bold text-slate-800">{formatCurrency(closeReport.actualCash)}</div>
                            </div>
                        </div>

                        {/* Difference */}
                        <div className={`rounded-xl p-4 text-center ${
                            closeReport.difference === 0
                                ? 'bg-emerald-50 border border-emerald-200'
                                : closeReport.difference > 0
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Diferencia</div>
                            <div className={`text-2xl font-black ${
                                closeReport.difference === 0
                                    ? 'text-emerald-600'
                                    : closeReport.difference > 0
                                        ? 'text-blue-600'
                                        : 'text-red-600'
                            }`}>
                                {closeReport.difference > 0 ? '+' : ''}{formatCurrency(closeReport.difference)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {closeReport.difference === 0 ? '✨ Caja cuadrada' : closeReport.difference > 0 ? 'Sobrante' : '⚠️ Faltante'}
                            </div>
                        </div>

                        {/* Sales by method */}
                        {Object.keys(closeReport.salesSummary).length > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                    Ventas por Método
                                </div>
                                {Object.entries(closeReport.salesSummary).map(([method, total]) => (
                                    <div key={method} className="px-4 py-2.5 flex justify-between items-center border-t border-slate-100 text-sm">
                                        <span className="text-slate-600">{PAYMENT_LABELS[method] || method}</span>
                                        <span className="font-bold text-slate-800">{formatCurrency(total)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleDismissReport}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
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
                                    className="w-full text-3xl font-black text-center py-4 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                                />
                                <p className="text-xs text-slate-400 text-center">
                                    Declara cuánto efectivo hay en la gaveta antes de iniciar
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !startingCash}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-amber-200 transition-all"
                            >
                                {isSubmitting ? '⏳ Abriendo...' : '🔓 Abrir Turno'}
                            </button>
                        </form>
                    ) : (
                        /* ── CLOSE SHIFT VIEW ────────────────────────── */
                        <div className="space-y-5">
                            {/* Shift summary */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-violet-50 rounded-xl p-3">
                                    <div className="text-xs text-violet-500 font-semibold uppercase">Fondo</div>
                                    <div className="text-lg font-black text-violet-700">
                                        {formatCurrency(currentShift?.startingCash || 0)}
                                    </div>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-3">
                                    <div className="text-xs text-emerald-500 font-semibold uppercase">Ventas</div>
                                    <div className="text-lg font-black text-emerald-700">
                                        {summary ? summary.saleCount : '—'}
                                    </div>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3">
                                    <div className="text-xs text-blue-500 font-semibold uppercase">Esperado</div>
                                    <div className="text-lg font-black text-blue-700">
                                        {summary ? formatCurrency(summary.expectedCash) : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Sales breakdown */}
                            {summary && Object.keys(summary.salesByMethod).length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                        Desglose por Método
                                    </div>
                                    {Object.entries(summary.salesByMethod).map(([method, total]) => (
                                        <div key={method} className="px-4 py-2 flex justify-between items-center border-t border-slate-100 text-sm">
                                            <span className="text-slate-600">{PAYMENT_LABELS[method] || method}</span>
                                            <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
                                        </div>
                                    ))}
                                    <div className="px-4 py-2.5 flex justify-between items-center border-t-2 border-slate-200 text-sm bg-slate-50">
                                        <span className="font-bold text-slate-700">Total Vendido</span>
                                        <span className="font-black text-slate-900">{formatCurrency(summary.totalSales)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Close form */}
                            <form onSubmit={handleCloseShift} className="space-y-3">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
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
                                    className="w-full text-3xl font-black text-center py-4 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none transition-all"
                                />

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !actualCash}
                                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-red-200 transition-all"
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
