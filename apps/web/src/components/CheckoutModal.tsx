import React, { useState, useEffect, useRef } from 'react';
import { PaymentMethod, ChangeMethod } from '../db/schemas/sale.schema';
import { CustomerDocType } from '../db/schemas/customer.schema';
import { getDatabase } from '../db/database';

// ─── Payment Data (exported for CartProvider) ─────────────────────────────────
export interface PaymentData {
    paymentMethod: PaymentMethod;
    reference?: string;
    amountReceived?: number;
    changeAmount?: number;
    changeBs?: number;
    changeMethod?: ChangeMethod;
    customerId?: string;
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

// ─── Tab definitions ──────────────────────────────────────────────────────────
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

// ─── Quick Customer Form ──────────────────────────────────────────────────────
const QuickCustomerForm: React.FC<{
    onCreated: (customer: CustomerDocType) => void;
    onCancel: () => void;
}> = ({ onCreated, onCancel }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const firstRef = useRef<HTMLInputElement>(null);

    useEffect(() => { firstRef.current?.focus(); }, []);

    const isValid = firstName.trim() && lastName.trim() && phone.trim();

    const handleSubmit = async () => {
        if (!isValid) return;
        const db = await getDatabase();
        const id = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const now = Date.now();
        const newCustomer: CustomerDocType = {
            id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            taxable: true,
            updatedAt: now,
            deleted: false,
        };
        await db.customers.insert(newCustomer);
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
                    <input
                        ref={firstRef}
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Juan"
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block">Apellido *</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Pérez"
                        className={inputCls}
                    />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block">Teléfono * (vital para cobranza)</label>
                <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0414-1234567"
                    className={inputCls}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={!isValid}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    isValid
                        ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
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
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DIVISA');
    const [amountReceived, setAmountReceived] = useState<string>('');
    const [reference, setReference] = useState<string>('');
    const [changeMethod, setChangeMethod] = useState<ChangeMethod>('DIVISA');
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Fiado state ──
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<CustomerDocType[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerDocType | null>(null);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    const customerSearchRef = useRef<HTMLInputElement>(null);

    // Build tabs dynamically
    const PAYMENT_TABS = enableCreditSales ? [...BASE_TABS, FIADO_TAB] : BASE_TABS;

    useEffect(() => {
        if (isOpen) {
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

    // Re-focus on tab change
    useEffect(() => {
        if (isOpen) {
            if (paymentMethod === 'FIADO') {
                setTimeout(() => customerSearchRef.current?.focus(), 50);
            } else {
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }
    }, [paymentMethod, isOpen]);

    // ── Customer search ──
    useEffect(() => {
        if (paymentMethod !== 'FIADO') return;
        const search = async () => {
            const db = await getDatabase();
            const allCustomers = await db.customers.find().exec();
            const q = customerSearch.toLowerCase().trim();
            if (!q) {
                setCustomers(allCustomers.map(c => c.toJSON() as CustomerDocType));
            } else {
                setCustomers(
                    allCustomers
                        .filter(c => {
                            const json = c.toJSON() as CustomerDocType;
                            return (
                                json.firstName.toLowerCase().includes(q) ||
                                json.lastName.toLowerCase().includes(q) ||
                                (json.phone && json.phone.includes(q))
                            );
                        })
                        .map(c => c.toJSON() as CustomerDocType)
                );
            }
        };
        search();
    }, [paymentMethod, customerSearch, isOpen]);

    if (!isOpen) return null;

    const totalBs = total * exchangeRate;
    const receivedNum = parseFloat(amountReceived) || 0;

    // ── Payment-method-specific calculations ──────────────────────
    const isDivisaPay = paymentMethod === 'DIVISA';
    const isBsPay = paymentMethod === 'EFECTIVO_BS';
    const isPagoMovil = paymentMethod === 'PAGO_MOVIL';
    const isPunto = paymentMethod === 'PUNTO';
    const isFiado = paymentMethod === 'FIADO';
    const isExactPay = isPagoMovil || isPunto;

    // Change calculation
    let changeUsd = 0;
    let changeBsCalc = 0;
    let isValidPayment = false;

    if (isDivisaPay) {
        changeUsd = receivedNum - total;
        changeBsCalc = changeUsd * exchangeRate;
        isValidPayment = receivedNum >= (total - 0.01);
    } else if (isBsPay) {
        const receivedInUsd = receivedNum / exchangeRate;
        changeUsd = receivedInUsd - total;
        changeBsCalc = receivedNum - totalBs;
        isValidPayment = receivedNum >= (totalBs - 0.5); // Bs buffer
    } else if (isPagoMovil) {
        // Pago Móvil — requires reference number
        isValidPayment = reference.trim().length > 0;
        changeUsd = 0;
        changeBsCalc = 0;
    } else if (isFiado) {
        // Fiado — requires a selected customer
        isValidPayment = selectedCustomer !== null;
        changeUsd = 0;
        changeBsCalc = 0;
    } else {
        // Punto de Venta — always valid, voucher stays in cash register
        isValidPayment = true;
        changeUsd = 0;
        changeBsCalc = 0;
    }

    const handleQuickPay = (amt: number) => {
        setAmountReceived(amt.toString());
        inputRef.current?.focus();
    };

    const handleConfirm = () => {
        if (!isValidPayment || isProcessing) return;

        const paymentData: PaymentData = {
            paymentMethod,
        };

        if (isDivisaPay) {
            paymentData.amountReceived = receivedNum;
            paymentData.changeAmount = Math.max(0, parseFloat(changeUsd.toFixed(2)));
            paymentData.changeBs = Math.max(0, parseFloat(changeBsCalc.toFixed(2)));
            paymentData.changeMethod = changeUsd > 0.01 ? changeMethod : undefined;
        } else if (isBsPay) {
            paymentData.amountReceived = receivedNum;
            paymentData.changeAmount = Math.max(0, parseFloat(changeUsd.toFixed(2)));
            paymentData.changeBs = Math.max(0, parseFloat(changeBsCalc.toFixed(2)));
        } else if (isPagoMovil) {
            // Pago Móvil — exact payment with reference
            paymentData.reference = reference.trim();
            paymentData.amountReceived = total;
            paymentData.changeAmount = 0;
        } else if (isFiado) {
            // Fiado — associate customer
            paymentData.customerId = selectedCustomer!.id;
            paymentData.amountReceived = 0;
            paymentData.changeAmount = 0;
        } else {
            // Punto de Venta — exact payment, no reference needed
            paymentData.amountReceived = total;
            paymentData.changeAmount = 0;
        }

        onConfirm(paymentData);
    };

    const tabCols = enableCreditSales ? 'grid-cols-5' : 'grid-cols-4';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="bg-slate-900 p-5 text-white relative shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-lg transition-colors text-xl"
                        aria-label="Cerrar"
                    >×</button>
                    <h2 className="text-xl font-black tracking-tight">Cobrar Ticket</h2>
                    <p className="text-slate-400 text-xs mt-0.5 font-medium">Seleccione método de pago y calcule el vuelto</p>
                </div>

                {/* Total Display */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 text-center shrink-0">
                    <p className="text-xs text-slate-500 mb-0.5 font-semibold uppercase tracking-wider">Total a Pagar</p>
                    <p className="text-4xl font-black text-violet-700 leading-none">${total.toFixed(2)}</p>
                    <p className="text-sm font-bold text-slate-400 mt-1">Bs. {totalBs.toFixed(2)}</p>
                </div>

                {/* Payment Method Tabs */}
                <div className="px-4 pt-4 pb-2 shrink-0">
                    <div className={`grid ${tabCols} gap-1.5 bg-slate-100 p-1 rounded-2xl`}>
                        {PAYMENT_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setPaymentMethod(tab.key);
                                    setAmountReceived('');
                                    setReference('');
                                    if (tab.key !== 'FIADO') {
                                        setSelectedCustomer(null);
                                        setShowNewCustomerForm(false);
                                    }
                                }}
                                className={`py-2.5 px-2 rounded-xl text-center transition-all font-bold text-xs leading-tight ${
                                    paymentMethod === tab.key
                                        ? tab.key === 'FIADO'
                                            ? 'bg-white text-amber-700 shadow-md shadow-amber-100 scale-[1.02]'
                                            : 'bg-white text-violet-700 shadow-md shadow-violet-100 scale-[1.02]'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                }`}
                            >
                                <span className="text-lg block mb-0.5">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Content Area */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">

                    {/* ═══════════════════════════════════════════════════════════
                        DIVISA (Cash USD)
                    ═══════════════════════════════════════════════════════════ */}
                    {isDivisaPay && (
                        <>
                            {/* Amount input */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        Monto Recibido ($)
                                    </label>
                                    <button
                                        onClick={() => handleQuickPay(total)}
                                        className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors"
                                    >Exacto</button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl">$</span>
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        step="any"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 text-3xl font-black text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                                        placeholder="0.00"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleConfirm();
                                            if (e.key === 'Escape') onClose();
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Quick pay buttons */}
                            <div className="grid grid-cols-5 gap-1.5">
                                {[1, 5, 10, 20, 50].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => handleQuickPay(amt)}
                                        className={`py-2 px-1 rounded-xl border font-bold text-sm transition-all active:scale-95 ${
                                            parseFloat(amountReceived) === amt
                                                ? 'bg-violet-100 border-violet-300 text-violet-700'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600'
                                        }`}
                                    >${amt}</button>
                                ))}
                            </div>

                            {/* Change display */}
                            {amountReceived !== '' && (
                                <div className={`p-4 rounded-2xl border-2 transition-all ${
                                    isValidPayment ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                    <p className="text-xs font-bold text-slate-500 mb-1">Vuelto a Entregar</p>
                                    {isValidPayment ? (
                                        <>
                                            <p className="text-3xl font-black text-green-600">${changeUsd.toFixed(2)}</p>
                                            <p className="text-sm font-bold text-slate-500 mt-0.5">
                                                O su equivalente: <span className="text-emerald-700 font-black">Bs. {changeBsCalc.toFixed(2)}</span>
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-lg font-black text-red-500 py-1">Monto Insuficiente</p>
                                    )}
                                </div>
                            )}

                            {/* Change method selector — only if there IS change */}
                            {isValidPayment && changeUsd > 0.01 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                    <p className="text-xs font-bold text-amber-800 mb-2.5 flex items-center gap-1.5">
                                        <span className="text-base">🔄</span> ¿Cómo se entregó el vuelto?
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {CHANGE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.key}
                                                onClick={() => setChangeMethod(opt.key)}
                                                className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-all border-2 ${
                                                    changeMethod === opt.key
                                                        ? 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {changeMethod === 'EFECTIVO_BS' && (
                                        <p className="mt-2 text-xs text-amber-700 font-semibold">
                                            Entregar: <span className="font-black text-amber-900">Bs. {changeBsCalc.toFixed(2)}</span>
                                        </p>
                                    )}
                                    {changeMethod === 'PAGO_MOVIL' && (
                                        <p className="mt-2 text-xs text-amber-700 font-semibold">
                                            Transferir al cliente: <span className="font-black text-amber-900">Bs. {changeBsCalc.toFixed(2)}</span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        EFECTIVO Bs.
                    ═══════════════════════════════════════════════════════════ */}
                    {isBsPay && (
                        <>
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        Monto Recibido (Bs.)
                                    </label>
                                    <button
                                        onClick={() => handleQuickPay(Math.ceil(totalBs))}
                                        className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors"
                                    >Exacto (Bs. {totalBs.toFixed(2)})</button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">Bs.</span>
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        step="any"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        className="w-full pl-14 pr-4 py-3.5 text-3xl font-black text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                                        placeholder="0.00"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleConfirm();
                                            if (e.key === 'Escape') onClose();
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Quick Bs amounts */}
                            <div className="grid grid-cols-4 gap-1.5">
                                {[10, 20, 50, 100].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => handleQuickPay(amt)}
                                        className={`py-2 px-1 rounded-xl border font-bold text-sm transition-all active:scale-95 ${
                                            parseFloat(amountReceived) === amt
                                                ? 'bg-violet-100 border-violet-300 text-violet-700'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-violet-50'
                                        }`}
                                    >Bs.{amt}</button>
                                ))}
                            </div>

                            {amountReceived !== '' && (
                                <div className={`p-4 rounded-2xl border-2 transition-all ${
                                    isValidPayment ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                    <p className="text-xs font-bold text-slate-500 mb-1">Vuelto en Bs.</p>
                                    {isValidPayment ? (
                                        <p className="text-3xl font-black text-green-600">Bs. {Math.max(0, changeBsCalc).toFixed(2)}</p>
                                    ) : (
                                        <p className="text-lg font-black text-red-500 py-1">Monto Insuficiente</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        PAGO MÓVIL
                    ═══════════════════════════════════════════════════════════ */}
                    {isPagoMovil && (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                                    Cobro por Pago Móvil
                                </p>
                                <p className="text-2xl font-black text-blue-800">
                                    Bs. {totalBs.toFixed(2)}
                                </p>
                                <p className="text-xs text-blue-500 mt-0.5 font-medium">(${total.toFixed(2)})</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                                    Número de Referencia *
                                </label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="w-full px-4 py-3 text-lg font-bold text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all font-mono tracking-wider"
                                    placeholder="Ej: 0424XXXXXXXX"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirm();
                                        if (e.key === 'Escape') onClose();
                                    }}
                                />
                                {!reference.trim() && (
                                    <p className="text-xs text-amber-600 font-medium mt-1">⚠️ Ingrese el número de referencia para continuar.</p>
                                )}
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-medium">
                                💡 Se asume cobro exacto. No se calcula vuelto.
                            </div>
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        PUNTO DE VENTA (tarjeta)
                    ═══════════════════════════════════════════════════════════ */}
                    {isPunto && (
                        <>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center">
                                <span className="text-5xl block mb-3">💳</span>
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
                                    Cobro por Punto de Venta
                                </p>
                                <p className="text-4xl font-black text-indigo-800">
                                    Bs. {totalBs.toFixed(2)}
                                </p>
                                <p className="text-sm text-indigo-500 mt-1 font-semibold">(${total.toFixed(2)})</p>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium flex items-center gap-2">
                                <span className="text-lg">✅</span>
                                Cobro exacto. El voucher se archiva en caja.
                            </div>
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        FIADO (Crédito de Tienda)
                    ═══════════════════════════════════════════════════════════ */}
                    {isFiado && (
                        <>
                            {/* Info banner */}
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                                    Venta a Crédito (Fiado)
                                </p>
                                <p className="text-2xl font-black text-amber-800">
                                    ${total.toFixed(2)}
                                </p>
                                <p className="text-xs text-amber-500 mt-0.5 font-medium">
                                    El cliente se compromete a pagar esta deuda después.
                                </p>
                            </div>

                            {/* Customer search or new form */}
                            {showNewCustomerForm ? (
                                <QuickCustomerForm
                                    onCreated={(newCust) => {
                                        setSelectedCustomer(newCust);
                                        setShowNewCustomerForm(false);
                                        setCustomerSearch('');
                                    }}
                                    onCancel={() => setShowNewCustomerForm(false)}
                                />
                            ) : (
                                <>
                                    {/* Selected customer card */}
                                    {selectedCustomer ? (
                                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">
                                                {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-emerald-800 text-sm truncate">
                                                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                                                </p>
                                                <p className="text-xs text-emerald-600 font-medium">
                                                    📞 {selectedCustomer.phone || 'Sin teléfono'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedCustomer(null)}
                                                className="text-emerald-600 hover:text-red-500 text-xs font-bold bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 hover:border-red-200 transition-all"
                                            >
                                                Cambiar
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Search bar */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                        Buscar Cliente
                                                    </label>
                                                    <button
                                                        onClick={() => setShowNewCustomerForm(true)}
                                                        className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1"
                                                    >
                                                        <span>+</span> Nuevo Cliente
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm">🔍</span>
                                                    <input
                                                        ref={customerSearchRef}
                                                        type="text"
                                                        value={customerSearch}
                                                        onChange={e => setCustomerSearch(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                                                        placeholder="Nombre, apellido o teléfono..."
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Escape') onClose();
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Customer results */}
                                            <div className="max-h-40 overflow-y-auto space-y-1.5 scroller">
                                                {customers.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-slate-400 font-medium">
                                                            {customerSearch ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                                                        </p>
                                                        <button
                                                            onClick={() => setShowNewCustomerForm(true)}
                                                            className="mt-2 text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-50 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            + Crear Primer Cliente
                                                        </button>
                                                    </div>
                                                ) : (
                                                    customers.map(cust => (
                                                        <button
                                                            key={cust.id}
                                                            onClick={() => setSelectedCustomer(cust)}
                                                            className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition-all text-left group"
                                                        >
                                                            <div className="w-8 h-8 bg-slate-300 group-hover:bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                                                                {cust.firstName[0]}{cust.lastName[0]}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-slate-700 text-sm truncate group-hover:text-amber-800">
                                                                    {cust.firstName} {cust.lastName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                    📞 {cust.phone || 'Sin teléfono'}
                                                                </p>
                                                            </div>
                                                            <span className="text-xs text-slate-300 group-hover:text-amber-500 font-bold transition-colors">
                                                                Seleccionar →
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {/* Warning note */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-medium">
                                📒 Esta venta quedará registrada como deuda pendiente y podrá gestionarse desde el Cuaderno de Fiados.
                            </div>
                        </>
                    )}
                </div>

                {/* Footer buttons */}
                <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-200 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                    >
                        Cancelar [Esc]
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValidPayment || isProcessing}
                        className={`flex-[1.5] px-4 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${
                            isValidPayment && !isProcessing
                                ? isFiado
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-amber-200 border-2 border-amber-600'
                                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-violet-200 border-2 border-violet-700'
                                : 'bg-slate-200 text-slate-400 shadow-none border-2 border-slate-200 cursor-not-allowed active:scale-100'
                        }`}
                    >
                        {isProcessing ? (
                            <><span className="animate-spin">⟳</span> Procesando...</>
                        ) : isFiado ? (
                            <>📒 Fiar [Enter]</>
                        ) : (
                            <>💳 Cobrar [Enter]</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
