/**
 * FiadosPage.tsx
 *
 * "Cuaderno Digital de Fiados" — Credit sales management page.
 *
 * Features:
 *   - Reads all sales with paymentMethod === 'FIADO' from RxDB
 *   - Groups by customerId, summing total owed
 *   - Shows customer cards with: name, phone (WhatsApp link), ticket count, total debt, days overdue
 *   - Click a customer to see detail of their owed tickets
 *   - "Registrar Abono" modal for partial payments via API
 *   - "Enviar Recordatorio" WhatsApp button with dynamic store name and courteous message
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDatabase } from '../../db/database';
import { SaleDocType } from '../../db/schemas/sale.schema';
import { CustomerDocType } from '../../db/schemas/customer.schema';
import { useSettingsContext } from '../../contexts/SettingsProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

type CustomerDebt = {
    customer: CustomerDocType | null;
    customerId: string;
    tickets: SaleDocType[];
    totalOwed: number;
    ticketCount: number;
    oldestPendingDate: number | null; // timestamp of oldest pending sale
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (val: number) => val.toFixed(2);

const cleanPhone = (phone: string) =>
    phone.replace(/[^0-9+]/g, '');

const normalizePhone = (phone: string) => {
    let clean = cleanPhone(phone);
    // If starts with 0 (Venezuelan local), replace with +58
    if (clean.startsWith('0')) clean = '+58' + clean.slice(1);
    // Remove leading + for wa.me
    if (clean.startsWith('+')) clean = clean.slice(1);
    return clean;
};

const getDaysOverdue = (timestamp: number | null): number => {
    if (!timestamp) return 0;
    const now = Date.now();
    const diff = now - timestamp;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const getOverdueLabel = (days: number): { text: string; color: string } => {
    if (days <= 0) return { text: 'Hoy', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400' };
    if (days <= 7) return { text: `${days}d`, color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400' };
    if (days <= 30) return { text: `${days}d`, color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400' };
    return { text: `${days}d`, color: 'text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400' };
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export const FiadosPage = () => {
    const [debts, setDebts] = useState<CustomerDebt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const { company, toggleDarkMode, darkMode, currencySymbol } = useSettingsContext();

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const [paymentModal, setPaymentModal] = useState<{ customerId: string; totalOwed: number } | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    const loadDebts = useCallback(async () => {
        setIsLoading(true);
        try {
            const db = await getDatabase();

            // Get all Fiado sales
            const allSales = await db.sales.find({
                selector: { paymentMethod: 'FIADO' },
            }).exec();

            // Get all customers
            const allCustomers = await db.customers.find().exec();
            const customerMap = new Map<string, CustomerDocType>();
            allCustomers.forEach(c => {
                const json = c.toJSON() as CustomerDocType;
                customerMap.set(json.id, json);
            });

            // Group by customerId
            const grouped = new Map<string, SaleDocType[]>();
            allSales.forEach(sale => {
                const json = sale.toJSON() as SaleDocType;
                const custId = json.customerId || 'UNKNOWN';
                if (!grouped.has(custId)) grouped.set(custId, []);
                grouped.get(custId)!.push(json);
            });

            // Build debt summaries
            const debtList: CustomerDebt[] = [];
            grouped.forEach((tickets, custId) => {
                const pendingTickets = tickets.filter(t => t.status !== 'PAGADO');
                const totalOwed = pendingTickets.reduce((sum, t) => sum + (t.total - (t.paidAmount || 0)), 0);

                // Find oldest pending date for "days overdue"
                const oldestPendingDate = pendingTickets.length > 0
                    ? Math.min(...pendingTickets.map(t => t.saleTime))
                    : null;

                debtList.push({
                    customer: customerMap.get(custId) || null,
                    customerId: custId,
                    tickets,
                    totalOwed,
                    ticketCount: pendingTickets.length,
                    oldestPendingDate,
                });
            });

            // Sort: highest debt first
            debtList.sort((a, b) => b.totalOwed - a.totalOwed);
            setDebts(debtList);
        } catch (err) {
            console.error('Error loading fiados:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDebts();
    }, [loadDebts]);

    const handleMarkPaid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentModal || !payAmount) return;
        setIsPaying(true);
        try {
            const token = localStorage.getItem('pos_token');
            const apiUrl = `http://${window.location.hostname}:3333/api`;
            const res = await fetch(`${apiUrl}/customers/${paymentModal.customerId}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ amount: Number(payAmount) })
            });

            if (!res.ok) throw new Error('Error en el pago');
            
            showToast('Abono registrado exitosamente', 'success');
            setPaymentModal(null);
            setPayAmount('');
            
            // Wait a moment for RxDB to sync the updates from backend before reloading
            setTimeout(() => {
                loadDebts();
            }, 1000);
        } catch (err) {
            console.error(err);
            showToast('Error al procesar abono', 'error');
        } finally {
            setIsPaying(false);
        }
    };

    // ── Build WhatsApp reminder link ─────────────────────────────────────────
    const buildWhatsAppLink = (phone: string, firstName: string, totalOwed: number) => {
        const normalizedPhone = normalizePhone(phone);
        const storeName = company || 'nuestra tienda';
        const message = `Hola ${firstName}, te escribimos de *${storeName}* para recordarte amablemente tu saldo pendiente de *${currencySymbol}${formatCurrency(totalOwed)}*. Puedes acercarte a cancelar cuando te sea posible. ¡Gracias por tu preferencia! 🙏`;
        return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    };

    const selectedDebt = debts.find(d => d.customerId === selectedCustomerId);
    const totalGlobalDebt = debts.reduce((sum, d) => sum + d.totalOwed, 0);
    const totalPendingTickets = debts.reduce((sum, d) => sum + d.ticketCount, 0);

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* ── Navbar ──────────────────────────────────────────────────── */}
            <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <span>📒</span>
                        <span>Cuaderno de Fiados</span>
                    </h1>
                    <nav className="hidden sm:flex gap-4">
                        <Link to="/" className="text-sm text-slate-300 hover:text-white transition-colors">
                            ← Dashboard
                        </Link>
                        <Link to="/admin/settings" className="text-sm text-slate-300 hover:text-white transition-colors">
                            Configuración
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

                <button
                    onClick={loadDebts}
                    className="text-xs bg-slate-800 border border-slate-700/80 hover:bg-slate-700 px-3 py-1.5 text-slate-200 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                    🔄 Actualizar
                </button>
            </header>

            {/* ── Main Content ──────────────────────────────────────────── */}
            <main className="flex-1 overflow-auto p-6 md:p-8">
                <div className="max-w-6xl mx-auto">

                    {/* Global stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm transition-colors">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Clientes con Deuda</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">{debts.filter(d => d.totalOwed > 0).length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm transition-colors">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Tickets Pendientes</p>
                            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{totalPendingTickets}</p>
                        </div>
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-5 shadow-lg shadow-red-200 dark:shadow-red-900/30">
                            <p className="text-xs text-red-100 uppercase tracking-wider font-bold mb-1">Deuda Total</p>
                            <p className="text-3xl font-black text-white">{currencySymbol}{formatCurrency(totalGlobalDebt)}</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 animate-pulse">Cargando cuaderno de fiados...</p>
                            </div>
                        </div>
                    ) : debts.length === 0 ? (
                        <div className="text-center py-20">
                            <span className="text-7xl block mb-4 grayscale opacity-50">📒</span>
                            <h2 className="text-2xl font-black text-slate-700 dark:text-white">Sin Ventas a Crédito</h2>
                            <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                                No hay ventas registradas con el método "Fiado". Para empezar, realiza una venta a crédito desde el POS.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* ── Left: Customer Grid ─────────────────────────── */}
                            <div className={`space-y-3 ${selectedDebt ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
                                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>👥</span> Clientes
                                </h2>

                                <div className={`grid gap-3 ${
                                    selectedDebt
                                        ? 'grid-cols-1'
                                        : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                                }`}>
                                    {debts.map(debt => {
                                        const name = debt.customer
                                            ? `${debt.customer.firstName} ${debt.customer.lastName}`
                                            : 'Cliente Desconocido';
                                        const phone = debt.customer?.phone || '';
                                        const isSelected = selectedCustomerId === debt.customerId;
                                        const hasPending = debt.totalOwed > 0;
                                        const daysOverdue = getDaysOverdue(debt.oldestPendingDate);
                                        const overdueLabel = getOverdueLabel(daysOverdue);

                                        return (
                                            <button
                                                key={debt.customerId}
                                                onClick={() => setSelectedCustomerId(
                                                    isSelected ? null : debt.customerId
                                                )}
                                                className={`w-full text-left rounded-2xl p-4 border-2 transition-all group active:scale-[0.98] ${
                                                    isSelected
                                                        ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 shadow-md shadow-amber-100 dark:shadow-amber-900/20'
                                                        : hasPending
                                                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md shadow-sm'
                                                            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                                                        hasPending
                                                            ? 'bg-amber-500'
                                                            : 'bg-green-500'
                                                    }`}>
                                                        {debt.customer ? `${debt.customer.firstName[0]}${debt.customer.lastName[0]}` : '??'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            {phone && (
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                                    📞 {phone}
                                                                </span>
                                                            )}
                                                            {hasPending && daysOverdue > 0 && (
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${overdueLabel.color}`}>
                                                                    ⏰ {overdueLabel.text} en mora
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        {hasPending ? (
                                                            <>
                                                                <p className="text-lg font-black text-red-600 dark:text-red-400">{currencySymbol}{formatCurrency(debt.totalOwed)}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold">{debt.ticketCount} ticket{debt.ticketCount !== 1 ? 's' : ''}</p>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded-full">
                                                                ✅ Saldado
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Right: Ticket Detail ────────────────────────── */}
                            {selectedDebt && (
                                <div className="lg:col-span-2 space-y-4">
                                    {/* Detail header */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center font-black text-base">
                                                    {selectedDebt.customer
                                                        ? `${selectedDebt.customer.firstName[0]}${selectedDebt.customer.lastName[0]}`
                                                        : '??'
                                                    }
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                                        {selectedDebt.customer
                                                            ? `${selectedDebt.customer.firstName} ${selectedDebt.customer.lastName}`
                                                            : 'Cliente Desconocido'
                                                        }
                                                    </h3>
                                                    {selectedDebt.customer?.phone && (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-sm text-slate-500 dark:text-slate-400">📞 {selectedDebt.customer.phone}</span>
                                                        </div>
                                                    )}
                                                    {selectedDebt.oldestPendingDate && selectedDebt.totalOwed > 0 && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {(() => {
                                                                const days = getDaysOverdue(selectedDebt.oldestPendingDate);
                                                                const label = getOverdueLabel(days);
                                                                return (
                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${label.color}`}>
                                                                        ⏰ {days > 0 ? `${days} días en mora` : 'Fiado de hoy'}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                                {selectedDebt.totalOwed > 0 && (
                                                    <button
                                                        onClick={() => setPaymentModal({ customerId: selectedDebt.customerId, totalOwed: selectedDebt.totalOwed })}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-transform active:scale-95 shadow-sm text-sm"
                                                    >
                                                        💵 Abonar
                                                    </button>
                                                )}
                                                {selectedDebt.customer?.phone && selectedDebt.totalOwed > 0 && (
                                                    <a
                                                        href={buildWhatsAppLink(
                                                            selectedDebt.customer.phone,
                                                            selectedDebt.customer.firstName,
                                                            selectedDebt.totalOwed
                                                        )}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-transform active:scale-95 shadow-sm text-sm"
                                                    >
                                                        💬 Enviar Recordatorio
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => setSelectedCustomerId(null)}
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-2 rounded-lg transition-colors text-sm ml-2"
                                                    title="Cerrar detalle"
                                                >✕</button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center transition-colors">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Tickets</p>
                                                <p className="text-xl font-black text-slate-800 dark:text-white">{selectedDebt.tickets.length}</p>
                                            </div>
                                            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-3 text-center transition-colors">
                                                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Pendientes</p>
                                                <p className="text-xl font-black text-amber-700 dark:text-amber-300">{selectedDebt.ticketCount}</p>
                                            </div>
                                            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 text-center transition-colors">
                                                <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">Deuda</p>
                                                <p className="text-xl font-black text-red-700 dark:text-red-300">{currencySymbol}{formatCurrency(selectedDebt.totalOwed)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ticket list */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                                            Historial de Tickets
                                        </h4>
                                        {selectedDebt.tickets
                                            .sort((a, b) => b.saleTime - a.saleTime)
                                            .map(ticket => {
                                                const isPaid = ticket.status === 'PAGADO';
                                                const date = new Date(ticket.saleTime);
                                                const ticketDays = getDaysOverdue(ticket.saleTime);
                                                return (
                                                    <div
                                                        key={ticket.id}
                                                        className={`bg-white dark:bg-slate-800 border rounded-2xl p-4 flex items-center gap-4 transition-all ${
                                                            isPaid
                                                                ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 opacity-70'
                                                                : 'border-slate-200 dark:border-slate-700 shadow-sm'
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                                                            isPaid
                                                                ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {isPaid ? '✅' : '⏳'}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                                    {ticket.id.slice(-8).toUpperCase()}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                    isPaid
                                                                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                                                        : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                                                                }`}>
                                                                    {isPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                </span>
                                                                {!isPaid && ticketDays > 0 && (
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getOverdueLabel(ticketDays).color}`}>
                                                                        {ticketDays}d
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                                                {date.toLocaleDateString('es-VE', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                })}{' '}
                                                                a las{' '}
                                                                {date.toLocaleTimeString('es-VE', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                                {ticket.items.length} artículo{ticket.items.length !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>

                                                        <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                                            <p className={`text-lg font-black ${
                                                                isPaid ? 'text-green-600 dark:text-green-400 line-through' : 'text-slate-800 dark:text-white'
                                                            }`}>
                                                                {currencySymbol}{formatCurrency(ticket.total)}
                                                            </p>
                                                            {!isPaid && ticket.paidAmount ? (
                                                                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                                    Resta: {currencySymbol}{formatCurrency(ticket.total - ticket.paidAmount)}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Payment Modal */}
            {paymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-[slideUp_0.2s_ease] border dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                💵 Registrar Abono
                            </h2>
                        </div>
                        <form onSubmit={handleMarkPaid} className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Monto a Pagar ({currencySymbol})</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        min="0.01"
                                        max={paymentModal.totalOwed}
                                        step="0.01"
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-lg font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="0.00"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-right">
                                    Deuda actual: <strong className="text-red-500 dark:text-red-400">{currencySymbol}{formatCurrency(paymentModal.totalOwed)}</strong>
                                </p>
                                {/* Quick amount buttons */}
                                <div className="flex gap-2 mt-3">
                                    {[
                                        { label: '25%', value: paymentModal.totalOwed * 0.25 },
                                        { label: '50%', value: paymentModal.totalOwed * 0.5 },
                                        { label: '100%', value: paymentModal.totalOwed },
                                    ].map(quick => (
                                        <button
                                            key={quick.label}
                                            type="button"
                                            onClick={() => setPayAmount(quick.value.toFixed(2))}
                                            className="flex-1 text-xs font-bold py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                                        >
                                            {quick.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentModal(null)}
                                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                                    disabled={isPaying}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPaying || !payAmount || Number(payAmount) <= 0}
                                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-200 dark:shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPaying ? 'Procesando...' : 'Confirmar Abono'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold animate-[fadeInUp_0.3s_ease] ${
                        toast.type === 'success'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                    }`}
                >
                    <span>{toast.type === 'success' ? '✅' : '❌'}</span>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default FiadosPage;
