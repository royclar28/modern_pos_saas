import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) console.error("CRÍTICO: VITE_API_URL no está definida en el entorno. Fallback a producción activo.");
const ENDPOINT_BASE = API_URL || 'https://merxpos.com/api';

export type BusinessTypeKey =
    | 'MINIMARKET'
    | 'FERRETERIA'
    | 'LICORERIA'
    | 'BOUTIQUE'
    | 'FARMACIA'
    | 'CAFETERIA'
    | 'OTRO';

interface BusinessTypeOption {
    id: BusinessTypeKey;
    emoji: string;
    label: string;
    placeholder: string;
    categoriesPreview: string;
    featureHighlight: string;
}

const BUSINESS_TYPES: BusinessTypeOption[] = [
    {
        id: 'MINIMARKET',
        emoji: '🛒',
        label: 'Minimarket / Abasto',
        placeholder: 'Ej: Minimarket La Familia',
        categoriesPreview: 'Víveres, Lácteos, Bebidas, Limpieza, Snacks',
        featureHighlight: 'Balanza por Kg + Control de Fiados activado',
    },
    {
        id: 'FERRETERIA',
        emoji: '🔨',
        label: 'Ferretería',
        placeholder: 'Ej: Ferretería El Tornillo C.A.',
        categoriesPreview: 'Herramientas, Tornillería, Electricidad, Plomería, Pinturas',
        featureHighlight: 'Códigos internos + Control de Fiados activado',
    },
    {
        id: 'LICORERIA',
        emoji: '🍾',
        label: 'Licorería / Bodegón',
        placeholder: 'Ej: Bodegón y Licorería La Esquina',
        categoriesPreview: 'Cervezas, Licores, Vinos, Refrescos, Snacks y Hielo',
        featureHighlight: 'Módulo de Sorteos en Vivo + Fiados activado',
    },
    {
        id: 'BOUTIQUE',
        emoji: '👗',
        label: 'Boutique / Tienda de Ropa',
        placeholder: 'Ej: Boutique Moda Urbana',
        categoriesPreview: 'Damas, Caballeros, Calzado, Accesorios, Temporada',
        featureHighlight: 'Catálogo Digital + Sorteos para clientes',
    },
    {
        id: 'FARMACIA',
        emoji: '💊',
        label: 'Farmacia',
        placeholder: 'Ej: Farmacia Salud Total',
        categoriesPreview: 'Medicamentos, Cuidado Personal, Vitaminas, Infantil',
        featureHighlight: 'Alertas de stock mínimo + Escaneo rápido',
    },
    {
        id: 'CAFETERIA',
        emoji: '☕',
        label: 'Cafetería / Panadería',
        placeholder: 'Ej: Café & Panadería San José',
        categoriesPreview: 'Café, Panadería, Comida Rápida, Bebidas Frías, Postres',
        featureHighlight: 'Venta rápida de mostrador + Multi-moneda BCV',
    },
    {
        id: 'OTRO',
        emoji: '📦',
        label: 'Otro Comercio',
        placeholder: 'Ej: Inversiones Mi Negocio',
        categoriesPreview: 'General, Destacados, Servicios, Otros',
        featureHighlight: 'Punto de venta multi-moneda 100% adaptable',
    },
];

// ─── Inline toast sin dependencias ───────────────────────────────────────────
const showToast = (msg: string, type: 'success' | 'error') => {
    const el = document.createElement('div');
    el.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
    Object.assign(el.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
        padding: '12px 20px', borderRadius: '12px', color: '#fff',
        background: type === 'success' ? '#16a34a' : '#dc2626',
        fontWeight: '700', fontSize: '14px',
        boxShadow: '0 4px 20px rgba(0,0,0,.2)',
        opacity: '0', transition: 'opacity .2s',
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => (el.style.opacity = '1'));
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
};

