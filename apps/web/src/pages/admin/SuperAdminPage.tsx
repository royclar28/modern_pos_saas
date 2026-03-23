import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Store {
    id: string;
    name: string;
    rif: string | null;
    ownerEmail: string | null;
    plan: string;
    isActive: boolean;
    createdAt: string;
}

// ─── Lightweight inline toast (zero deps) ─────────────────────────────────────
const toast = {
    _show(msg: string, bg: string) {
        const el = document.createElement('div');
        el.textContent = msg;
        Object.assign(el.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
            padding: '12px 20px', borderRadius: '12px', color: '#fff',
            background: bg, fontWeight: '700', fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,.15)', opacity: '0',
            transition: 'opacity .2s', fontFamily: 'system-ui, sans-serif',
        });
        document.body.appendChild(el);
        requestAnimationFrame(() => (el.style.opacity = '1'));
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
    },
    success(msg: string) { this._show('✅ ' + msg, '#16a34a'); },
    error(msg: string) { this._show('❌ ' + msg, '#dc2626'); },
};

export const SuperAdminPage = () => {
    const navigate = useNavigate();
    const apiUrl = `http://${window.location.hostname}:3333/api`;
    const token = localStorage.getItem('pos_token');

    const [stores, setStores] = useState<Store[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [successModalData, setSuccessModalData] = useState<{ email: string; temporaryPassword?: string } | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formRif, setFormRif] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchStores = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/saas/stores?take=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 403) {
                toast.error('Acceso denegado. Solo SUPER_ADMIN.');
                navigate('/');
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStores(data.items);
            setTotal(data.total);
        } catch (err: any) {
            toast.error('Error cargando tiendas: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, token, navigate]);

    useEffect(() => { fetchStores(); }, [fetchStores]);

    const handleToggle = async (store: Store) => {
        setToggling(store.id);
        try {
            const res = await fetch(`${apiUrl}/saas/stores/${store.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isActive: !store.isActive })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            toast.success(`Tienda "${store.name}" ${!store.isActive ? 'activada' : 'suspendida'}`);
            fetchStores();
        } catch (err: any) {
            toast.error('Error cambiando estado: ' + err.message);
        } finally {
            setToggling(null);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName || !formEmail) return toast.error('Nombre y correo son obligatorios');
        setCreating(true);
        try {
            const res = await fetch(`${apiUrl}/saas/stores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: formName, rif: formRif, ownerEmail: formEmail })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            if (data.temporaryPassword) {
                setSuccessModalData({ email: formEmail, temporaryPassword: data.temporaryPassword });
            } else {
                setSuccessModalData({ email: formEmail });
                toast.success(`Tienda "${formName}" creada exitosamente`);
            }
            setShowModal(false);
        } catch (err: any) {
            toast.error('Error creando tienda: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleCloseSuccess = () => {
        setSuccessModalData(null);
        setFormName(''); setFormRif(''); setFormEmail('');
        fetchStores();
    };

    const handleCopyCredentials = () => {
        if (successModalData?.temporaryPassword) {
            const textToCopy = `Usuario: ${successModalData.email} | Contraseña: ${successModalData.temporaryPassword}`;
            navigator.clipboard.writeText(textToCopy);
            toast.success('Credenciales copiadas al portapapeles');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Navbar */}
            <header className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-4 sm:gap-6">
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight">🔒 Panel Super Admin</h1>
                    <nav className="hidden sm:flex gap-4">
                        <Link to="/" className="text-sm text-indigo-200 hover:text-white transition-colors">← Dashboard</Link>
                    </nav>
                </div>
                <span className="text-xs text-indigo-300 font-mono hidden sm:inline">SaaS Management Console</span>
            </header>

            {/* Main */}
            <main className="flex-1 overflow-auto p-4 sm:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Tiendas</p>
                            <p className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{total}</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Activas</p>
                            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{stores.filter(s => s.isActive).length}</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 col-span-2 sm:col-span-1">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Suspendidas</p>
                            <p className="text-2xl sm:text-3xl font-black text-red-500 mt-1">{stores.filter(s => !s.isActive).length}</p>
                        </div>
                    </div>

                    {/* Header + Action */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-800">Tiendas Registradas</h2>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-bold py-2 px-6 rounded-xl shadow-md flex items-center gap-2 whitespace-nowrap text-sm"
                        >
                            <span>+</span> Nueva Tienda
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-4 sm:px-6 py-4">Nombre</th>
                                        <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">RIF</th>
                                        <th className="px-4 sm:px-6 py-4 hidden md:table-cell">Correo Dueño</th>
                                        <th className="px-4 sm:px-6 py-4">Plan</th>
                                        <th className="px-4 sm:px-6 py-4 text-center">Estado</th>
                                        <th className="px-4 sm:px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {loading ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-slate-400">Cargando tiendas...</td></tr>
                                    ) : stores.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-slate-400">No hay tiendas registradas aún</td></tr>
                                    ) : stores.map(store => (
                                        <tr key={store.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 sm:px-6 py-4 font-semibold text-slate-800">{store.name}</td>
                                            <td className="px-4 sm:px-6 py-4 text-slate-500 font-mono text-xs hidden sm:table-cell">{store.rif || '-'}</td>
                                            <td className="px-4 sm:px-6 py-4 text-slate-500 text-xs hidden md:table-cell">{store.ownerEmail || '-'}</td>
                                            <td className="px-4 sm:px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                    store.plan === 'PRO' ? 'bg-violet-100 text-violet-700' :
                                                    store.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>{store.plan}</span>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                                    store.isActive 
                                                        ? 'bg-emerald-100 text-emerald-700' 
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    <span className={`w-2 h-2 rounded-full ${store.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    {store.isActive ? 'Activa' : 'Suspendida'}
                                                </span>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggle(store)}
                                                    disabled={toggling === store.id}
                                                    className={`text-xs font-bold px-4 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50 ${
                                                        store.isActive
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    {toggling === store.id ? '⟳' : store.isActive ? '⏸ Suspender' : '▶ Activar'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Crear Tienda */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                            <h2 className="text-xl font-black text-slate-800">🏪 Nueva Tienda</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nombre del Negocio *</label>
                                <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none" placeholder="Ej: Bodegón El Dorado" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">RIF / Documento</label>
                                <input value={formRif} onChange={e => setFormRif(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none" placeholder="Ej: J-12345678-9" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Correo del Dueño *</label>
                                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none" placeholder="dueno@ejemplo.com" />
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium flex items-start gap-2">
                                <span className="text-base leading-none">💡</span>
                                <div>Se generará un usuario automáticamente con el correo como login y una clave temporal enviada por correo.</div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={creating} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold rounded-lg shadow-md transition-all disabled:opacity-50">
                                    {creating ? '⟳ Creando...' : '🏪 Crear Tienda'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Éxito Persistente */}
            {successModalData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-center">
                        <div className="px-6 mx-auto pt-8 pb-4">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                                ✅
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">¡Tienda creada con éxito!</h2>
                            <p className="text-slate-600 font-medium mb-6">
                                Las credenciales de acceso para el dueño de la tienda son:
                            </p>
                            
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6 relative">
                                <p className="text-sm text-slate-500 mb-1">Usuario</p>
                                <p className="font-bold text-slate-800 mb-3">{successModalData.email}</p>
                                
                                <p className="text-sm text-slate-500 mb-1">Contraseña temporal</p>
                                <p className="font-mono font-bold text-lg text-slate-800">{successModalData.temporaryPassword || 'No generada'}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 px-6 py-4">
                            {successModalData.temporaryPassword && (
                                <button
                                    onClick={handleCopyCredentials}
                                    className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    📋 Copiar credenciales
                                </button>
                            )}
                            <button
                                onClick={handleCloseSuccess}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
