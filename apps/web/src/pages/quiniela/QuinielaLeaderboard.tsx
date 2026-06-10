import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const QuinielaLeaderboard = () => {
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`${apiUrl}/worldcup/leaderboard`);
                const data = await res.json();
                setLeaderboard(data.leaderboard);
            } catch (err) {
                console.error("Error fetching leaderboard", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [apiUrl]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                <div className="text-slate-400 font-medium tracking-wide">Cargando posiciones...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header with Navigation */}
            <header className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800 py-5 px-4 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-400 text-transparent bg-clip-text tracking-tight">
                        Tabla de Posiciones
                    </h1>
                    
                    <div className="flex items-center gap-4">
                        <Link 
                            to="/quiniela/dashboard"
                            className="text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                        >
                            Mis Pronósticos
                        </Link>
                        <button 
                            onClick={() => { localStorage.removeItem('quiniela_token'); navigate('/quiniela'); }}
                            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Salir
                        </button>
                    </div>
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

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"></div>
                    <h2 className="text-3xl font-black mb-8 text-center text-white mt-2">Top 50 Jugadores</h2>
                    
                    <div className="space-y-3">
                        {leaderboard.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                Aún no hay puntajes registrados.
                            </div>
                        ) : (
                            leaderboard.map((player, index) => {
                                const isFirst = index === 0;
                                const isSecond = index === 1;
                                const isThird = index === 2;
                                
                                let rankBadgeClass = "bg-slate-700 text-slate-300 border border-slate-600";
                                let rowBgClass = "bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50";
                                
                                if (isFirst) {
                                    rankBadgeClass = "bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-900 border-none shadow-lg shadow-yellow-500/30";
                                    rowBgClass = "bg-gradient-to-r from-yellow-900/40 to-slate-800 border border-yellow-700/50 shadow-md";
                                } else if (isSecond) {
                                    rankBadgeClass = "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 border-none shadow-lg shadow-slate-500/30";
                                    rowBgClass = "bg-gradient-to-r from-slate-700/40 to-slate-800 border border-slate-600/50 shadow-sm";
                                } else if (isThird) {
                                    rankBadgeClass = "bg-gradient-to-br from-orange-400 to-orange-700 text-orange-50 border-none shadow-lg shadow-orange-500/30";
                                    rowBgClass = "bg-gradient-to-r from-orange-900/30 to-slate-800 border border-orange-800/50 shadow-sm";
                                }

                                return (
                                    <div 
                                        key={index} 
                                        className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${rowBgClass}`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-12 h-12 flex items-center justify-center rounded-full font-black text-lg ${rankBadgeClass}`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className={`text-xl font-bold ${isFirst ? 'text-yellow-400' : isSecond ? 'text-slate-300' : isThird ? 'text-orange-400' : 'text-slate-200'}`}>
                                                    {player.first_name} {player.last_name}
                                                </div>
                                                {isFirst && <div className="text-xs text-yellow-500/80 font-bold uppercase tracking-wider mt-0.5">Líder Actual 🏆</div>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black bg-gradient-to-b from-white to-slate-400 text-transparent bg-clip-text">
                                                {player.total_points}
                                            </div>
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">PTS</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
