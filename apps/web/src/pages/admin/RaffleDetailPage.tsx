import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useAuth } from '../../contexts/AuthProvider';
import { ArrowLeft, Users, Trophy, Play, Plus, ContactRound, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const RaffleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token } = useAuth();
    const [raffle, setRaffle] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'prizes' | 'participants'>('prizes');
    
    // Formularios
    const [prizeName, setPrizeName] = useState('');
    const [prizePos, setPrizePos] = useState(1);
    
    const [partName, setPartName] = useState('');
    const [partPhone, setPartPhone] = useState('');

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    const fetchRaffle = async () => {
        try {
            const res = await fetch(`${apiUrl}/raffles/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setRaffle(await res.json());
        } catch (error) {
            toast.error('Error al cargar detalle');
        }
    };

    useEffect(() => {
        if (id) fetchRaffle();
    }, [id]);

    const addPrize = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiUrl}/raffles/${id}/prizes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: prizeName, position: prizePos })
            });
            if (res.ok) {
                toast.success('Premio añadido');
                setPrizeName('');
                setPrizePos(prizePos + 1);
                fetchRaffle();
            } else {
                toast.error('Error al añadir premio');
            }
        } catch (error) { toast.error('Error de red'); }
    };

    const addParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiUrl}/raffles/${id}/participants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: partName, phone: partPhone })
            });
            if (res.ok) {
                toast.success('Participante añadido');
                setPartName('');
                setPartPhone('');
                fetchRaffle();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Error al añadir participante');
            }
        } catch (error) { toast.error('Error de red'); }
    };

    const importContact = async () => {
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            toast.error('Tu navegador no soporta importar contactos (Contact Picker API). Usa Chrome en Android o iOS 14.5+.');
            return;
        }

        try {
            const props = ['name', 'tel'];
            const opts = { multiple: true };
            const contacts = await (navigator as any).contacts.select(props, opts);
            if (contacts.length > 0) {
                let successCount = 0;
                let errorCount = 0;
                
                toast.loading(`Importando ${contacts.length} contactos...`, { id: 'import-toast' });
                
                for (const c of contacts) {
                    const cName = c.name ? c.name[0] : 'Desconocido';
                    const cPhone = c.tel ? c.tel[0].replace(/\D/g, '') : '';
                    
                    try {
                        const res = await fetch(`${apiUrl}/raffles/${id}/participants`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ name: cName, phone: cPhone })
                        });
                        if (res.ok) successCount++;
                        else errorCount++;
                    } catch (e) {
                        errorCount++;
                    }
                }
                
                toast.dismiss('import-toast');
                if (successCount > 0) toast.success(`Se importaron ${successCount} contactos correctamente.`);
                if (errorCount > 0) toast.error(`Hubo errores al importar ${errorCount} contactos.`);
                
                fetchRaffle();
            }
        } catch (error) {
            // User cancelled or error
        }
    };

    const setStatus = async (status: string) => {
        try {
            const res = await fetch(`${apiUrl}/raffles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success('Estado actualizado');
                fetchRaffle();
            }
        } catch (error) {}
    };

    const cleanPhone = (phone: string) => phone.replace(/\D/g, '');

    if (!raffle) return <div className="text-center py-20">Cargando...</div>;

    const publicUrl = `${window.location.origin}/raffles/live/${raffle.id}`;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <AppHeader title="Detalle del Sorteo" />
            <div className="max-w-5xl mx-auto px-4 py-8">
                <Link to="/admin/raffles" className="inline-flex items-center gap-2 text-slate-500 hover:text-violet-600 mb-6 font-semibold">
                    <ArrowLeft size={20} /> Volver a sorteos
                </Link>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">{raffle.name}</h1>
                        <div className="flex gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Trophy size={16}/> {raffle.prizes?.length || 0} Premios</span>
                            <span className="flex items-center gap-1"><Users size={16}/> {raffle.participants?.length || 0} Participantes</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <select 
                            value={raffle.status} 
                            onChange={e => setStatus(e.target.value)}
                            className="rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 font-bold text-sm"
                        >
                            <option value="draft">Borrador</option>
                            <option value="active">Activo (Listo para sortear)</option>
                            <option value="completed">Completado</option>
                        </select>
                        <Link to={`/raffles/live/${raffle.id}`} target="_blank" className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md">
                            <Play size={20} /> Abrir Sorteo en Vivo
                        </Link>
                    </div>
                </div>

                <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => setActiveTab('prizes')} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'prizes' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        Premios
                    </button>
                    <button onClick={() => setActiveTab('participants')} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'participants' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        Participantes ({raffle.participants?.length || 0})
                    </button>
                </div>

                {activeTab === 'prizes' && (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus size={20}/> Añadir Premio</h3>
                            <form onSubmit={addPrize} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Premio</label>
                                    <input required type="text" className="w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700" value={prizeName} onChange={e => setPrizeName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Posición (1 = Premio Mayor)</label>
                                    <input required type="number" min="1" className="w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700" value={prizePos} onChange={e => setPrizePos(Number(e.target.value))} />
                                </div>
                                <button type="submit" className="w-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 py-2.5 rounded-xl font-bold">Añadir</button>
                            </form>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            {raffle.prizes?.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">No hay premios registrados.</div>
                            ) : (
                                raffle.prizes?.sort((a:any, b:any) => a.position - b.position).map((prize: any) => {
                                    const winner = raffle.participants?.find((p:any) => p.id === prize.winner_participant_id);
                                    
                                    return (
                                        <div key={prize.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-lg shrink-0">
                                                    {prize.position}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 dark:text-white">{prize.name}</div>
                                                    {winner ? (
                                                        <div className="text-sm text-emerald-600 font-bold mt-1">🎉 Ganador: {winner.name}</div>
                                                    ) : (
                                                        <div className="text-sm text-slate-400 mt-1">A la espera de sorteo</div>
                                                    )}
                                                </div>
                                            </div>
                                            {winner && winner.phone && (
                                                <a 
                                                    href={`https://wa.me/${cleanPhone(winner.phone)}?text=${encodeURIComponent(`¡Felicidades ${winner.name}! 🎉 Has ganado el premio: ${prize.name} en nuestro sorteo.`)}`}
                                                    target="_blank"
                                                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shrink-0"
                                                >
                                                    <MessageCircle size={16} /> Notificar Ganador
                                                </a>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'participants' && (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                            <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Users size={20}/> Añadir</span>
                                {('contacts' in navigator) && (
                                    <button onClick={importContact} type="button" className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 p-2 rounded-lg flex items-center gap-1 font-bold transition-colors">
                                        <ContactRound size={14} /> Importar
                                    </button>
                                )}
                            </h3>
                            <form onSubmit={addParticipant} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo</label>
                                    <input required type="text" className="w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700" value={partName} onChange={e => setPartName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono (opcional, con código de país)</label>
                                    <input type="tel" placeholder="Ej. 584241234567" className="w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700" value={partPhone} onChange={e => setPartPhone(e.target.value)} />
                                    <p className="text-[10px] text-slate-400 mt-1">Sirve para notificarle vía WhatsApp.</p>
                                </div>
                                <button type="submit" className="w-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 py-2.5 rounded-xl font-bold">Añadir Participante</button>
                            </form>
                        </div>
                        <div className="md:col-span-2">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="p-4 font-bold text-slate-500">Nombre</th>
                                            <th className="p-4 font-bold text-slate-500">Teléfono</th>
                                            <th className="p-4 font-bold text-slate-500 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {raffle.participants?.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                                <td className="p-4 font-medium">{p.name}</td>
                                                <td className="p-4 text-slate-500">{p.phone || '-'}</td>
                                                <td className="p-4 text-right">
                                                    {p.phone && (
                                                        <a 
                                                            href={`https://wa.me/${cleanPhone(p.phone)}?text=${encodeURIComponent(`¡Hola ${p.name}! Ya estás participando en el sorteo "${raffle.name}". El sorteo será transmitido en vivo, guárdate este link para verlo: ${publicUrl}`)}`}
                                                            target="_blank"
                                                            className="text-emerald-500 hover:text-emerald-600 font-bold inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg transition-colors"
                                                            title="Notificar link de sorteo"
                                                        >
                                                            <MessageCircle size={16} /> Notificar
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {raffle.participants?.length === 0 && (
                                            <tr><td colSpan={3} className="p-8 text-center text-slate-500">No hay participantes</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
