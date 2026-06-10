import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export const QuinielaAdmin = () => {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<Record<string, { a: string, b: string }>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingMatches();
    }, []);

    const fetchPendingMatches = async () => {
        try {
            const res = await api.get('/worldcup/matches');
            // Filtrar solo los pendientes
            const pending = res.data.matches.filter((m: any) => m.status === 'PENDING');
            setMatches(pending);
        } catch (err) {
            console.error("Error fetching matches", err);
            toast.error("Error al cargar partidos");
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (matchId: string, team: 'a' | 'b', value: string) => {
        setResults(prev => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                [team]: value
            }
        }));
    };

    const submitResult = async (matchId: string) => {
        const scoreA = parseInt(results[matchId]?.a);
        const scoreB = parseInt(results[matchId]?.b);

        if (isNaN(scoreA) || isNaN(scoreB)) {
            toast.error("Ingresa ambos marcadores");
            return;
        }

        setSubmitting(matchId);
        try {
            await api.post('/worldcup/matches/result', {
                match_id: matchId,
                real_score_a: scoreA,
                real_score_b: scoreB
            });
            toast.success("Resultado guardado y puntos calculados");
            // Remover partido de la lista
            setMatches(prev => prev.filter(m => m.id !== matchId));
        } catch (err) {
            console.error("Error saving result", err);
            toast.error("Error al guardar resultado");
        } finally {
            setSubmitting(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando partidos pendientes...</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Administración Quiniela</h1>
            <p className="text-slate-500 mb-8">Carga los resultados reales de los partidos finalizados. Al guardar, el sistema calculará automáticamente los puntos de todos los jugadores.</p>

            <div className="grid gap-6">
                {matches.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500">
                        No hay partidos pendientes.
                    </div>
                ) : matches.map(match => (
                    <div key={match.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex-1 w-full flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="text-xl font-bold flex-1 text-center text-slate-700">{match.team_a}</div>
                            <div className="px-4 text-slate-400 font-black">VS</div>
                            <div className="text-xl font-bold flex-1 text-center text-slate-700">{match.team_b}</div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                min="0"
                                placeholder="0"
                                value={results[match.id]?.a ?? ''}
                                onChange={(e) => handleScoreChange(match.id, 'a', e.target.value)}
                                className="w-16 h-16 text-center text-2xl font-black bg-white border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-slate-800"
                            />
                            <span className="text-slate-400 font-bold">-</span>
                            <input 
                                type="number" 
                                min="0"
                                placeholder="0"
                                value={results[match.id]?.b ?? ''}
                                onChange={(e) => handleScoreChange(match.id, 'b', e.target.value)}
                                className="w-16 h-16 text-center text-2xl font-black bg-white border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-slate-800"
                            />
                            
                            <button 
                                onClick={() => submitResult(match.id)}
                                disabled={submitting === match.id}
                                className="ml-4 bg-primary hover:bg-primary-dark text-white px-6 py-4 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                {submitting === match.id ? 'Guardando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
