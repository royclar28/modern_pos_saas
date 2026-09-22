import { useState, useEffect } from 'react';
import { ArrowRight, Zap } from 'lucide-react';

export const PlanLimitGuard = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleLimitExceeded = () => {
            setIsOpen(true);
        };
        window.addEventListener('plan:limit_exceeded', handleLimitExceeded);
        return () => window.removeEventListener('plan:limit_exceeded', handleLimitExceeded);
    }, []);

    if (!isOpen) return null;

    const whatsapp = import.meta.env.VITE_SUPPORT_WHATSAPP || '584241234567';
    const msg = encodeURIComponent(`Hola! He alcanzado el límite de mi Plan Inicial y quiero hacer un Upgrade al Plan Emprendedor/Negocio.`);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mb-6 shadow-lg shadow-red-500/20">
                        <Zap size={32} />
                    </div>
                    
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4">
                        ¡Límite Alcanzado!
                    </h2>
                    
                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg leading-relaxed">
                        Tu <strong>Plan Inicial (Gratis)</strong> incluye hasta 100 facturas mensuales. Has superado este límite y las nuevas ventas no se sincronizarán hasta mejorar tu plan.
                    </p>
                    
                    <div className="bg-violet-50 dark:bg-violet-900/10 border-l-4 border-violet-500 p-5 rounded-r-2xl mb-8">
                        <h4 className="font-black text-violet-900 dark:text-violet-100 mb-2">Desbloquea el Plan Emprendedor</h4>
                        <ul className="text-sm font-medium text-violet-700 dark:text-violet-300 space-y-2">
                            <li>✓ Facturas y Cajas ilimitadas</li>
                            <li>✓ Reporte Z y Arqueos detallados</li>
                            <li>✓ Facturación offline ininterrumpida</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <a
                            href={`https://wa.me/${whatsapp}?text=${msg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex justify-center items-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/30 hover:-translate-y-0.5"
                        >
                            Mejorar Plan <ArrowRight size={20} />
                        </a>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
