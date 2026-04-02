import React, { useState, useEffect, useRef } from 'react';
import { PaymentMethod, ChangeMethod, ArrayPayment } from '../db/schemas/sale.schema';
import { CustomerDocType } from '../db/schemas/customer.schema';
import { getOutboxDB } from '../db/outbox';
import { enqueueSyncEvent, generateId } from '../db/enqueueSyncEvent';
import { SyncEntityType, SyncAction } from '../db/outbox.types';
import { useAuth } from '../contexts/AuthProvider';

export interface PaymentData {
    paymentMethod: PaymentMethod | 'MIXTO';
    reference?: string;
    amountReceived?: number;
    changeAmount?: number;
    changeBs?: number;
    changeMethod?: ChangeMethod;
    customerId?: string;
    payments?: ArrayPayment[];
}

interface CheckoutModalProps {
    isOpen: boolean;
    total: number;
    exchangeRate: number;
    onClose: () => void;
    onConfirm: (paymentData: PaymentData) => void;
    isProcessing?: boolean;
    enableCreditSales?: boolean;
}

const BASE_TABS: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: 'DIVISA',      label: 'Divisa $',     icon: '💵' },
    { key: 'EFECTIVO_BS', label: 'Efectivo Bs.', icon: '💰' },
    { key: 'PAGO_MOVIL',  label: 'Pago Móvil',   icon: '📱' },
    { key: 'PUNTO',       label: 'Punto',         icon: '💳' },
];

const FIADO_TAB = { key: 'FIADO' as PaymentMethod, label: 'Fiado', icon: '📒' };

const CHANGE_OPTIONS: { key: ChangeMethod; label: string }[] = [
    { key: 'DIVISA',      label: 'Divisa (Efectivo $)' },
    { key: 'EFECTIVO_BS', label: 'Efectivo Bs.' },
    { key: 'PAGO_MOVIL',  label: 'Pago Móvil' },
];

