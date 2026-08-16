import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeManager } from '../../components/themes/ThemeManager';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans flex flex-col">
            <ThemeManager />
            
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link to="/" className="text-slate-500 hover:text-violet-600 transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">MerxPOS</span>
                </div>
            </header>

            <main className="flex-grow max-w-4xl mx-auto px-6 py-12 w-full">
                <h1 className="text-3xl md:text-4xl font-black mb-8 text-slate-900 dark:text-white">Política de Privacidad</h1>
                
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 space-y-6">
                    <p>Última actualización: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Información que Recopilamos</h2>
                    <p>
                        Recopilamos información personal que usted nos proporciona voluntariamente, como nombre, correo 
                        electrónico y datos de contacto al registrarse en el Servicio. También almacenamos los datos 
                        operativos de su negocio (inventario, ventas, clientes) necesarios para el funcionamiento del POS.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. Uso de la Información</h2>
                    <p>
                        Utilizamos la información recopilada principalmente para proporcionar, mantener y mejorar nuestro 
                        Servicio. Esto incluye el procesamiento de transacciones, la autenticación de usuarios, la 
                        sincronización de datos entre sus dispositivos y el soporte técnico.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Almacenamiento Local (Offline)</h2>
                    <p>
                        Para permitir el funcionamiento sin conexión, MerxPOS almacena datos localmente en su navegador 
                        o dispositivo (usando tecnologías como IndexedDB). Estos datos se sincronizan con nuestros 
                        servidores seguros cuando recupera la conexión a internet.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Protección de Datos</h2>
                    <p>
                        Implementamos medidas de seguridad técnicas y organizativas diseñadas para proteger su 
                        información contra acceso no autorizado, alteración, divulgación o destrucción. Las 
                        comunicaciones con nuestros servidores están cifradas (HTTPS).
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. Compartir Información</h2>
                    <p>
                        No vendemos, alquilamos ni compartimos su información personal ni los datos de su negocio con 
                        terceros para fines comerciales. Solo podemos divulgar información si es requerido por ley o 
                        para proteger nuestros derechos.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">6. Derechos del Usuario</h2>
                    <p>
                        Usted tiene derecho a acceder, corregir o solicitar la eliminación de sus datos personales y los 
                        datos de su cuenta en cualquier momento contactando a nuestro equipo de soporte.
                    </p>
                </div>
            </main>
        </div>
    );
};
