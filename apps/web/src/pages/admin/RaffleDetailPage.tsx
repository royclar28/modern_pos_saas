import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useAuth } from '../../contexts/AuthProvider';
import { ArrowLeft, Users, Trophy, Play, Plus, ContactRound, MessageCircle, Bell, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export const RaffleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token } = useAuth();
    const [raffle, setRaffle] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'prizes' | 'participants' | 'settings'>('prizes');

    // Formularios
    const [prizeName, setPrizeName] = useState('');
    const [prizePos, setPrizePos] = useState(1);
    
    const [partName, setPartName] = useState('');
    const [partPhone, setPartPhone] = useState('');

    // Configuración de timing
    const [startsAt, setStartsAt] = useState('');
    const [claimMinutes, setClaimMinutes] = useState<number | ''>(2);

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

    // Sincronizar campos de config con el raffle cargado
    useEffect(() => {
        if (raffle) {
            if (raffle.starts_at) {
                // Convertir ISO a formato datetime-local
                const d = new Date(raffle.starts_at);
                const pad = (n: number) => n.toString().padStart(2, '0');
                setStartsAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
            }
            if (raffle.winner_claim_minutes) setClaimMinutes(raffle.winner_claim_minutes);
        }
    }, [raffle?.id]);

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
            toast.error('Tu navegador no soporta importar contactos. Usa Chrome en Android.');
            return;
        }

        let contacts: any[] = [];
        try {
            contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
        } catch {
            return; // Usuario canceló
        }

        if (!contacts || contacts.length === 0) return;

        const loadingToast = toast.loading(`Importando ${contacts.length} contacto(s)...`);

        // Enviar todas las requests en paralelo
        const promises = contacts.map((c: any) => {
            const cName = c.name?.[0] || 'Desconocido';
            const cPhone = c.tel?.[0]?.replace(/\D/g, '') || '';
            return fetch(`${apiUrl}/raffles/${id}/participants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: cName, phone: cPhone })
            }).then(r => r.ok ? 'ok' : 'err').catch(() => 'err');
        });

        const results = await Promise.allSettled(promises);
        const successCount = results.filter(r => r.status === 'fulfilled' && (r as any).value === 'ok').length;
        const errorCount = results.length - successCount;

        toast.dismiss(loadingToast);
        if (successCount > 0) toast.success(`✅ ${successCount} contacto(s) importados.`);
        if (errorCount > 0) toast.error(`❌ ${errorCount} contacto(s) fallaron (quizás duplicados).`);

        fetchRaffle();
    };

    const setStatus = async (status: string) => {
        try {
            const res = await fetch(`${apiUrl}/raffles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            if (res.ok) { toast.success('Estado actualizado'); fetchRaffle(); }
        } catch (error) {}
    };

    const saveTiming = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiUrl}/raffles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    starts_at: startsAt || null,
                    winner_claim_minutes: claimMinutes || null,
                })
            });
            if (res.ok) { toast.success('Configuración guardada'); fetchRaffle(); }
            else toast.error('Error al guardar');
        } catch { toast.error('Error de red'); }
    };

    const remindAll = () => {
        const participants = raffle?.participants?.filter((p: any) => p.phone) || [];
        if (participants.length === 0) {
            toast.error('Ningún participante tiene teléfono registrado.');
            return;
        }
        const msg = encodeURIComponent(`¡Hola! El sorteo "${raffle.name}" está a punto de comenzar. Únete en vivo aquí: ${publicUrl}`);
        participants.forEach((p: any, i: number) => {
            setTimeout(() => {
                window.open(`https://wa.me/${cleanPhone(p.phone)}?text=${msg}`, '_blank');
            }, i * 500); // Pequeño delay entre cada apertura
        });
        toast.success(`Abriendo WhatsApp para ${participants.length} participante(s)...`);
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

                <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <button onClick={() => setActiveTab('prizes')} className={`px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'prizes' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        Premios
                    </button>
                    <button onClick={() => setActiveTab('participants')} className={`px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'participants' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        Participantes ({raffle.participants?.length || 0})
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${activeTab === 'settings' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Clock size={16} /> Configuración
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
                                <div className="flex items-center gap-2">
                                    {('contacts' in navigator) && (
                                        <button onClick={importContact} type="button" className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 p-2 rounded-lg flex items-center gap-1 font-bold transition-colors">
                                            <ContactRound size={14} /> Importar
                                        </button>
                                    )}
                                </div>
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

                {/* Pestaña Configuración */}
                {activeTab === 'settings' && (
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* Hora de inicio */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Clock size={20} className="text-violet-500"/> Hora de Inicio</h3>
                            <p className="text-xs text-slate-400 mb-4">Los participantes verán un conteo regresivo en la pantalla del sorteo.</p>
                            <form onSubmit={saveTiming} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fecha y hora de inicio</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                                        value={startsAt}
                                        onChange={e => setStartsAt(e.target.value)}
                                    />
                                    {startsAt && (
                                        <button type="button" onClick={() => setStartsAt('')} className="text-xs text-slate-400 hover:text-red-500 mt-1">
                                            × Quitar hora programada
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Minutos para reclamar el premio (opcional)</label>
                                    <p className="text-[10px] text-slate-400 mb-2">Si el ganador no se presenta en este tiempo, se muestra la opción de re-sortear. Deja vacío para desactivar.</p>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="1" max="60"
                                            placeholder="Ej. 2"
                                            className="w-24 rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-center font-bold"
                                            value={claimMinutes}
                                            onChange={e => setClaimMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                                        />
                                        <span className="text-sm text-slate-500">minutos</span>
                                        {claimMinutes !== '' && (
                                            <button type="button" onClick={() => setClaimMinutes('')} className="text-xs text-slate-400 hover:text-red-500">
                                                × Desactivar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl font-bold transition-colors">
                                    Guardar Configuración
                                </button>
                            </form>
                        </div>

                        {/* Notificar a todos */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Bell size={20} className="text-emerald-500"/> Recordar a Participantes</h3>
                            <p className="text-xs text-slate-400 mb-6">Envía un mensaje de WhatsApp a todos los participantes con teléfono registrado, avisándoles que el sorteo está por comenzar.</p>

                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 text-sm">
                                <p className="font-bold text-slate-600 dark:text-slate-300 mb-1">Vista previa del mensaje:</p>
                                <p className="text-slate-500 italic text-xs">
                                    "¡Hola! El sorteo "{raffle.name}" está a punto de comenzar. Únete en vivo aquí: {publicUrl.substring(0, 40)}..."
                                </p>
                            </div>

                            <div className="text-sm text-slate-500 mb-4">
                                {(() => {
                                    const withPhone = raffle.participants?.filter((p: any) => p.phone)?.length || 0;
                                    const total = raffle.participants?.length || 0;
                                    return <span>{withPhone} de {total} participantes tienen teléfono registrado.</span>;
                                })()}
                            </div>

                            <button
                                onClick={remindAll}
                                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                            >
                                <Bell size={20} /> Notificar a Todos por WhatsApp
                            </button>
                            <p className="text-[10px] text-slate-400 mt-2 text-center">Se abrirá WhatsApp con un mensaje por cada participante.</p>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};
