import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const QuinielaLanding = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiUrl}/worldcup/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.errors?.email?.[0] || 'Error al registrar');
            }

            localStorage.setItem('quiniela_token', data.token);
            navigate('/quiniela/dashboard');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/20 blur-[120px] rounded-full"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[100px] rounded-full"></div>
            </div>

            <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-12 lg:gap-20 items-center relative z-10">
                <div className="flex-1 text-center lg:text-left">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-900/40 text-emerald-400 font-semibold mb-6 border border-emerald-800/50 backdrop-blur-sm">
                        🏆 El evento más grande del año
                    </div>
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 bg-gradient-to-br from-emerald-300 via-emerald-400 to-cyan-500 text-transparent bg-clip-text leading-tight tracking-tight">
                        Pronostica y Gana
                    </h1>
                    <p className="text-xl sm:text-2xl text-slate-300 mb-10 font-light leading-relaxed">
                        Participa por <strong className="text-white font-bold">Camisas Oficiales</strong> y <strong className="text-white font-bold">1 Mes Gratis de MerxPOS</strong> para tu negocio.
                    </p>
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-8 rounded-3xl border border-slate-700/60 shadow-2xl backdrop-blur-md">
                        <div className="text-4xl mb-4">🚀</div>
                        <h2 className="text-2xl font-bold mb-3 text-white">¿Tienes un negocio o tienda?</h2>
                        <p className="text-slate-400 mb-6 text-lg leading-relaxed">Activa 30 días gratis en MerxPOS para digitalizar tus ventas, inventario y reportes financieros al instante.</p>
                        <Link to="/register" className="bg-white hover:bg-slate-100 text-slate-900 px-8 py-3.5 rounded-xl font-bold transition-all inline-block shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                            Crear cuenta en MerxPOS →
                        </Link>
                    </div>
                </div>

                <div className="w-full max-w-md bg-slate-800/90 p-8 sm:p-10 rounded-[2rem] border border-slate-700/50 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-cyan-400"></div>
                    <h2 className="text-2xl font-bold mb-8 text-center mt-2 text-white">Regístrate para Jugar</h2>
                    
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 text-sm border border-red-500/20 font-medium">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 ml-1">Nombre</label>
                                <input type="text" name="first_name" onChange={handleChange} required className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-600" placeholder="Juan" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 ml-1">Apellido</label>
                                <input type="text" name="last_name" onChange={handleChange} required className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-600" placeholder="Pérez" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 ml-1">Correo Electrónico</label>
                            <input type="email" name="email" onChange={handleChange} required className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-600" placeholder="juan@ejemplo.com" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 ml-1">Contraseña</label>
                            <input type="password" name="password" onChange={handleChange} required className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-600" placeholder="••••••••" />
                        </div>
                        
                        <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 mt-6 text-lg">
                            Entrar a la Quiniela
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
