import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Trophy, Play, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

// Fanfarria suave con Web Audio API (triangle wave - mucho más agradable)
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
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        const t = ctx.currentTime;
        playNote(523.25, t,       0.25); // C5
        playNote(659.25, t + 0.2, 0.25); // E5
        playNote(783.99, t + 0.4, 0.25); // G5
        playNote(1046.5, t + 0.6, 0.8);  // C6 (final largo)
    } catch (e) {}
};

// Cuenta regresiva formateada
const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

export const LiveRaffle: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [raffle, setRaffle] = useState<any>(null);
    const [error, setError] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentName, setCurrentName] = useState('¿Quién será el ganador?');
    const [currentPrize, setCurrentPrize] = useState<any>(null);
    const [winner, setWinner] = useState<any>(null);

    // Countdown hasta que inicia el sorteo (en segundos, null = ya inició o no hay hora programada)
    const [startCountdown, setStartCountdown] = useState<number | null>(null);

    // Countdown de reclamación del ganador
    const [claimCountdown, setClaimCountdown] = useState<number | null>(null);
    const claimIntervalRef = useRef<number | null>(null);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    // Refs para evitar stale closures en callbacks del polling
    const intervalRef = useRef<number | null>(null);
    const pollIntervalRef = useRef<number | null>(null);
    const startCountdownIntervalRef = useRef<number | null>(null);
    const isDrawingRef = useRef(false);
    const winnerRef = useRef<any>(null);
    const currentPrizeRef = useRef<any>(null);
    const raffleRef = useRef<any>(null);

    const isOwner = !!localStorage.getItem('pos_token');

    // Sync refs ↔ state
    useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);
    useEffect(() => { winnerRef.current = winner; }, [winner]);
    useEffect(() => { currentPrizeRef.current = currentPrize; }, [currentPrize]);
    useEffect(() => { raffleRef.current = raffle; }, [raffle]);

    // ─── Countdown hasta que inicia ───────────────────────────────
    const startStartCountdown = useCallback((startsAt: string) => {
        if (startCountdownIntervalRef.current) clearInterval(startCountdownIntervalRef.current);

        const tick = () => {
            const diff = Math.floor((new Date(startsAt).getTime() - Date.now()) / 1000);
            if (diff <= 0) {
                setStartCountdown(null);
                if (startCountdownIntervalRef.current) clearInterval(startCountdownIntervalRef.current);
            } else {
                setStartCountdown(diff);
            }
        };
        tick();
        startCountdownIntervalRef.current = window.setInterval(tick, 1000);
    }, []);

    // ─── Countdown de reclamación del ganador ─────────────────────
    const startClaimCountdown = useCallback((winnerDrawnAt: string, claimMinutes: number) => {
        if (claimIntervalRef.current) clearInterval(claimIntervalRef.current);

        const deadlineMs = new Date(winnerDrawnAt).getTime() + claimMinutes * 60 * 1000;

        const tick = () => {
            const diff = Math.floor((deadlineMs - Date.now()) / 1000);
            if (diff <= 0) {
                setClaimCountdown(0);
                if (claimIntervalRef.current) clearInterval(claimIntervalRef.current);
            } else {
                setClaimCountdown(diff);
            }
        };
        tick();
        claimIntervalRef.current = window.setInterval(tick, 1000);
    }, []);

    const stopClaimCountdown = useCallback(() => {
        if (claimIntervalRef.current) clearInterval(claimIntervalRef.current);
        setClaimCountdown(null);
    }, []);

    // ─── Animación del biombo para espectadores ───────────────────
    const triggerSpectatorAnimation = useCallback((winnerData: any, prizeData: any, participants: any[], winnerDrawnAt?: string, claimMinutes?: number) => {
        if (isDrawingRef.current || winnerRef.current) return;

        setIsDrawing(true);
        isDrawingRef.current = true;

        const names = participants.map((p: any) => p.name);
        if (names.length === 0) names.push('...');

        let i = 0;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(() => {
            setCurrentName(names[i % names.length]);
            i++;
        }, 80);

        setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsDrawing(false);
            isDrawingRef.current = false;
            setWinner(winnerData);
            winnerRef.current = winnerData;
            setCurrentPrize(prizeData);
            setCurrentName(winnerData.name);
            playFanfare();
            toast.success('¡Tenemos un ganador!');

            // Arrancar countdown de reclamación si aplica
            if (winnerDrawnAt && claimMinutes) {
                startClaimCountdown(winnerDrawnAt, claimMinutes);
            }
        }, 4000);
    }, [startClaimCountdown]);

    // ─── Fetch del sorteo ─────────────────────────────────────────
    const fetchRaffle = useCallback(async (silent = false) => {
        try {
            const res = await fetch(`${apiUrl}/raffles/public/${id}`);
            if (!res.ok) {
                if (!silent) setError('Sorteo no encontrado o no activo.');
                return;
            }
            const data = await res.json();

            // Actualizar countdown de inicio si hay hora programada
            if (data.starts_at && new Date(data.starts_at) > new Date()) {
                startStartCountdown(data.starts_at);
            } else {
                setStartCountdown(null);
                if (startCountdownIntervalRef.current) clearInterval(startCountdownIntervalRef.current);
            }

            // Detectar ganador nuevo para espectadores
            if (silent && !isOwner) {
                const currentPrizeSnap = currentPrizeRef.current;
                const winnerSnap = winnerRef.current;
                const isDrawingSnap = isDrawingRef.current;

                if (currentPrizeSnap && !winnerSnap && !isDrawingSnap) {
                    const updatedPrize = data.prizes?.find((p: any) => p.id === currentPrizeSnap.id);
                    if (updatedPrize?.winner_participant_id) {
                        const winnerParticipant = data.participants?.find(
                            (p: any) => p.id === updatedPrize.winner_participant_id
                        );
                        if (winnerParticipant) {
                            triggerSpectatorAnimation(
                                winnerParticipant,
                                updatedPrize,
                                data.participants || [],
                                data.winner_drawn_at,
                                data.winner_claim_minutes
                            );
                            setRaffle(data);
                            raffleRef.current = data;
                            return;
                        }
                    }
                }

                // Detectar re-sorteo: el premio que tenía ganador ya no lo tiene
                if (currentPrizeSnap && winnerSnap && !isDrawingSnap) {
                    const updatedPrize = data.prizes?.find((p: any) => p.id === currentPrizeSnap.id);
                    if (updatedPrize && !updatedPrize.winner_participant_id) {
                        // El ganador fue anulado → re-sorteo iniciado
                        stopClaimCountdown();
                        setWinner(null);
                        winnerRef.current = null;
                        setCurrentName('Re-sorteando...');
                        // La animación la dispara cuando vuelva a detectar el nuevo ganador
                    }
                }
            }

            setRaffle(data);
            raffleRef.current = data;

            if (!isDrawingRef.current && !winnerRef.current) {
                const available = data.prizes
                    ?.filter((p: any) => !p.winner_participant_id)
                    .sort((a: any, b: any) => b.position - a.position);
                if (available?.length > 0) {
                    setCurrentPrize(available[0]);
                    currentPrizeRef.current = available[0];
                } else if (available?.length === 0) {
                    setCurrentPrize(null);
                    currentPrizeRef.current = null;
                }
            }
        } catch {
            if (!silent) setError('Error de conexión.');
        }
    }, [id, apiUrl, isOwner, triggerSpectatorAnimation, startStartCountdown, stopClaimCountdown]);

    // Montar polling
    useEffect(() => {
        fetchRaffle();
        pollIntervalRef.current = window.setInterval(() => fetchRaffle(true), 3000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (startCountdownIntervalRef.current) clearInterval(startCountdownIntervalRef.current);
            if (claimIntervalRef.current) clearInterval(claimIntervalRef.current);
        };
    }, [fetchRaffle]);

    // ─── Sortear ──────────────────────────────────────────────────
    const startDraw = async () => {
        const raffleSnap = raffleRef.current;
        const prizeSnap = currentPrizeRef.current;
        if (!raffleSnap || !prizeSnap) return;
        if (raffleSnap.participants?.length === 0) { toast.error('No hay participantes.'); return; }

        setIsDrawing(true);
        isDrawingRef.current = true;
        setWinner(null);
        winnerRef.current = null;
        stopClaimCountdown();

        const names = raffleSnap.participants.map((p: any) => p.name);
        let i = 0;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(() => {
            setCurrentName(names[i % names.length]);
            i++;
        }, 80);

        try {
            const token = localStorage.getItem('pos_token');
            const res = await fetch(`${apiUrl}/raffles/${id}/prizes/${prizeSnap.id}/draw`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setTimeout(() => {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setIsDrawing(false);
                    isDrawingRef.current = false;
                    setWinner(data.winner);
                    winnerRef.current = data.winner;
                    setCurrentName(data.winner.name);
                    playFanfare();
                    toast.success('¡Tenemos un ganador!');
                    fetchRaffle();

                    // Countdown de reclamación
                    if (raffleSnap.winner_claim_minutes) {
                        startClaimCountdown(new Date().toISOString(), raffleSnap.winner_claim_minutes);
                    }
                }, 4000);
            } else {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setIsDrawing(false);
                isDrawingRef.current = false;
                toast.error('Error al sortear. ¿Estás logueado como administrador?');
                setCurrentName('Error en el sorteo');
            }
        } catch {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsDrawing(false);
            isDrawingRef.current = false;
            toast.error('Error de red');
        }
    };

    // ─── Re-sortear ───────────────────────────────────────────────
    const redraw = async () => {
        const prizeSnap = currentPrizeRef.current;
        if (!prizeSnap) return;

        stopClaimCountdown();
        setWinner(null);
        winnerRef.current = null;
        setIsDrawing(true);
        isDrawingRef.current = true;

        const raffleSnap = raffleRef.current;
        const names = raffleSnap?.participants?.map((p: any) => p.name) || ['...'];
        let i = 0;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(() => {
            setCurrentName(names[i % names.length]);
            i++;
        }, 80);

        try {
            const token = localStorage.getItem('pos_token');
            const res = await fetch(`${apiUrl}/raffles/${id}/prizes/${prizeSnap.id}/redraw`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setTimeout(() => {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setIsDrawing(false);
                    isDrawingRef.current = false;
                    setWinner(data.winner);
                    winnerRef.current = data.winner;
                    setCurrentName(data.winner.name);
                    playFanfare();
                    toast.success('¡Nuevo ganador seleccionado!');
                    fetchRaffle();

                    if (raffleSnap?.winner_claim_minutes) {
                        startClaimCountdown(new Date().toISOString(), raffleSnap.winner_claim_minutes);
                    }
                }, 4000);
            } else {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setIsDrawing(false);
                isDrawingRef.current = false;
                toast.error('Error al re-sortear');
                setCurrentName('Error');
            }
        } catch {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsDrawing(false);
            isDrawingRef.current = false;
            toast.error('Error de red');
        }
    };

    if (error) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl font-bold">{error}</div>;
    if (!raffle) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl animate-pulse">Preparando Sorteo...</div>;

    const availablePrizes = raffle.prizes?.filter((p: any) => !p.winner_participant_id) || [];
    const claimExpired = claimCountdown !== null && claimCountdown <= 0;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col text-white font-sans overflow-hidden relative">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-slate-900 to-black z-0" />
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/30 rounded-full blur-[120px] z-0" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-600/20 rounded-full blur-[120px] z-0" />

            {/* Header */}
            <header className="relative z-10 p-6 md:p-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-amber-400 tracking-tight flex items-center gap-4">
                    <Gift className="text-violet-400 shrink-0" size={36} />
                    {raffle.name}
                </h1>
                <div className="flex gap-6 text-lg font-bold text-white/70">
                    <div>Participantes: <span className="text-white">{raffle.participants?.length || 0}</span></div>
                    <div>Premios: <span className="text-amber-400">{availablePrizes.length}</span></div>
                </div>
            </header>

            {/* ── Countdown hasta el inicio ── */}
            {startCountdown !== null && startCountdown > 0 && !isDrawing && !winner && (
                <div className="relative z-10 bg-indigo-900/60 backdrop-blur-md border-b border-indigo-500/30 px-8 py-5 text-center">
                    <p className="text-indigo-300 text-sm font-bold uppercase tracking-widest mb-1">El sorteo inicia en</p>
                    <p className="text-5xl font-black text-white tabular-nums">{formatCountdown(startCountdown)}</p>
                    <p className="text-indigo-400 text-xs mt-2">¡Prepárate! Todos los participantes serán notificados al iniciar.</p>
                </div>
            )}

            {/* Main Stage */}
            <main className="relative z-10 flex-grow flex flex-col items-center justify-center p-6 md:p-8">

                {/* Premio actual */}
                {currentPrize && !isDrawing && !winner && (
                    <div className="mb-10 flex flex-col items-center">
                        <Trophy size={60} className="text-amber-400 mb-4" />
                        <h2 className="text-xl text-white/70 uppercase tracking-widest font-bold">Premio a Sortear:</h2>
                        <h3 className="text-4xl md:text-5xl font-black text-amber-400 mt-2 text-center">{currentPrize.name}</h3>
                        {currentPrize.description && <p className="text-lg text-white/50 mt-2">{currentPrize.description}</p>}
                    </div>
                )}

                {/* Biombo */}
                <div className="w-full max-w-5xl">
                    <div className={`relative bg-black/50 backdrop-blur-xl border-4 rounded-[3rem] p-12 md:p-16 text-center transition-all duration-500 overflow-hidden
                        ${winner ? 'border-emerald-500 shadow-[0_0_100px_rgba(16,185,129,0.4)]'
                        : isDrawing ? 'border-violet-500 shadow-[0_0_80px_rgba(139,92,246,0.6)]'
                        : 'border-white/10'}`}>

                        {winner && <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none" />}

                        <div className="relative z-10">
                            {winner && (
                                <div className="text-2xl md:text-3xl font-bold text-emerald-400 uppercase tracking-[0.3em] mb-6">
                                    🎉 ¡Ganador de {currentPrize?.name}!
                                </div>
                            )}
                            <div className={`font-black tracking-tight leading-none transition-all
                                ${isDrawing ? 'text-6xl md:text-8xl text-white opacity-80 blur-[1px]'
                                : winner ? 'text-6xl md:text-9xl text-white'
                                : 'text-4xl md:text-5xl text-white/30'}`}>
                                {currentName}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Countdown de reclamación ── */}
                {winner && claimCountdown !== null && (
                    <div className={`mt-8 px-8 py-4 rounded-2xl text-center border transition-all
                        ${claimExpired
                            ? 'bg-red-900/60 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                            : claimCountdown < 30
                                ? 'bg-amber-900/60 border-amber-500/50'
                                : 'bg-slate-800/60 border-white/10'}`}>
                        {claimExpired ? (
                            <div>
                                <p className="text-red-400 text-lg font-black uppercase tracking-widest">⏰ ¡Tiempo agotado!</p>
                                <p className="text-red-300 text-sm mt-1">El ganador no se presentó. Se realizará un nuevo sorteo.</p>
                                {isOwner && (
                                    <button
                                        onClick={redraw}
                                        className="mt-3 flex items-center gap-2 mx-auto px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full font-black text-white transition-all hover:scale-105"
                                    >
                                        <RotateCcw size={20} /> Re-sortear ahora
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <p className="text-white/60 text-sm font-bold uppercase tracking-widest">El ganador tiene hasta</p>
                                <p className={`text-4xl font-black tabular-nums mt-1 ${claimCountdown < 30 ? 'text-amber-400' : 'text-white'}`}>
                                    {formatCountdown(claimCountdown)}
                                </p>
                                <p className="text-white/50 text-xs mt-1">para presentarse, o se sorteará de nuevo.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Controles */}
                <div className="mt-10 relative z-10">
                    {/* Botón sortear / esperar */}
                    {availablePrizes.length > 0 && !isDrawing && !winner && (
                        isOwner ? (
                            <button
                                onClick={startDraw}
                                disabled={startCountdown !== null && startCountdown > 0}
                                className="group relative px-10 md:px-12 py-5 md:py-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full font-black text-2xl md:text-3xl text-white shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_80px_rgba(139,92,246,0.8)] hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                <span className="relative z-10 flex items-center gap-4">
                                    <Play size={30} fill="currentColor" /> INICIAR SORTEO
                                </span>
                                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                            </button>
                        ) : (
                            <div className="text-xl md:text-2xl font-bold text-white/50 bg-black/30 px-8 py-4 rounded-full backdrop-blur-sm border border-white/10 animate-pulse">
                                Esperando que inicie el sorteo...
                            </div>
                        )
                    )}

                    {/* Ganador + botones de acción */}
                    {winner && !claimExpired && (
                        <div className="flex flex-col items-center gap-4">
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => {
                                            stopClaimCountdown();
                                            setWinner(null);
                                            winnerRef.current = null;
                                            setCurrentName('¿Quién será el siguiente?');
                                            const remaining = availablePrizes.filter((p: any) => p.id !== currentPrize?.id);
                                            if (remaining.length > 0) { setCurrentPrize(remaining[0]); currentPrizeRef.current = remaining[0]; }
                                            else { setCurrentPrize(null); currentPrizeRef.current = null; }
                                        }}
                                        className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full font-bold text-xl text-white backdrop-blur-sm transition-all"
                                    >
                                        Continuar Sorteo →
                                    </button>

                                    {winner.phone && (
                                        <a
                                            href={`https://wa.me/${winner.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Felicidades ${winner.name}! 🎉 Has ganado el premio: ${currentPrize?.name} en nuestro sorteo.`)}`}
                                            target="_blank" rel="noreferrer"
                                            className="px-6 py-3 bg-[#25D366] hover:bg-[#128C7E] rounded-full font-bold text-white shadow-lg transition-all flex items-center gap-2"
                                        >
                                            🟢 Notificar por WhatsApp
                                        </a>
                                    )}

                                    {raffle.winner_claim_minutes && (
                                        <button
                                            onClick={redraw}
                                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-full font-bold text-white/70 text-sm transition-all flex items-center gap-2"
                                        >
                                            <RotateCcw size={16} /> Re-sortear manualmente
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {availablePrizes.length === 0 && !winner && !isDrawing && (
                        <div className="text-2xl md:text-3xl font-black text-white/50 bg-black/30 px-12 py-6 rounded-full backdrop-blur-sm border border-white/10">
                            Sorteo Finalizado 🎉
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
