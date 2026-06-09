import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const QuinielaDashboard = () => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [predictions, setPredictions] = useState<Record<string, { predicted_score_a: number, predicted_score_b: number }>>({});
    const [loading, setLoading] = useState(true);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

    useEffect(() => {
        const token = localStorage.getItem('quiniela_token');
        if (!token) {
            navigate('/quiniela');
            return;
        }

        const fetchMatches = async () => {
            try {
                const res = await fetch(`${apiUrl}/worldcup/matches`);
                const data = await res.json();
                setMatches(data.matches);
            } catch (err) {
                console.error("Error fetching matches", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, [navigate, apiUrl]);

    const handleScoreChange = (matchId: string, team: 'a' | 'b', value: string) => {
        const val = parseInt(value);
        const numVal = isNaN(val) ? 0 : Math.max(0, val);
        setPredictions(prev => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                [`predicted_score_${team}`]: numVal
            }
        }));
    };

    const submitPredictions = async () => {
        const token = localStorage.getItem('quiniela_token');
        const predsArray = Object.keys(predictions).map(matchId => ({
            match_id: matchId,
            predicted_score_a: predictions[matchId].predicted_score_a || 0,
            predicted_score_b: predictions[matchId].predicted_score_b || 0,
        }));

        if (predsArray.length === 0) return alert('Ingresa al menos un pronóstico antes de guardar.');

        try {
            const res = await fetch(`${apiUrl}/worldcup/predictions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ predictions: predsArray })
            });

            if (res.ok) {
                alert('¡Tus pronósticos han sido guardados con éxito!');
            } else {
                alert('Hubo un error al guardar los pronósticos.');
            }
        } catch (err) {
            alert('Error de conexión al guardar pronósticos.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="text-slate-400 font-medium tracking-wide">Cargando partidos...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800 py-5 px-4 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text tracking-tight">
                        Mis Pronósticos
                    </h1>
                    <button 
                        onClick={() => { localStorage.removeItem('quiniela_token'); navigate('/quiniela'); }}
                        className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 mt-8">
                {/* Banner Conversión POS */}
                <div className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-700/40 shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
                    <div className="relative z-10 text-center md:text-left">
                        <h3 className="text-2xl font-bold mb-2 text-white">¿Tienes un negocio? 🏪</h3>
                        <p className="text-indigo-200 text-lg">Activa 30 días gratis en MerxPOS para digitalizar tus ventas al instante.</p>
                    </div>
                    <Link to="/register" className="relative z-10 shrink-0 bg-white text-indigo-900 hover:bg-indigo-50 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 text-lg">
                        Crear Cuenta MerxPOS
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <h2 className="text-2xl font-bold text-slate-100">Partidos Disponibles</h2>
                    <button 
                        onClick={submitPredictions}
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                    >
                        Guardar Pronósticos
                    </button>
                </div>

                <div className="grid gap-5">
                    {matches.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-slate-800/50 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                            <div className="text-5xl mb-4">⚽</div>
                            No hay partidos programados aún.
                        </div>
                    ) : matches.map(match => (
                        <div key={match.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-lg hover:border-slate-600 transition-colors">
                            <div className="w-full lg:flex-1 flex items-center justify-between bg-slate-900/60 rounded-2xl p-5 border border-slate-700/50 shadow-inner">
                                <div className="text-xl sm:text-2xl font-bold flex-1 text-center truncate px-2">{match.team_a}</div>
                                <div className="px-6 text-slate-500 font-black text-lg bg-slate-800/50 py-1 rounded-lg">VS</div>
                                <div className="text-xl sm:text-2xl font-bold flex-1 text-center truncate px-2">{match.team_b}</div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="0"
                                    value={predictions[match.id]?.predicted_score_a ?? ''}
                                    onChange={(e) => handleScoreChange(match.id, 'a', e.target.value)}
                                    className="w-20 h-20 text-center text-3xl font-black bg-slate-900/80 border-2 border-slate-600 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-700"
                                />
                                <span className="text-slate-600 font-bold text-2xl">-</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="0"
                                    value={predictions[match.id]?.predicted_score_b ?? ''}
                                    onChange={(e) => handleScoreChange(match.id, 'b', e.target.value)}
                                    className="w-20 h-20 text-center text-3xl font-black bg-slate-900/80 border-2 border-slate-600 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-700"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};
