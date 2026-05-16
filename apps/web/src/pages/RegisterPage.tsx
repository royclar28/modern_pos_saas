import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

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

// ─── Componente ───────────────────────────────────────────────────────────────
export const RegisterPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        store_name:       '',
        first_name:       '',
        last_name:        '',
        username:         '',
        email:            '',
        password:         '',
        password_confirmation: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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
        if (form.password.length < 8) errs.password    = 'Mínimo 8 caracteres';
        if (form.password !== form.password_confirmation) errs.password_confirmation = 'Las contraseñas no coinciden';
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/register`, {
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

            // Éxito — iniciar sesión automático
            showToast('¡Bienvenido! Tu período de prueba de 30 días ha comenzado 🎉', 'success');
            login(data.token, {
                username: data.user.username,
                role:     data.user.role,
                sub:      data.user.id,
                storeId:  data.user.tenant_id,
            });
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
        <div className="min-h-screen flex items-center justify-center p-4"
             style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

            {/* Orbes decorativos */}
            <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
            <div className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />

            <div className="relative z-10 w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-lg shadow-violet-500/30 mb-4">
                        <span className="text-3xl">🛒</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Crear cuenta gratis</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        <span className="text-violet-400 font-semibold">30 días de prueba</span> · Sin tarjeta de crédito
                    </p>
                </div>

                {/* Form card */}
                <form onSubmit={handleSubmit}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-5">

                    {/* Nombre de la tienda */}
                    {renderInputField({
                        label: "Nombre de tu negocio",
                        id: "store_name",
                        placeholder: "Ej: Quesera La Familia",
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

                    {/* Contraseñas */}
                    {renderInputField({
                        label: "Contraseña",
                        id: "password",
                        type: "password",
                        placeholder: "Mínimo 8 caracteres",
                        error: errors.password
                    })}
                    {renderInputField({
                        label: "Confirmar contraseña",
                        id: "password_confirmation",
                        type: "password",
                        placeholder: "Repite tu contraseña",
                        error: errors.password_confirmation
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
                                Creando tu cuenta...
                            </>
                        ) : '🚀 Comenzar prueba gratuita'}
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
