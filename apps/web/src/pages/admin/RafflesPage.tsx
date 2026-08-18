import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Plus, Calendar, Settings, Play, Trash2 } from 'lucide-react';
import { AppHeader } from '../../components/AppHeader';
import { useAuth } from '../../contexts/AuthProvider';
import toast from 'react-hot-toast';

interface Raffle {
    id: string;
    name: string;
    status: string;
    draw_date: string | null;
}

export const RafflesPage: React.FC = () => {
    const { token } = useAuth();
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState('');

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    useEffect(() => {
        fetchRaffles();
    }, []);

    const fetchRaffles = async () => {
        try {
            const res = await fetch(`${apiUrl}/raffles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRaffles(data);
            }
        } catch (error) {
            toast.error('Error al cargar sorteos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRaffle = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este sorteo? Esta acción no se puede deshacer.')) return;
        
        try {
            const res = await fetch(`${apiUrl}/raffles/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Error al eliminar');
            
            toast.success('Sorteo eliminado');
            fetchRaffles();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar el sorteo');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return toast.error('El nombre es requerido');

        try {
            const res = await fetch(`${apiUrl}/raffles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName, draw_date: newDate || null })
            });

            if (res.ok) {
                toast.success('Sorteo creado');
                setShowCreate(false);
                setNewName('');
                setNewDate('');
                fetchRaffles();
            } else {
                toast.error('Error al crear sorteo');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <AppHeader title="Gestión de Sorteos" />
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-black flex items-center gap-2 text-slate-800 dark:text-white">
                        <Gift className="text-violet-500" /> Mis Sorteos
                    </h1>
                    <button 
                        onClick={() => setShowCreate(!showCreate)}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors"
                    >
                        <Plus size={20} /> Nuevo Sorteo
                    </button>
                </div>

                {showCreate && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                        <h2 className="font-bold mb-4">Crear Nuevo Sorteo</h2>
                        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
                            <input 
                                type="text" 
                                placeholder="Nombre del Sorteo (Ej. Día de la Madre)"
                                className="flex-1 rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <input 
                                type="datetime-local" 
                                className="rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                value={newDate}
                                onChange={e => setNewDate(e.target.value)}
                            />
                            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">
                                Guardar
                            </button>
                        </form>
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-10 text-slate-500">Cargando sorteos...</div>
                ) : raffles.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Gift size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-600 dark:text-slate-400">No tienes sorteos aún</h3>
                        <p className="text-slate-400 text-sm mt-2">Crea tu primer sorteo para premiar a tus clientes.</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {raffles.map(raffle => (
                            <div key={raffle.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-2">{raffle.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-lg font-bold ${
                                            raffle.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                            raffle.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {raffle.status.toUpperCase()}
                                        </span>
                                        <button 
                                            onClick={() => handleDeleteRaffle(raffle.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Eliminar Sorteo"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-6">
                                    <Calendar size={14} /> 
                                    {raffle.draw_date ? new Date(raffle.draw_date).toLocaleString() : 'Sin fecha programada'}
                                </div>
                                <div className="mt-auto flex gap-2">
                                    <Link to={`/admin/raffles/${raffle.id}`} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-center font-semibold text-sm flex items-center justify-center gap-1 transition-colors">
                                        <Settings size={16} /> Administrar
                                    </Link>
                                    <Link to={`/raffles/live/${raffle.id}`} target="_blank" className="flex-1 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 py-2 rounded-xl text-center font-semibold text-sm flex items-center justify-center gap-1 transition-colors">
                                        <Play size={16} /> En Vivo
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
