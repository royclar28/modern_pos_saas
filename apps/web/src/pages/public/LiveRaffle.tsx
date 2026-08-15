import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Trophy, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export const LiveRaffle: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [raffle, setRaffle] = useState<any>(null);
    const [error, setError] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentName, setCurrentName] = useState('¿Quién será el ganador?');
    const [currentPrize, setCurrentPrize] = useState<any>(null);
    const [winner, setWinner] = useState<any>(null);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const intervalRef = useRef<number | null>(null);
    const pollIntervalRef = useRef<number | null>(null);
    const isOwner = !!localStorage.getItem('pos_token'); // Simple check if logged in as admin

    // Audio effects using Web Audio API (No CORS issues)
    const playDrumRoll = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(60, ctx.currentTime);
            for (let i = 0; i < 40; i++) {
                gain.gain.setValueAtTime(0.5, ctx.currentTime + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.05);
            }
            osc.start();
            osc.stop(ctx.currentTime + 4);
        } catch (e) {}
    };

    const playFanfare = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const playNote = (freq: number, startTime: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            const t = ctx.currentTime;
            playNote(440, t, 0.2); // A4
            playNote(554.37, t + 0.2, 0.2); // C#5
            playNote(659.25, t + 0.4, 0.2); // E5
            playNote(880, t + 0.6, 0.8); // A5
        } catch (e) {}
    };

    useEffect(() => {
        fetchRaffle();
        
        // Polling para mantener sincronizados a los participantes
        pollIntervalRef.current = window.setInterval(() => {
            if (!isDrawing) {
                fetchRaffle(true); // silent fetch
            }
        }, 2500);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [id, isDrawing]);

    const fetchRaffle = async (silent = false) => {
        try {
            const res = await fetch(`${apiUrl}/raffles/public/${id}`);
            if (res.ok) {
                const data = await res.json();
                
                // Si estamos en modo espectador (silent poll) y detectamos un ganador nuevo
                if (silent && !isOwner && !isDrawing) {
                    const currentAvailable = data.prizes?.filter((p:any) => !p.winner_participant_id).sort((a:any, b:any) => b.position - a.position);
                    
                    // Comprobar si el premio actual acaba de ganar (backend tiene winner, frontend no)
                    if (currentPrize && !winner) {
                        const updatedPrize = data.prizes?.find((p:any) => p.id === currentPrize.id);
                        if (updatedPrize && updatedPrize.winner_participant_id) {
                            const winnerParticipant = data.participants?.find((p:any) => p.id === updatedPrize.winner_participant_id);
                            if (winnerParticipant) {
                                triggerSpectatorAnimation(winnerParticipant);
                            }
                        }
                    } else if (!currentPrize && currentAvailable?.length > 0) {
                        setCurrentPrize(currentAvailable[0]);
                    }
                }

                setRaffle(data);
                
                // Actualizar premio actual si no estamos girando ni mostrando un ganador
                if (!isDrawing && !winner) {
                    const availablePrizes = data.prizes?.filter((p:any) => !p.winner_participant_id).sort((a:any, b:any) => b.position - a.position);
                    if (availablePrizes && availablePrizes.length > 0) {
                        setCurrentPrize(availablePrizes[0]);
                    }
                }
            } else if (!silent) {
                setError('Sorteo no encontrado o no activo.');
            }
        } catch (error) {
            if (!silent) setError('Error de conexión.');
        }
    };

    const triggerSpectatorAnimation = (winnerData: any) => {
        setIsDrawing(true);
        setWinner(null);
        playDrumRoll();
        
        const names = raffle?.participants?.map((p:any) => p.name) || ['...'];
        let i = 0;
        intervalRef.current = window.setInterval(() => {
            setCurrentName(names[i % names.length]);
            i++;
        }, 80);

        setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsDrawing(false);
            setWinner(winnerData);
            setCurrentName(winnerData.name);
            playFanfare();
            toast.success('¡Tenemos un ganador!');
        }, 4000);
    };

    const startDraw = async () => {
        if (!raffle || !currentPrize || raffle.participants?.length === 0) return;
        
        setIsDrawing(true);
        setWinner(null);
        
        // Play synthetic drumroll
        playDrumRoll();

        // Biombo animation
        const names = raffle.participants.map((p:any) => p.name);
        let i = 0;
        intervalRef.current = window.setInterval(() => {
            setCurrentName(names[i % names.length]);
            i++;
        }, 80); // Cambia nombre cada 80ms

        try {
            // Mientras gira, pedimos al backend el ganador real para asegurarnos que es 100% seguro y se guarda.
            const token = localStorage.getItem('pos_token'); // Clave correcta del AuthProvider
            // NOTA: Para que el administrador pueda sortear, debe estar logueado en la misma ventana o tener el token.
            // Si el sorteo en vivo se muestra publicamente, la API de /draw requiere auth. 
            // Si no hay token, fallará. El organizador debe abrir esta pantalla desde su sesión.
            const res = await fetch(`${apiUrl}/raffles/${id}/prizes/${currentPrize.id}/draw`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                
                // Simular suspenso por 4 segundos
                setTimeout(() => {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setIsDrawing(false);
                    setWinner(data.winner);
                    setCurrentName(data.winner.name);
                    
                    playFanfare();
                    
                    toast.success('¡Tenemos un ganador!');
                    fetchRaffle(); // Refrescar para que el premio ya salga como entregado
                }, 4000);

            } else {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setIsDrawing(false);
                toast.error('Error al sortear. ¿Estás logueado como administrador?');
                setCurrentName('Error en el sorteo');
            }
        } catch (error) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsDrawing(false);
            toast.error('Error de red');
        }
    };

    if (error) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl font-bold">{error}</div>;
    if (!raffle) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl animate-pulse">Preparando Sorteo...</div>;

    const availablePrizes = raffle.prizes?.filter((p:any) => !p.winner_participant_id);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col text-white font-sans overflow-hidden relative">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-900/40 via-slate-900 to-black z-0"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/30 rounded-full blur-[120px] z-0"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-600/20 rounded-full blur-[120px] z-0"></div>

            {/* Header */}
            <header className="relative z-10 p-8 flex justify-between items-center border-b border-white/10 bg-black/20 backdrop-blur-md">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-amber-400 tracking-tight flex items-center gap-4">
                        <Gift className="text-violet-400" size={40} />
                        {raffle.name}
                    </h1>
                </div>
                <div className="flex gap-6 text-xl font-bold text-white/70">
                    <div>Participantes: <span className="text-white">{raffle.participants?.length || 0}</span></div>
                    <div>Premios Restantes: <span className="text-amber-400">{availablePrizes?.length || 0}</span></div>
                </div>
            </header>

            {/* Main Stage */}
            <main className="relative z-10 flex-grow flex flex-col items-center justify-center p-8">
                
                {/* Prize selection / display */}
                {currentPrize && !isDrawing && !winner && (
                    <div className="mb-12 flex flex-col items-center animate-bounce-slow">
                        <Trophy size={64} className="text-amber-400 mb-4" />
                        <h2 className="text-2xl text-white/70 uppercase tracking-widest font-bold">Premio a Sortear:</h2>
                        <h3 className="text-5xl font-black text-amber-400 mt-2 text-center">{currentPrize.name}</h3>
                        {currentPrize.description && <p className="text-xl text-white/50 mt-2">{currentPrize.description}</p>}
                    </div>
                )}

                {/* Biombo Display */}
                <div className="w-full max-w-5xl">
                    <div className={`relative bg-black/50 backdrop-blur-xl border-4 ${winner ? 'border-emerald-500 shadow-[0_0_100px_rgba(16,185,129,0.4)]' : isDrawing ? 'border-violet-500 shadow-[0_0_80px_rgba(139,92,246,0.6)]' : 'border-white/10'} rounded-[3rem] p-16 text-center transition-all duration-500 overflow-hidden`}>
                        
                        {winner && (
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Confetti logic usually requires a library like react-confetti, but we simulate visually here */}
                                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                            </div>
                        )}

                        <div className="relative z-10">
                            {winner && (
                                <div className="text-3xl font-bold text-emerald-400 uppercase tracking-[0.3em] mb-6 animate-fade-in">
                                    ¡Ganador del {currentPrize?.name}!
                                </div>
                            )}

                            <div className={`font-black tracking-tight leading-none ${isDrawing ? 'text-7xl md:text-8xl text-white opacity-80 blur-[1px]' : winner ? 'text-7xl md:text-9xl text-white' : 'text-5xl text-white/30'} transition-all`}>
                                {currentName}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls (Only visible if there's a prize to draw) */}
                <div className="mt-16 relative z-10">
                    {availablePrizes?.length > 0 && !isDrawing && !winner && (
                        isOwner ? (
                            <button 
                                onClick={startDraw}
                                className="group relative px-12 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full font-black text-3xl text-white shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_80px_rgba(139,92,246,0.8)] hover:scale-105 transition-all"
                            >
                                <span className="relative z-10 flex items-center gap-4">
                                    <Play size={32} fill="currentColor" /> INICIAR SORTEO
                                </span>
                                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                            </button>
                        ) : (
                            <div className="text-2xl font-bold text-white/50 bg-black/30 px-8 py-4 rounded-full backdrop-blur-sm border border-white/10 animate-pulse">
                                Esperando que inicie el sorteo...
                            </div>
                        )
                    )}

                    {winner && (
                        <div className="flex flex-col items-center gap-4">
                            <button 
                                onClick={() => {
                                    setWinner(null);
                                    setCurrentName('¿Quién será el siguiente?');
                                    // Move to next available prize
                                    const remaining = availablePrizes.filter((p:any) => p.id !== currentPrize?.id);
                                    if (remaining.length > 0) setCurrentPrize(remaining[0]);
                                    else setCurrentPrize(null);
                                }}
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full font-bold text-xl text-white backdrop-blur-sm transition-all"
                            >
                                Continuar Sorteo →
                            </button>
                            
                            {isOwner && winner.phone && (
                                <a 
                                    href={`https://wa.me/${winner.phone.replace(/\D/g,'')}?text=¡Felicidades ${winner.name}! Has ganado el premio: ${currentPrize?.name} en nuestro sorteo.`}
                                    target="_blank" rel="noreferrer"
                                    className="px-6 py-3 bg-[#25D366] hover:bg-[#128C7E] rounded-full font-bold text-white shadow-lg transition-all flex items-center gap-2"
                                >
                                    Notificar por WhatsApp
                                </a>
                            )}
                        </div>
                    )}

                    {availablePrizes?.length === 0 && !winner && (
                        <div className="text-3xl font-black text-white/50 bg-black/30 px-12 py-6 rounded-full backdrop-blur-sm border border-white/10">
                            Sorteo Finalizado 🎉
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
