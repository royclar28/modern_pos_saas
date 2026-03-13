import React, { useState, useEffect, useRef } from 'react';

interface CheckoutModalProps {
    isOpen: boolean;
    total: number;
    exchangeRate: number;
    onClose: () => void;
    onConfirm: () => void;
    isProcessing?: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    total,
    exchangeRate,
    onClose,
    onConfirm,
    isProcessing = false
}) => {
    const [amountReceived, setAmountReceived] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setAmountReceived('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const totalBs = total * exchangeRate;
    const receivedNum = parseFloat(amountReceived) || 0;
    const changeUsd = receivedNum - total;
    const changeBs = changeUsd * exchangeRate;
    const isValidPayment = receivedNum >= (total - 0.01); // floating point buffer

    const handleQuickPay = (amt: number) => {
        setAmountReceived(amt.toString());
        inputRef.current?.focus();
    };

    const handleConfirm = () => {
        if (isValidPayment && !isProcessing) {
            onConfirm();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                    <h2 className="text-2xl font-bold">Cobrar Ticket</h2>
                    <p className="text-slate-300 text-sm mt-1">Calculadora de Vuelto</p>
                </div>

                <div className="bg-slate-50 p-6 border-b border-slate-200 text-center">
                    <p className="text-sm text-slate-500 mb-1 font-medium">Total a Pagar</p>
                    <p className="text-5xl font-black text-violet-700">${total.toFixed(2)}</p>
                    <p className="text-sm font-semibold text-slate-400 mt-1">Bs. {totalBs.toFixed(2)}</p>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Monto Recibido ($)
                            </label>
                            <button 
                                onClick={() => handleQuickPay(total)} 
                                className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                            >
                                Exacto
                            </button>
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">$</span>
                            <input
                                ref={inputRef}
                                type="number"
                                step="any"
                                min={total}
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 text-3xl font-black text-slate-900 border-2 border-slate-300 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all shadow-sm"
                                placeholder="0.00"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirm();
                                    if (e.key === 'Escape') onClose();
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {[1, 5, 10, 20].map(amt => (
                            <button
                                key={amt}
                                onClick={() => handleQuickPay(amt)}
                                className="py-2.5 px-1 bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-700 font-bold rounded-xl border border-slate-200 hover:border-violet-300 transition-all shadow-sm active:scale-95"
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>

                    {amountReceived !== '' && (
                        <div className={`p-5 rounded-2xl border-2 transition-all ${isValidPayment ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <p className="text-sm font-bold text-slate-600 mb-1">Cambio a Entregar</p>
                            <p className={`text-4xl font-black ${isValidPayment ? 'text-green-600' : 'text-red-500 text-xl py-2'}`}>
                                {isValidPayment ? `$${changeUsd.toFixed(2)}` : 'Monto Insuficiente'}
                            </p>
                            {isValidPayment && (
                                <p className="text-sm font-semibold text-slate-500 mt-1">Bs. {changeBs.toFixed(2)}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 shadow-sm"
                    >
                        Cancelar [Esc]
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValidPayment || isProcessing}
                        className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
                            isValidPayment && !isProcessing
                                ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200 border-2 border-violet-700'
                                : 'bg-slate-200 text-slate-400 shadow-none border-2 border-slate-200 cursor-not-allowed active:scale-100'
                        }`}
                    >
                        {isProcessing ? 'Procesando...' : 'Cobrar [Enter]'}
                    </button>
                </div>
            </div>
        </div>
    );
};
