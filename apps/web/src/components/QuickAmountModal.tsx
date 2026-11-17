import React, { useState, useMemo } from 'react';
import { DollarSign, Check, X, Sparkles, RefreshCw } from 'lucide-react';
import { ItemDocType } from '../db/schemas/item.schema';
import { SyncEntityType, SyncAction } from '../db/outbox.types';
import { enqueueSyncEvent, generateId } from '../db/enqueueSyncEvent';

interface QuickAmountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: ItemDocType) => void;
    exchangeRate: number;
    tenantId: string;
    existingItems: ItemDocType[];
}

export const QuickAmountModal: React.FC<QuickAmountModalProps> = ({
    isOpen,
    onClose,
    onAdd,
    exchangeRate,
    tenantId,
    existingItems,
}) => {
    const [currencyMode, setCurrencyMode] = useState<'USD' | 'VES'>('USD');
    const [amountInput, setAmountInput] = useState<string>('');
    const [concept, setConcept] = useState<string>('');
    const [isCreatingGeneric, setIsCreatingGeneric] = useState(false);

    // Compute both currencies dynamically
    const { usdVal, vesVal } = useMemo(() => {
        const num = parseFloat(amountInput) || 0;
        if (currencyMode === 'USD') {
            return {
                usdVal: num,
                vesVal: num * exchangeRate,
            };
        } else {
            return {
                usdVal: exchangeRate > 0 ? num / exchangeRate : 0,
                vesVal: num,
            };
        }
    }, [amountInput, currencyMode, exchangeRate]);

    if (!isOpen) return null;

    const quickPillsUSD = [0.5, 1, 2, 3, 5, 10, 20];
    const quickPillsVES = [100, 200, 500, 1000, 2000, 5000];

    const handlePillClick = (val: number) => {
        setAmountInput(val.toString());
    };

    const handleConfirm = async () => {
        if (usdVal <= 0) return;

        setIsCreatingGeneric(true);
        try {
            // Find existing generic item or create one to satisfy foreign key
            let genericItem = existingItems.find(
                i => i.name.toLowerCase().includes('varios') || i.name.toLowerCase().includes('venta rápida')
            );

            if (!genericItem) {
                const newId = generateId();
                const createdItem: ItemDocType = {
                    id: newId,
                    storeId: tenantId,
                    name: 'Varios / Venta Rápida',
                    unitPrice: Number(usdVal.toFixed(2)),
                    costPrice: 0,
                    stock: 999999,
                    reorderLevel: 0,
                    receivingQuantity: 0,
                    allowAltDescription: true,
                    isSerialized: false,
                    sellBy: 'unit',
                    unitLabel: 'und',
                    updatedAt: Date.now(),
                };

                await enqueueSyncEvent({
                    entity_type: SyncEntityType.ITEM,
                    action: SyncAction.CREATE,
                    payload: {
                        id: newId,
                        name: createdItem.name,
                        category_id: undefined,
                        brand_id: undefined,
                        costPrice: createdItem.costPrice,
                        unitPrice: createdItem.unitPrice,
                        reorderLevel: createdItem.reorderLevel,
                        receivingQuantity: createdItem.receivingQuantity,
                        sellBy: 'unit',
                    },
                    tenant_id: tenantId,
                    localTable: 'items',
                    localRecord: createdItem,
                });

                genericItem = createdItem;
            }

            // Create customized dynamic item with custom name and exact price
            const itemToAdd: ItemDocType = {
                ...genericItem,
                name: concept.trim() || 'Varios (Venta Rápida)',
                unitPrice: Number(usdVal.toFixed(2)),
            };

            onAdd(itemToAdd);
            setAmountInput('');
            setConcept('');
            onClose();
        } catch (err) {
            console.error('Error adding quick amount:', err);
        } finally {
            setIsCreatingGeneric(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700 animate-scaleUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            ⚡
                        </div>
                        <div>
                            <h3 className="font-extrabold text-lg leading-tight">Venta Rápida / Calculadora</h3>
                            <p className="text-xs text-emerald-100 mt-0.5">Cobrar monto libre sin producto registrado</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-1.5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Currency Selector Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => {
                                setCurrencyMode('USD');
                                setAmountInput('');
                            }}
                            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                                currencyMode === 'USD'
                                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <DollarSign className="w-4 h-4" /> Dólares ($)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setCurrencyMode('VES');
                                setAmountInput('');
                            }}
                            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                                currencyMode === 'VES'
                                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <span>🇻🇪</span> Bolívares (Bs.)
                        </button>
                    </div>

                    {/* Big Amount Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Monto a Cobrar {currencyMode === 'USD' ? 'en Dólares ($)' : 'en Bolívares (Bs.)'}
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                                {currencyMode === 'USD' ? '$' : 'Bs.'}
                            </span>
                            <input
                                type="number"
                                step="any"
                                autoFocus
                                value={amountInput}
                                onChange={e => setAmountInput(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-14 pr-4 py-4 text-3xl font-black text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-500 focus:outline-none focus:ring-0 shadow-inner"
                            />
                        </div>

                        {/* Live Conversion Preview */}
                        <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">Equivalente automático:</span>
                            <span className="font-extrabold text-emerald-800 dark:text-emerald-200 text-sm">
                                {currencyMode === 'USD'
                                    ? `Bs. ${vesVal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : `$ ${usdVal.toFixed(2)}`}
                            </span>
                        </div>
                    </div>

                    {/* Quick Amount Suggestion Buttons */}
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Montos rápidos:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {(currencyMode === 'USD' ? quickPillsUSD : quickPillsVES).map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => handlePillClick(val)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
                                >
                                    {currencyMode === 'USD' ? `$${val}` : `${val} Bs`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Concept / Item Name (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            ¿Qué estás vendiendo? <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                        </label>
                        <input
                            type="text"
                            value={concept}
                            onChange={e => setConcept(e.target.value)}
                            placeholder="Ej. Queso guayanés, Aguacate, Recarga, Varios..."
                            className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={usdVal <= 0 || isCreatingGeneric}
                            onClick={handleConfirm}
                            className="flex-2 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreatingGeneric ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    <span>Agregar a la Cuenta (${usdVal.toFixed(2)})</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