export const RegisterPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const initialTypeParam = (searchParams.get('type') || '').toUpperCase() as BusinessTypeKey;
    const initialBusinessType: BusinessTypeKey = BUSINESS_TYPES.some(b => b.id === initialTypeParam)
        ? initialTypeParam
        : 'MINIMARKET';

    const [form, setForm] = useState({
        business_type: initialBusinessType,
        store_name:    '',
        first_name:    '',
        last_name:     '',
        username:      '',
        email:         '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const selectedBusiness = BUSINESS_TYPES.find(b => b.id === form.business_type) || BUSINESS_TYPES[0];

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [key]: e.target.value }));
        setErrors(prev => ({ ...prev, [key]: '' }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.store_name.trim())  errs.store_name = 'El nombre de la tienda es requerido';
        if (!form.first_name.trim())  errs.first_name = 'El nombre es requerido';
        if (!form.username.trim())    errs.username    = 'El usuario es requerido';
        if (!/^[a-z0-9_]+$/i.test(form.username)) errs.username = 'Solo letras, números y guión bajo';
        if (!form.email.trim())       errs.email       = 'El email es requerido';
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setLoading(true);
        try {
            const res = await fetch(`${ENDPOINT_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                // Errores de validación Laravel (422)
                if (res.status === 422 && data.errors) {
                    const mapped: Record<string, string> = {};
                    for (const [key, msgs] of Object.entries(data.errors)) {
                        mapped[key] = (msgs as string[])[0];
                    }
                    setErrors(mapped);
                } else {
                    showToast(data.message || 'Error al registrar', 'error');
                }
                return;
            }

            // Éxito — redirigir al login
            showToast('Registro exitoso. Revisa tu correo para configurar tu contraseña de acceso.', 'success');
            navigate('/login');
        } catch (err) {
            showToast('Error de conexión. Intenta de nuevo.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderInputField = ({ label, id, type = 'text', placeholder, error }: {
        label: string; id: keyof typeof form; type?: string; placeholder?: string; error?: string;
    }) => (
        <div key={id}>
            <label htmlFor={id} className="block text-sm font-semibold text-slate-300 mb-1.5">
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={form[id]}
                onChange={set(id)}
                placeholder={placeholder}
                autoComplete={type === 'password' ? 'new-password' : id}
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    error
                        ? 'border-red-500/70 focus:ring-red-500/30 focus:border-red-500'
                        : 'border-white/10 focus:ring-violet-500/30 focus:border-violet-500/60'
                }`}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-10"
             style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

            {/* Orbes decorativos */}
            <div className="fixed top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-violet-600/20 blur-3xl animate-pulse pointer-events-none" />
            <div className="fixed bottom-[-80px] right-[-80px] w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl animate-pulse pointer-events-none" />

            <div className="relative z-10 w-full max-w-xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-lg shadow-violet-500/30 mb-3">
                        <span className="text-3xl">{selectedBusiness.emoji}</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Crear cuenta gratis</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        <span className="text-violet-400 font-semibold">Plan Inicial Gratis</span> · Configurado para tu rubro en segundos
                    </p>
                </div>

                {/* Form card */}
                <form onSubmit={handleSubmit}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">

                    {/* Selector de Tipo de Negocio */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                            ¿Cuál es tu tipo de negocio?
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {BUSINESS_TYPES.map((b) => {
                                const isSelected = form.business_type === b.id;
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, business_type: b.id }))}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                            isSelected
                                                ? 'bg-violet-600/30 border-violet-400 text-white shadow-md shadow-violet-500/20 ring-1 ring-violet-400'
                                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <span className="text-xl flex-shrink-0">{b.emoji}</span>
                                        <span className="text-xs font-bold leading-tight">{b.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Resumen de pre-configuración automática */}
                        <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200 space-y-0.5">
                            <div className="font-bold text-violet-300">
                                ✨ Pre-configuración automática para {selectedBusiness.label}:
                            </div>
                            <div className="text-slate-300">
                                📂 <strong>Categorías:</strong> {selectedBusiness.categoriesPreview}
                            </div>
                            <div className="text-slate-300">
                                ⚡ <strong>Incluido:</strong> {selectedBusiness.featureHighlight}
                            </div>
                        </div>
                    </div>

                    {/* Nombre de la tienda */}
                    {renderInputField({
                        label: "Nombre de tu negocio",
                        id: "store_name",
                        placeholder: selectedBusiness.placeholder,
                        error: errors.store_name
                    })}

                    {/* Nombre y apellido */}
                    <div className="grid grid-cols-2 gap-4">
                        {renderInputField({ label: "Nombre", id: "first_name", placeholder: "María", error: errors.first_name })}
                        {renderInputField({ label: "Apellido", id: "last_name", placeholder: "García", error: errors.last_name })}
                    </div>

                    {/* Usuario y Email */}
                    {renderInputField({
                        label: "Nombre de usuario",
                        id: "username",
                        placeholder: "maria_garcia",
                        error: errors.username
                    })}
                    {renderInputField({
                        label: "Correo electrónico",
                        id: "email",
                        type: "email",
                        placeholder: "maria@ejemplo.com",
                        error: errors.email
                    })}

                    {/* Términos */}
                    <p className="text-xs text-slate-500 text-center leading-relaxed">
                        Al registrarte aceptas las condiciones de uso. Tras el período de prueba,
                        contacta al soporte para renovar tu acceso.
                    </p>

                    {/* CTA */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-violet-500/30 active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Configurando tu tienda...
                            </>
                        ) : '🚀 Crear mi tienda gratis'}
                    </button>

                    <p className="text-center text-slate-500 text-sm">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                            Iniciar sesión
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};
