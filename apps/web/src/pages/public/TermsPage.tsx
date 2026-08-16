import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeManager } from '../../components/themes/ThemeManager';
import { ArrowLeft } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
                <h1 className="text-3xl md:text-4xl font-black mb-8 text-slate-900 dark:text-white">Términos de Servicio</h1>
                
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 space-y-6">
                    <p>Última actualización: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Aceptación de los Términos</h2>
                    <p>
                        Al acceder y utilizar MerxPOS ("el Servicio"), usted acepta estar sujeto a estos Términos de Servicio. 
                        Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. Descripción del Servicio</h2>
                    <p>
                        MerxPOS es un sistema de Punto de Venta (POS) basado en la nube y con capacidades offline, diseñado 
                        para gestionar ventas, inventario y facturación de pequeños y medianos comercios.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Cuentas de Usuario</h2>
                    <p>
                        Para utilizar el Servicio, debe registrarse y crear una cuenta. Usted es responsable de salvaguardar 
                        la contraseña que utiliza para acceder al Servicio y de cualquier actividad o acción bajo su contraseña.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Período de Prueba y Pagos</h2>
                    <p>
                        Ofrecemos un período de prueba gratuito de 30 días. Al finalizar este período, deberá adquirir una 
                        suscripción de pago para continuar usando el Servicio. Nos reservamos el derecho de modificar nuestras 
                        tarifas en cualquier momento, notificándolo con antelación.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. Propiedad de los Datos</h2>
                    <p>
                        Usted conserva todos los derechos sobre los datos de su negocio (clientes, ventas, inventario) que 
                        ingrese en MerxPOS. Nosotros no venderemos ni compartiremos sus datos comerciales con terceros.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">6. Limitación de Responsabilidad</h2>
                    <p>
                        En ningún caso MerxPOS será responsable por daños indirectos, incidentales, especiales, consecuentes o 
                        punitivos, incluyendo sin limitación, pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas 
                        intangibles, resultantes de su acceso o uso o incapacidad de acceder o usar el Servicio.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">7. Contacto</h2>
                    <p>
                        Si tiene alguna pregunta sobre estos Términos, contáctenos a través de nuestro soporte técnico.
                    </p>
                </div>
            </main>
        </div>
    );
};
