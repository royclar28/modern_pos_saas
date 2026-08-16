import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthProvider';

/**
 * TrialExpiredGuard
 *
 * Intercepta respuestas HTTP 402 de la API y muestra una pantalla
 * de bloqueo amigable con el botón de contacto por WhatsApp.
 *
 * Uso: Envuelve el árbol de la app (ya autenticado) en App.tsx.
 *
 * <TrialExpiredGuard whatsappNumber="584124714797">
 *   {children}
 * </TrialExpiredGuard>
 */

const WHATSAPP_NUMBER = import.meta.env.VITE_SUPPORT_WHATSAPP || '584124714797';

// ─── Animación de partículas decorativa ───────────────────────────────────────
const FloatingOrb = ({ className }: { className: string }) => (
    <div className={`absolute rounded-full opacity-20 animate-pulse blur-3xl ${className}`} />
);

// ─── Pantalla de bloqueo ───────────────────────────────────────────────────────
const TrialExpiredScreen = ({ expiredAt, storeName }: { expiredAt?: string; storeName?: string }) => {
    const { logout } = useAuth();
    const expiredDate = expiredAt ? new Date(expiredAt).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric'
    }) : null;

    const message = encodeURIComponent(
        `Hola! Mi período de prueba de ${storeName || 'mi tienda POS'} expiró el ${expiredDate || 'recientemente'}. ` +
        `Me gustaría renovar mi suscripción. ¿Cuáles son los planes disponibles?`
    );

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

            {/* Orbes de fondo */}
            <FloatingOrb className="w-96 h-96 bg-violet-600 top-[-100px] left-[-100px]" />
            <FloatingOrb className="w-72 h-72 bg-indigo-500 bottom-[-80px] right-[-80px]" />
            <FloatingOrb className="w-48 h-48 bg-purple-400 top-1/2 left-1/4" />

            {/* Card principal */}
            <div className="relative z-10 max-w-md w-full mx-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center shadow-2xl">

                    {/* Ícono animado */}
                    <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                            <span className="text-4xl">🔒</span>
                        </div>
                    </div>

                    {/* Título */}
                    <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
                        Período de prueba expirado
                    </h1>
                    <p className="text-white/60 text-sm mb-1">
                        {storeName && <span className="text-violet-300 font-semibold">{storeName}</span>}
                    </p>
                    {expiredDate && (
                        <p className="text-white/50 text-xs mb-6">
                            Tu acceso expiró el <span className="text-white/70 font-medium">{expiredDate}</span>
                        </p>
                    )}

                    {/* Mensaje */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left">
                        <p className="text-white/80 text-sm leading-relaxed">
                            Tu prueba gratuita de <strong className="text-violet-300">30 días</strong> ha finalizado.
                            Para continuar usando el sistema y no perder tus datos, contacta al soporte para activar tu suscripción.
                        </p>
                    </div>

                    {/* CTA Principal: WhatsApp */}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 active:scale-[0.98] mb-3"
                    >
                        <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Renovar por WhatsApp
                    </a>

                    {/* Link secundario: cerrar sesión */}
                    <button
                        onClick={logout}
                        className="text-white/40 hover:text-white/70 text-xs transition-colors underline underline-offset-2"
                    >
                        Cerrar sesión
                    </button>
                </div>

                {/* Sello de seguridad */}
                <p className="text-center text-white/20 text-xs mt-4">
                    Tus datos están seguros y no serán eliminados
                </p>
            </div>
        </div>
    );
};

// ─── Hook: interceptor global de fetch ────────────────────────────────────────
/**
 * Parchea el fetch global para detectar respuestas 402.
 * Al detectar una, emite un CustomEvent 'trial:expired' con el body.
 * Esto permite que el guard reaccione sin importar quién hizo la petición.
 */
function useGlobal402Interceptor(onExpired: (data: any) => void) {
    const onExpiredRef = useRef(onExpired);
    onExpiredRef.current = onExpired;

    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);

            if (response.status === 402) {
                try {
                    const clone = response.clone();
                    const data = await clone.json();
                    if (data?.error === 'TRIAL_EXPIRED') {
                        onExpiredRef.current(data);
                    }
                } catch {
                    // Si no es JSON, ignorar
                }
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface TrialExpiredGuardProps {
    children: React.ReactNode;
    storeName?: string;
}

export const TrialExpiredGuard = ({ children, storeName }: TrialExpiredGuardProps) => {
    const [expiredData, setExpiredData] = useState<{ expired_at?: string } | null>(null);

    useGlobal402Interceptor((data) => {
        setExpiredData(data);
    });

    if (expiredData) {
        return (
            <TrialExpiredScreen
                expiredAt={expiredData.expired_at}
                storeName={storeName}
            />
        );
    }

    return <>{children}</>;
};
