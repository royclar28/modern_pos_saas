/**
 * CustomersPage.tsx — Gestión de Clientes (CRUD + Historial + Deuda)
 *
 * Features:
 *   - Lista todos los clientes con búsqueda en vivo
 *   - Ver/Editar datos del cliente (nombre, teléfono, email)
 *   - Historial de compras del cliente (tickets, totales)
 *   - Deuda pendiente con botón de abono directo
 *   - Crear nuevo cliente
 *   - Eliminar cliente (soft delete)
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getOutboxDB } from '../../db/outbox';
import { enqueueSyncEvent, generateId } from '../../db/enqueueSyncEvent';
import { SyncEntityType, SyncAction } from '../../db/outbox.types';
import { CustomerDocType } from '../../db/schemas/customer.schema';
import { SaleDocType } from '../../db/schemas/sale.schema';
import { useAuth } from '../../contexts/AuthProvider';
import { useSettingsContext } from '../../contexts/SettingsProvider';
import { AppHeader } from '../../components/AppHeader';

const fmt = (n: number) => `$${n.toFixed(2)}`;

// ─── Customer Detail Modal ──────────────────────────────────────
const CustomerDetail = ({
    customer,
    sales,
    onClose,
    onSave,
}: {
    customer: CustomerDocType;
    sales: SaleDocType[];
    onClose: () => void;
    onSave: (updated: CustomerDocType) => void;
}) => {
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone || '',
        email: (customer as any).email || '',
    });
    const [abonoModal, setAbonoModal] = useState<{ sale: SaleDocType; amount: string } | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const { user } = useAuth();
    const tenantId = user?.storeId || 'default-store';

    const pendingSales = sales.filter(s => s.status !== 'PAGADO' && s.status !== 'ANULADO' && s.paymentMethod === 'FIADO');
    const totalDebt = pendingSales.reduce((sum, s) => sum + (s.total - (s.paidAmount || 0)), 0);
    const totalPurchases = sales.reduce((sum, s) => sum + s.total, 0);

    const handleSubmitAbono = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!abonoModal) return;
        const amount = parseFloat(abonoModal.amount);
        if (isNaN(amount) || amount <= 0) return;
        setIsPaying(true);
        try {
            const sale = abonoModal.sale;
            const owed = sale.total - (sale.paidAmount || 0);
            const applied = Math.min(amount, owed);
            const newPaid = (sale.paidAmount || 0) + applied;
            const newStatus = newPaid >= sale.total ? 'PAGADO' : 'PENDIENTE';

            await enqueueSyncEvent({
                entity_type: SyncEntityType.SALE_PAYMENT,
                action: SyncAction.UPDATE,
                payload: {
                    saleId: sale.id,
                    amount: applied,
                    method: 'ABONO',
                },
                tenant_id: tenantId,
                localTable: 'sales',
                localRecordKey: sale.id,
                localUpdater: (existing: SaleDocType) => ({
                    ...existing,
                    paidAmount: newPaid,
                    status: newStatus,
                    updatedAt: Date.now(),
                }),
            });
            setAbonoModal(null);
        } catch (err) {
            console.error('Abono failed:', err);
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white rounded-t-3xl flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">{customer.firstName} {customer.lastName}</h2>
                        <p className="text-violet-100 text-sm">
                            📞 {customer.phone || 'Sin teléfono'}
                            {(customer as any).email && ` · ✉️ ${(customer as any).email}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg">×</button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-400 uppercase font-bold">Total Compras</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{fmt(totalPurchases)}</p>
                            <p className="text-[10px] text-slate-400">{sales.length} tickets</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center border ${totalDebt > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
                            <p className="text-xs text-slate-400 uppercase font-bold">Deuda</p>
                            <p className={`text-xl font-black ${totalDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmt(totalDebt)}</p>
                            <p className="text-[10px] text-slate-400">{pendingSales.length} pendientes</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-400 uppercase font-bold">Ticket Prom.</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{sales.length > 0 ? fmt(totalPurchases / sales.length) : '$0.00'}</p>
                        </div>
                    </div>

                    {/* Edit toggle */}
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className="text-sm font-bold text-violet-600 hover:text-violet-800 transition-colors"
                    >{editMode ? 'Cancelar edición' : '✏️ Editar datos'}</button>

                    {editMode && (
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const updated: CustomerDocType = {
                                ...customer,
                                firstName: form.firstName,
                                lastName: form.lastName,
                                phone: form.phone,
                                updatedAt: Date.now(),
                            };
                            await enqueueSyncEvent({
                                entity_type: SyncEntityType.CUSTOMER,
                                action: SyncAction.UPDATE,
                                payload: { id: customer.id, ...form },
                                tenant_id: tenantId,
                                localTable: 'customers',
                                localRecordKey: customer.id,
                                localUpdater: () => updated,
                            });
                            onSave(updated);
                            setEditMode(false);
                        }} className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre</label>
                                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Apellido</label>
                                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Teléfono</label>
                                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label>
                                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <button type="submit" className="col-span-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-colors">💾 Guardar Cambios</button>
                        </form>
                    )}

                    {/* Pending Debt Tickets */}
                    {pendingSales.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                📒 Tickets Pendientes ({pendingSales.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {pendingSales.sort((a, b) => b.saleTime - a.saleTime).map(sale => {
                                    const owed = sale.total - (sale.paidAmount || 0);
                                    const days = Math.floor((Date.now() - sale.saleTime) / 86400000);
                                    return (
                                        <div key={sale.id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">
                                                    {fmt(sale.total)} <span className="text-xs text-slate-400">total</span>
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(sale.saleTime).toLocaleDateString('es-VE')} · {sale.items.length} art.
                                                    {days > 0 && <span className="text-amber-600 font-bold ml-1">· {days}d</span>}
                                                </p>
                                                {sale.paidAmount > 0 && (
                                                    <p className="text-xs text-emerald-600 font-bold">Abonado: {fmt(sale.paidAmount)}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-red-600 dark:text-red-400">{fmt(owed)}</span>
                                                <button
                                                    onClick={() => setAbonoModal({ sale, amount: owed.toFixed(2) })}
                                                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                                                >💵 Abonar</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Purchase History */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">📋 Historial de Compras</h3>
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {sales.sort((a, b) => b.saleTime - a.saleTime).slice(0, 20).map(sale => (
                                <div key={sale.id} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 py-1.5">
                                    <span className="text-xs text-slate-400 font-mono">{sale.id.slice(-8).toUpperCase()}</span>
                                    <span className="text-xs text-slate-500">{new Date(sale.saleTime).toLocaleDateString('es-VE')}</span>
                                    <span className="text-xs font-bold text-slate-600">{sale.paymentMethod}</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">{fmt(sale.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Abono Modal */}
            {abonoModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">💵 Registrar Abono</h3>
                        <form onSubmit={handleSubmitAbono} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Monto ($)</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    max={abonoModal.sale.total - (abonoModal.sale.paidAmount || 0)}
                                    step="0.01"
                                    value={abonoModal.amount}
                                    onChange={e => setAbonoModal({ ...abonoModal, amount: e.target.value })}
                                    className="w-full px-4 py-3 text-lg font-bold border-2 border-slate-200 rounded-xl"
                                    autoFocus
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-2">Deuda: {fmt(abonoModal.sale.total - (abonoModal.sale.paidAmount || 0))}</p>
                            </div>
                            <div className="flex gap-2">
                                {[25, 50, 100].map(pct => (
                                    <button
                                        key={pct}
                                        type="button"
                                        onClick={() => setAbonoModal({ ...abonoModal, amount: (((abonoModal.sale.total - (abonoModal.sale.paidAmount || 0)) * pct) / 100).toFixed(2) })}
                                        className="flex-1 text-xs font-bold py-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
                                    >{pct}%</button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setAbonoModal(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">Cancelar</button>
                                <button type="submit" disabled={isPaying} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50">{isPaying ? '...' : 'Confirmar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────────────
export const CustomersPage = () => {
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState<CustomerDocType[]>([]);
    const [allSales, setAllSales] = useState<SaleDocType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerDocType | null>(null);
    const [showNewForm, setShowNewForm] = useState(false);
    const { user } = useAuth();
    const tenantId = user?.storeId || 'default-store';
    const { toggleDarkMode, darkMode } = useSettingsContext();

    // New customer form
    const [newForm, setNewForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const db = getOutboxDB();
        const [c, s] = await Promise.all([
            db.customers.toArray() as Promise<CustomerDocType[]>,
            db.sales.toArray() as Promise<SaleDocType[]>,
        ]);
        setCustomers(c);
        setAllSales(s);
        setIsLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return customers;
        return customers.filter(c =>
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            (c.phone && c.phone.includes(q))
        );
    }, [customers, search]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newForm.firstName.trim() || !newForm.lastName.trim()) return;
        const id = `cust_${generateId()}`;
        const newCustomer: CustomerDocType = {
            id,
            storeId: tenantId,
            firstName: newForm.firstName.trim(),
            lastName: newForm.lastName.trim(),
            phone: newForm.phone.trim(),
            taxable: true,
            updatedAt: Date.now(),
            isDeleted: false,
        };
        await enqueueSyncEvent({
            entity_type: SyncEntityType.CUSTOMER,
            action: SyncAction.CREATE,
            payload: { id, ...newForm },
            tenant_id: tenantId,
            localTable: 'customers',
            localRecord: newCustomer,
        });
        setCustomers(prev => [...prev, newCustomer]);
        setNewForm({ firstName: '', lastName: '', phone: '', email: '' });
        setShowNewForm(false);
    };

    const handleDelete = async (customer: CustomerDocType) => {
        if (!confirm(`¿Eliminar a ${customer.firstName} ${customer.lastName}?`)) return;
        await enqueueSyncEvent({
            entity_type: SyncEntityType.CUSTOMER,
            action: SyncAction.DELETE,
            payload: {},
            tenant_id: tenantId,
            localTable: 'customers',
            localRecordKey: customer.id,
            localUpdater: (existing: CustomerDocType) => ({
                ...existing,
                isDeleted: true,
                updatedAt: Date.now(),
            }),
        });
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
    };

    const getCustomerSales = (custId: string) => allSales.filter(s => s.customerId === custId);
    const getCustomerDebt = (custId: string) => {
        return getCustomerSales(custId)
            .filter(s => s.status !== 'PAGADO' && s.status !== 'ANULADO' && s.paymentMethod === 'FIADO')
            .reduce((sum, s) => sum + (s.total - (s.paidAmount || 0)), 0);
    };

    const sorted = [...filtered].sort((a, b) => getCustomerDebt(b.id) - getCustomerDebt(a.id));

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header */}
            <AppHeader
                icon="👥"
                title="Clientes"
                links={[{ to: '/', label: '← Dashboard' }, { to: '/pos', label: 'Ir al POS →' }]}
                actions={
                    <>
                        <button onClick={loadData} className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 text-slate-200 rounded-lg font-bold hover:bg-slate-700">🔄 Actualizar</button>
                        <button onClick={() => setShowNewForm(true)} className="text-xs bg-violet-600 hover:bg-violet-700 px-3 py-1.5 text-white rounded-lg font-bold">+ Nuevo</button>
                    </>
                }
            />

            {/* Search + New Customer */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
                <div className="max-w-6xl mx-auto flex gap-3 items-center">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o teléfono..."
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                    </div>
                </div>
            </div>

            {/* New Customer Form */}
            {showNewForm && (
                <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">👤 Nuevo Cliente</h2>
                        <form onSubmit={handleCreate} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre *</label>
                                    <input value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required autoFocus />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Apellido *</label>
                                    <input value={newForm.lastName} onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Teléfono</label>
                                <input value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="0414-1234567" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label>
                                <input value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" type="email" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowNewForm(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl">✅ Crear Cliente</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Customer List */}
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto">
                    {isLoading ? (
                        <div className="text-center py-20">Cargando...</div>
                    ) : sorted.length === 0 ? (
                        <div className="text-center py-20"><span className="text-6xl block mb-4">👥</span><p className="text-slate-400">No hay clientes registrados</p></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {sorted.map(customer => {
                                const sales = getCustomerSales(customer.id);
                                const debt = getCustomerDebt(customer.id);
                                return (
                                    <div key={customer.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center font-black text-sm">
                                                    {customer.firstName[0]}{customer.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{customer.firstName} {customer.lastName}</p>
                                                    {customer.phone && <p className="text-xs text-slate-400">📞 {customer.phone}</p>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3 text-xs">
                                            <span className="text-slate-500">{sales.length} compras</span>
                                            {debt > 0 && <span className="text-red-500 font-bold">{fmt(debt)} por cobrar</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setSelectedCustomer(customer)} className="flex-1 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors">📋 Ver</button>
                                            <button onClick={() => handleDelete(customer)} className="py-2 px-3 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors">🗑️</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Detail Modal */}
            {selectedCustomer && (
                <CustomerDetail
                    customer={selectedCustomer}
                    sales={getCustomerSales(selectedCustomer.id)}
                    onClose={() => { setSelectedCustomer(null); loadData(); }}
                    onSave={(updated) => {
                        setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
                        setSelectedCustomer(updated);
                    }}
                />
            )}
        </div>
    );
};

export default CustomersPage;
