import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthProvider';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/Button'; // Import adjusted assuming standard shadcn
import { Label } from '@/components/ui/label';

// Esquema de validación usando Zod
const loginSchema = z.object({
    username: z.string().min(3, { message: 'El usuario debe tener al menos 3 caracteres' }),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setError(null);
        try {
            const apiUrl = `http://${window.location.hostname}:3333/api` || 'http://localhost:3333';
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Credenciales inválidas');
            }

            const result = await response.json();

            // La API nos devuelve un token; podemos sacar los datos básicos de allí.
            // (Aquí hacemos un parse rápido para alimentar el context, normalmente se hace on the context anyway)
            login(result.access_token, {
                username: data.username,
                role: 'EMPLOYEE', // Esto lo leerá el AuthProvider luego
                sub: 0,
            });

        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-50 font-sans">
            {/* Lado Izquierdo (Branding) */}
            <div className="flex flex-col justify-center items-center lg:items-start lg:w-1/2 p-10 lg:p-20 bg-gradient-to-br from-indigo-900 via-blue-800 to-emerald-800 text-white shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 z-0"></div>
                <div className="max-w-xl text-center lg:text-left relative z-10 w-full">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md mb-8 flex items-center justify-center border border-white/20 mx-auto lg:mx-0 shadow-xl">
                        <span className="text-3xl">📦</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black mb-6 tracking-tight drop-shadow-sm">Merx POS</h1>
                    <p className="text-xl lg:text-3xl font-light text-indigo-100 leading-snug drop-shadow-sm max-w-lg">
                        El punto de venta inteligente que transforma tu negocio.
                    </p>
                </div>
            </div>

            {/* Lado Derecho (Formulario) */}
            <div className="flex flex-col justify-center items-center lg:w-1/2 p-6 sm:p-12 bg-slate-50 w-full relative">
                <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-8 sm:p-10 border-0">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-black text-slate-800 mb-2">Bienvenido</h2>
                        <p className="text-slate-500 font-medium">Ingresa tus credenciales para acceder</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {error && (
                            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 font-medium border border-red-100 flex items-center gap-3">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="username" className="block text-sm font-bold text-slate-700 ml-1">Usuario o Email</label>
                            <input
                                id="username"
                                type="text"
                                placeholder="admin o correo@ejemplo.com"
                                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all"
                                {...register('username')}
                            />
                            {errors.username && (
                                <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.username.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-bold text-slate-700 ml-1">Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all tracking-widest"
                                {...register('password')}
                            />
                            {errors.password && (
                                <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full bg-indigo-600 text-white font-bold text-lg p-4 rounded-2xl shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.5)] hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 hover:-translate-y-1 transition-all flex justify-center items-center gap-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                        Iniciando sesión...
                                    </>
                                ) : 'Iniciar Sesión'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