const QuickCustomerForm: React.FC<{
    onCreated: (customer: CustomerDocType) => void;
    onCancel: () => void;
    tenantId: string;
}> = ({ onCreated, onCancel, tenantId }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const firstRef = useRef<HTMLInputElement>(null);

    useEffect(() => { firstRef.current?.focus(); }, []);

    const isValid = firstName.trim() && lastName.trim() && phone.trim();

    const handleSubmit = async () => {
        if (!isValid) return;
        const id = `cust_${generateId()}`;
        const now = Date.now();
        const newCustomer: CustomerDocType = {
            id,
            storeId: tenantId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            taxable: true,
            updatedAt: now,
            isDeleted: false,
        };
        await enqueueSyncEvent({
            entity_type: SyncEntityType.CUSTOMER,
            action: SyncAction.CREATE,
            payload: {
                id,
                firstName: newCustomer.firstName,
                lastName: newCustomer.lastName,
                phone: newCustomer.phone,
                taxable: true,
            },
            tenant_id: tenantId,
            localTable: 'customers',
            localRecord: newCustomer,
        });
        onCreated(newCustomer);
    };

    const inputCls = 'w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all';

    return (
        <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-violet-800 flex items-center gap-1.5">
                    <span className="text-base">👤</span> Nuevo Cliente
                </h3>
                <button onClick={onCancel} className="text-slate-400 hover:text-red-500 text-lg leading-none transition-colors">×</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block">Nombre *</label>
                    <input ref={firstRef} type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className={inputCls} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block">Apellido *</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Pérez" className={inputCls} />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block">Teléfono (vital para cobranza)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0414-1234567" className={inputCls} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
            </div>

            <button onClick={handleSubmit} disabled={!isValid} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${ isValid ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                ✅ Guardar Cliente
            </button>
        </div>
    );
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    total,
    exchangeRate,
    onClose,
    onConfirm,
    isProcessing = false,
    enableCreditSales = false
}) => {
    const { user } = useAuth();
    const tenantId = user?.storeId || 'default-store';
    
    // Arrays of partial payments
    const [payments, setPayments] = useState<ArrayPayment[]>([]);

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DIVISA');
    const [amountReceived, setAmountReceived] = useState<string>('');
    const [reference, setReference] = useState<string>('');
    const [changeMethod, setChangeMethod] = useState<ChangeMethod>('DIVISA');
    const inputRef = useRef<HTMLInputElement>(null);

    // Fiado state
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<CustomerDocType[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerDocType | null>(null);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    const customerSearchRef = useRef<HTMLInputElement>(null);

    const PAYMENT_TABS = enableCreditSales ? [...BASE_TABS, FIADO_TAB] : BASE_TABS;

    useEffect(() => {
        if (isOpen) {
            setPayments([]);
            setPaymentMethod('DIVISA');
            setAmountReceived('');
            setReference('');
            setChangeMethod('DIVISA');
            setCustomerSearch('');
            setSelectedCustomer(null);
            setShowNewCustomerForm(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (paymentMethod === 'FIADO') {
                setTimeout(() => customerSearchRef.current?.focus(), 50);
            } else {
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }
    }, [paymentMethod, isOpen]);

    useEffect(() => {
        if (paymentMethod !== 'FIADO') return;
        const search = async () => {
            const db = getOutboxDB();
            const allCustomers = await db.customers.toArray();
            const q = customerSearch.toLowerCase().trim();
            if (!q) {
                setCustomers(allCustomers);
            } else {
                setCustomers(
                    allCustomers.filter(c =>
                        c.firstName.toLowerCase().includes(q) ||
                        c.lastName.toLowerCase().includes(q) ||
                        (c.phone && c.phone.includes(q))
                    )
                );
            }
        };
        search();
    }, [paymentMethod, customerSearch, isOpen]);

    if (!isOpen) return null;

    const totalBs = total * exchangeRate;
    const totalPaidUsd = payments.reduce((acc, p) => acc + p.amountUsd, 0);
    const totalPaidBs = totalPaidUsd * exchangeRate;

    const remainingUsd = Math.max(0, total - totalPaidUsd);
    const remainingBs = remainingUsd * exchangeRate;

    const changeUsd = Math.max(0, totalPaidUsd - total);
    const changeBsCalc = Math.max(0, changeUsd * exchangeRate);

    const isFiado = paymentMethod === 'FIADO';
    
    // Check if total is covered
    const isReadyToProcess = isFiado ? (selectedCustomer !== null) : (totalPaidUsd >= (total - 0.01));

    const addPayment = (method: PaymentMethod, amtUsd: number, ref?: string) => {
        if (amtUsd <= 0) return;
        setPayments(prev => [...prev, {
            method,
            amountUsd: amtUsd,
            amountBs: amtUsd * exchangeRate,
            reference: ref
        }]);
        setAmountReceived('');
        setReference('');
        inputRef.current?.focus();
    };

    const handleAddPaymentClick = () => {
        const val = parseFloat(amountReceived) || 0;
        if (val <= 0) return;

        if (paymentMethod === 'DIVISA') {
            addPayment('DIVISA', val);
        } else if (paymentMethod === 'EFECTIVO_BS') {
            addPayment('EFECTIVO_BS', val / exchangeRate);
        } else if (paymentMethod === 'PAGO_MOVIL' || paymentMethod === 'PUNTO') {
            if (paymentMethod === 'PAGO_MOVIL' && !reference.trim()) {
                alert('Referencia es requerida para Pago Móvil');
                return;
            }
            addPayment(paymentMethod, val / exchangeRate, reference);
        }
    };

    const removePayment = (index: number) => {
        setPayments(prev => prev.filter((_, i) => i !== index));
    };

    const handleConfirm = () => {
        if (!isReadyToProcess || isProcessing) return;

        if (isFiado) {
            onConfirm({
                paymentMethod: 'FIADO',
                customerId: selectedCustomer!.id,
                amountReceived: 0,
                changeAmount: 0,
                changeBs: 0,
            });
            return;
        }

        const payload: PaymentData = {
            paymentMethod: payments.length === 1 ? payments[0].method : 'MIXTO',
            payments: payments,
            amountReceived: parseFloat(totalPaidUsd.toFixed(2)),
            changeAmount: parseFloat(changeUsd.toFixed(2)),
            changeBs: parseFloat(changeBsCalc.toFixed(2)),
            changeMethod: changeUsd > 0.01 ? changeMethod : undefined,
        };

        if (payments.length === 1 && payments[0].reference) {
            payload.reference = payments[0].reference;
        }

        onConfirm(payload);
    };

    const tabCols = enableCreditSales ? 'grid-cols-5' : 'grid-cols-4';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[95vh]">
                
                {/* ── LEFT PANE (Payment Calculator & List) ── */}
                <div className="w-full md:w-1/2 bg-slate-50 p-6 flex flex-col border-b md:border-b-0 md:border-r border-slate-200">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex justify-between items-center mb-6">
                        <span>💳 Resumen de Cobro</span>
                        <span className="text-sm font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">Tasa: Bs. {exchangeRate.toFixed(2)}</span>
                    </h2>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-3">
                            <span className="text-sm font-bold text-slate-500 uppercase">Total a Pagar</span>
                            <div className="text-right">
                                <span className="text-3xl font-black text-slate-800">${total.toFixed(2)}</span>
                                <p className="text-sm font-bold text-slate-500">Bs. {totalBs.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-b border-slate-200 pb-3">
                            <span className="text-sm font-bold text-emerald-600 uppercase">Total Pagado</span>
                            <div className="text-right">
                                <span className="text-2xl font-black text-emerald-600">${totalPaidUsd.toFixed(2)}</span>
                                <p className="text-sm font-bold text-emerald-500">Bs. {totalPaidBs.toFixed(2)}</p>
                            </div>
                        </div>

                        {remainingUsd > 0 ? (
                            <div className="flex justify-between items-end bg-red-50 p-3 rounded-xl border border-red-200">
                                <span className="text-sm font-bold text-red-600 uppercase">Falta por Cobrar</span>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-red-600">${remainingUsd.toFixed(2)}</span>
                                    <p className="text-sm font-bold text-red-500">Bs. {remainingBs.toFixed(2)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-end bg-amber-50 p-3 rounded-xl border border-amber-200">
                                <span className="text-sm font-bold text-amber-600 uppercase">Vuelto a Entregar</span>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-amber-600">${changeUsd.toFixed(2)}</span>
                                    <p className="text-sm font-bold text-amber-500">Bs. {changeBsCalc.toFixed(2)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Vuelto Options */}
                    {changeUsd > 0.01 && !isFiado && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                            <p className="text-xs font-bold text-amber-800 mb-2">Dar vuelto en:</p>
                            <div className="grid grid-cols-3 gap-2">
                                {CHANGE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setChangeMethod(opt.key)}
                                        className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold text-center transition-all border-2 ${
                                            changeMethod === opt.key
                                                ? 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Array of Payments Added */}
                    {payments.length > 0 && (
                        <div className="mt-6 flex-1 overflow-y-auto scroller">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Pagos Añadidos</h3>
                            <div className="space-y-2">
                                {payments.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{p.method.replace('_', ' ')}</p>
                                            {p.reference && <p className="text-xs text-slate-400 font-mono">Ref: {p.reference}</p>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="font-black text-emerald-600 text-sm">${p.amountUsd.toFixed(2)}</p>
                                                <p className="text-xs text-slate-400 font-bold">Bs. {p.amountBs.toFixed(2)}</p>
                                            </div>
                                            <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-600 font-bold p-1">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Left Pane Actions */}
                    <div className="mt-auto pt-6 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                        >Cancelar [Esc]</button>
                        <button
                            onClick={handleConfirm}
                            disabled={!isReadyToProcess || isProcessing}
                            className={`flex-[1.5] py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                                isReadyToProcess && !isProcessing
                                    ? isFiado
                                        ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200 border-2 border-amber-600'
                                        : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200 border-2 border-violet-700'
                                    : 'bg-slate-200 text-slate-400 shadow-none border-2 border-slate-200 cursor-not-allowed'
                            }`}
                        >
                            {isProcessing ? 'Procesando...' : isFiado ? '📒 Guardar Fiado' : '✅ Cobrar Ticket'}
                        </button>
                    </div>
                </div>

                {/* ── RIGHT PANE (Add Payment Methods) ── */}
                <div className="w-full md:w-1/2 p-6 flex flex-col bg-white overflow-y-auto scroller">
                    
                    <div className={`grid ${tabCols} gap-1.5 bg-slate-100 p-1.5 rounded-2xl mb-6 shrink-0`}>
                        {PAYMENT_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setPaymentMethod(tab.key);
                                    setAmountReceived('');
                                    setReference('');
                                    if (tab.key === 'DIVISA') setAmountReceived(remainingUsd > 0 ? remainingUsd.toFixed(2) : '');
                                    if (tab.key === 'EFECTIVO_BS' || tab.key === 'PAGO_MOVIL' || tab.key === 'PUNTO') {
                                        setAmountReceived(remainingBs > 0 ? remainingBs.toFixed(2) : '');
                                    }
                                }}
                                className={`py-2 px-1 rounded-xl text-center transition-all font-bold text-[10px] sm:text-xs leading-tight ${
                                    paymentMethod === tab.key
                                        ? tab.key === 'FIADO'
                                            ? 'bg-white text-amber-700 shadow-md scale-[1.02]'
                                            : 'bg-white text-violet-700 shadow-md scale-[1.02]'
                                        : 'text-slate-500 hover:bg-white/50'
                                }`}
                            >
                                <span className="text-lg block mb-0.5">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {!isFiado && (
                        <div className="flex-1">
                            <div className="mb-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                    Monto a Añadir ({paymentMethod === 'DIVISA' ? '$' : 'Bs.'})
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl">
                                        {paymentMethod === 'DIVISA' ? '$' : 'Bs.'}
                                    </span>
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        step="any"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        className="w-full pl-14 pr-4 py-4 text-3xl font-black text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                                        placeholder="0.00"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddPaymentClick();
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Quick Action Buttons for Divisa or Bs depending on tab */}
                            {(paymentMethod === 'DIVISA' || paymentMethod === 'EFECTIVO_BS') && (
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {paymentMethod === 'DIVISA' ? (
                                        [1, 5, 10, 20].map(amt => (
                                            <button key={amt} onClick={() => {setAmountReceived(amt.toString()); addPayment('DIVISA', amt);}} className="py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition-all active:scale-95 bg-slate-50 shadow-sm">${amt}</button>
                                        ))
                                    ) : (
                                        [50, 100, 200, 500].map(amt => (
                                            <button key={amt} onClick={() => {setAmountReceived(amt.toString()); addPayment('EFECTIVO_BS', amt / exchangeRate);}} className="py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition-all active:scale-95 bg-slate-50 shadow-sm">Bs.{amt}</button>
                                        ))
                                    )}
                                </div>
                            )}

                            {(paymentMethod === 'PAGO_MOVIL' || paymentMethod === 'PUNTO') && (
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                        Referencia o Lote (Opcional en Punto)
                                    </label>
                                    <input
                                        type="text"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        className="w-full px-4 py-3 text-lg font-bold text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all font-mono tracking-wider"
                                        placeholder="Ej: 0424XXXXXXXX"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddPaymentClick();
                                        }}
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleAddPaymentClick}
                                disabled={!amountReceived || parseFloat(amountReceived) <= 0}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                            >➕ Añadir Pago al Recibo</button>
                            
                            {remainingUsd > 0 && (
                                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <button onClick={() => {
                                        setAmountReceived(paymentMethod === 'DIVISA' ? remainingUsd.toFixed(2) : remainingBs.toFixed(2));
                                    }} className="w-full text-indigo-600 font-bold text-sm text-center hover:underline">
                                        Llenar con monto restante ({paymentMethod === 'DIVISA' ? `$${remainingUsd.toFixed(2)}` : `Bs. ${remainingBs.toFixed(2)}`})
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fiado Section */}
                    {isFiado && (
                        <div className="flex-1 animate-in slide-in-from-right-2 duration-300">
                           {showNewCustomerForm ? (
                                <QuickCustomerForm
                                    tenantId={tenantId}
                                    onCreated={(newCust) => {
                                        setSelectedCustomer(newCust);
                                        setShowNewCustomerForm(false);
                                        setCustomerSearch('');
                                    }}
                                    onCancel={() => setShowNewCustomerForm(false)}
                                />
                            ) : (
                                <>
                                    {selectedCustomer ? (
                                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black text-sm">
                                                    {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-emerald-800">
                                                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                                                    </p>
                                                    <p className="text-xs text-emerald-600">
                                                        📞 {selectedCustomer.phone || 'Sin teléfono'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedCustomer(null)}
                                                className="text-emerald-600 hover:text-red-500 text-xs font-bold bg-white px-3 py-2 rounded-lg border border-emerald-200 transition-all"
                                            >Cambiar</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscar Cliente</label>
                                                    <button
                                                        onClick={() => setShowNewCustomerForm(true)}
                                                        className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors"
                                                    >+ Nuevo Cliente</button>
                                                </div>
                                                <input
                                                    ref={customerSearchRef}
                                                    type="text"
                                                    value={customerSearch}
                                                    onChange={e => setCustomerSearch(e.target.value)}
                                                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 border-2 border-slate-200 rounded-xl"
                                                    placeholder="Buscar por nombre o teléfono..."
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto space-y-2 scroller">
                                                {customers.map(cust => (
                                                    <button
                                                        key={cust.id}
                                                        onClick={() => setSelectedCustomer(cust)}
                                                        className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded-xl transition-all text-left"
                                                    >
                                                        <div className="w-8 h-8 bg-slate-300 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                                            {cust.firstName[0]}{cust.lastName[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700 text-sm">
                                                                {cust.firstName} {cust.lastName}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium">
                                                                📞 {cust.phone || 'Sin teléfono'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
