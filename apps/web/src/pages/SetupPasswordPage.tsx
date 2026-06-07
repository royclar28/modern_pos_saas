import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

/**
 * SetupPasswordPage — Configuración de contraseña de primer uso.
 *
 * El backend envía un email con un enlace:
 *   /setup-password?token={PASSWORD_BROKER_TOKEN}&email={USER_EMAIL}
 *
 * Esta página extrae los parámetros, muestra un formulario para que el
 * usuario elija su contraseña, y hace POST a /api/reset-password
 * (el endpoint estándar del Password Broker de Laravel).
 */
export default function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [email] = useState(emailParam || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('El enlace no es válido o ha expirado.');
      return;
    }

    if (!email) {
      toast.error('Falta el correo electrónico en el enlace.');
      return;
    }

    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== passwordConfirmation) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.post<{ message?: string }>(
        '/reset-password',
        { token, email, password, password_confirmation: passwordConfirmation },
        { skipAuthCheck: true }
      );

      toast.success(data?.message || 'Contraseña configurada con éxito. Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (error: any) {
      const msg = error?.message || 'Hubo un error al configurar la contraseña. Intenta de nuevo.';
      // Try to extract a user-friendly message from Laravel validation errors
      if (msg.includes('422') || msg.includes('validation')) {
        toast.error('El enlace ha expirado o los datos no son válidos. Solicita uno nuevo.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Error state: missing token ──────────────────────────────────────────
  if (!token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
      >
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-2xl mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">Enlace inválido</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Este enlace de configuración de contraseña no es válido o ha expirado.
              Solicita uno nuevo desde la página de inicio de sesión.
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-500/30 active:scale-[0.98]"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Form state: valid token ─────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
    >
      {/* Orbes decorativos */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Configura tu contraseña</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Elige una contraseña segura para <strong className="text-violet-400">{email}</strong>
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-5"
        >
          {/* Nueva contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-1.5">
              Nueva contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all"
            />
            <p className="text-slate-500 text-xs mt-1.5">Mínimo 8 caracteres. Usa letras, números y símbolos.</p>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label htmlFor="passwordConfirmation" className="block text-sm font-semibold text-slate-300 mb-1.5">
              Confirmar contraseña
            </label>
            <input
              id="passwordConfirmation"
              type="password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 transition-all"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-violet-500/30 active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Configurando...
              </>
            ) : (
              '🔒 Establecer contraseña'
            )}
          </button>

          <p className="text-center text-slate-500 text-sm">
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              ← Volver al inicio de sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
