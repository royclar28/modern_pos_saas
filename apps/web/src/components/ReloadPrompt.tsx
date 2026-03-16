import { useRegisterSW } from 'virtual:pwa-register/react';

export const ReloadPrompt = () => {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration | undefined) {
            console.log(`[SW] Registrado en: ${swUrl}`);
            // Revisar actualizaciones cada hora
            if (r) {
                setInterval(() => {
                    r.update();
                }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error: Error) {
            console.error('[SW] Error al registrar:', error);
        },
    });

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
            <div className="flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-black/25 border border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                    </span>
                    <p className="text-sm font-medium">
                        Nueva versión disponible
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                        Actualizar
                    </button>
                    <button
                        onClick={() => setNeedRefresh(false)}
                        className="text-slate-400 hover:text-white text-sm px-3 py-2 rounded-xl transition-colors"
                    >
                        Luego
                    </button>
                </div>
            </div>
        </div>
    );
};
