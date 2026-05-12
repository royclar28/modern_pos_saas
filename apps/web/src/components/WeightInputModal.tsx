import React, { useState, useRef, useEffect } from 'react';
import type { ItemDocType } from '../db/schemas/item.schema';

interface WeightInputModalProps {
    item: ItemDocType;
    isOpen: boolean;
    onConfirm: (item: ItemDocType, weight: number) => void;
    onClose: () => void;
}

export const WeightInputModal: React.FC<WeightInputModalProps> = ({
    item,
    isOpen,
    onConfirm,
    onClose,
}) => {
    const [weight, setWeight] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setWeight('');
            // Pequeño delay para asegurar que el modal está renderizado
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        const parsed = parseFloat(weight.replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
            onConfirm(item, parsed);
        }
    };

    const estimatedTotal = (() => {
        const w = parseFloat(weight.replace(',', '.'));
        if (isNaN(w) || w <= 0) return null;
        return (w * item.unitPrice).toFixed(2);
    })();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <span className="text-5xl mb-3 block">⚖️</span>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                        {item.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        Producto a granel — Ingrese el peso
                    </p>
                </div>

                {/* Price reference */}
                <div className="bg-violet-50 rounded-2xl p-3 mb-5 text-center border border-violet-100">
                    <span className="text-xs text-violet-500 font-bold uppercase tracking-wider">
                        Precio por Kg
                    </span>
                    <p className="text-2xl font-black text-violet-700">
                        ${item.unitPrice.toFixed(2)}
                    </p>
                </div>

                {/* Weight Input */}
                <div className="mb-5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Peso (Kg)
                    </label>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="number"
                            step="any"
                            min="0.001"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmit();
                                if (e.key === 'Escape') onClose();
                            }}
                            className="w-full px-4 py-4 text-3xl font-black text-slate-900 text-center border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                            placeholder="0.000"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                            Kg
                        </span>
                    </div>
                    {estimatedTotal !== null && (
                        <p className="text-center mt-2 text-sm font-bold text-emerald-600">
                            Total estimado: ${estimatedTotal}
                        </p>
                    )}
                </div>

                {/* Quick weight buttons */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {[0.25, 0.5, 1, 2].map((preset) => (
                        <button
                            key={preset}
                            onClick={() => {
                                setWeight(preset.toString());
                                inputRef.current?.focus();
                            }}
                            className="py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all active:scale-95 bg-slate-50 shadow-sm text-sm"
                        >
                            {preset} Kg
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!weight || parseFloat(weight.replace(',', '.')) <= 0}
                        className="flex-[1.5] py-3.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-lg shadow-violet-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                        ⚖️ Agregar {estimatedTotal ? `$${estimatedTotal}` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};
