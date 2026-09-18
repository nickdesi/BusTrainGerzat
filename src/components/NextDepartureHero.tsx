'use client';

import { useMemo, useState, useEffect } from 'react';
import { Bus, Train, Sparkles, MapPin, Clock, ArrowRight } from 'lucide-react';
import { UnifiedEntry } from '@/types';

// ⚡ Bolt: Cache Intl.DateTimeFormat instance to avoid expensive recreation on every render
const TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit'
});

interface NextDepartureHeroProps {
    entry: UnifiedEntry | null;
    boardType: 'departures' | 'arrivals';
}

export default function NextDepartureHero({ entry, boardType }: NextDepartureHeroProps) {
    const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

    useEffect(() => {
        const interval = setInterval(() => {
            setNowSec(Math.floor(Date.now() / 1000));
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const countdown = useMemo(() => {
        if (!entry) return null;
        const targetTime = boardType === 'arrivals' ? entry.arrivalTime : entry.departureTime;
        const diffSec = targetTime - nowSec;
        const diffMin = Math.round(diffSec / 60);

        if (diffMin <= 0) {
            return { text: "À l'approche", isImminent: true };
        }
        if (diffMin === 1) {
            return { text: "Dans 1 min", isImminent: true };
        }
        if (diffMin < 60) {
            return { text: `Dans ${diffMin} min`, isImminent: diffMin <= 5 };
        }
        const hours = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        return { text: `Dans ${hours}h${mins.toString().padStart(2, '0')}`, isImminent: false };
    }, [entry, boardType, nowSec]);

    if (!entry || !countdown) return null;

    const isBus = entry.type === 'BUS';
    const accentColor = isBus ? 'text-yellow-400' : 'text-blue-400';
    const borderColor = isBus ? 'border-yellow-400/30' : 'border-blue-400/30';
    const bgGradient = isBus
        ? 'from-yellow-500/15 via-black/50 to-black/80'
        : 'from-blue-500/15 via-black/50 to-black/80';
    const shadowColor = isBus ? 'shadow-yellow-500/10' : 'shadow-blue-500/10';
    const glowRing = isBus ? 'ring-yellow-400/20' : 'ring-blue-400/20';

    const location = boardType === 'arrivals'
        ? (entry.provenance || 'Provenance inconnue')
        : entry.destination;

    const formattedTime = TIME_FORMATTER.format(
        new Date((boardType === 'arrivals' ? entry.arrivalTime : entry.departureTime) * 1000)
    );

    return (
        <div className={`relative mb-6 overflow-hidden rounded-2xl border ${borderColor} bg-gradient-to-br ${bgGradient} p-4 md:p-6 shadow-2xl ${shadowColor} backdrop-blur-xl ring-1 ${glowRing} transition-all duration-300`}>
            {/* Background aura */}
            <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full ${isBus ? 'bg-yellow-400/15' : 'bg-blue-400/15'} blur-3xl`} aria-hidden="true" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Mode, Route and Destination */}
                <div className="flex items-start gap-3.5">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${borderColor} ${isBus ? 'bg-yellow-400/15 text-yellow-300' : 'bg-blue-400/15 text-blue-300'} shadow-md`}>
                        {isBus ? <Bus className="h-6 w-6" /> : <Train className="h-6 w-6" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${isBus ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'}`}>
                                <Sparkles className="h-2.5 w-2.5" />
                                {boardType === 'arrivals' ? 'Prochaine arrivée' : 'Prochain départ'}
                            </span>
                            <span className="font-mono text-xs font-black text-white px-2 py-0.5 rounded-md bg-white/10">
                                {isBus ? `LIGNE ${entry.line}` : entry.line}
                            </span>
                            {entry.isRealtime && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    </span>
                                    LIVE
                                </span>
                            )}
                        </div>

                        <h2 className="mt-1.5 text-lg font-black text-white flex items-center gap-2 md:text-2xl">
                            <ArrowRight className={`h-5 w-5 ${accentColor} shrink-0`} aria-hidden="true" />
                            <span className="truncate max-w-[280px] sm:max-w-md md:max-w-lg">{location}</span>
                        </h2>

                        {entry.platform && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span>Quai {entry.platform}</span>
                                {entry.delay !== 0 && (
                                    <span className={`ml-1 font-bold ${entry.delay > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        ({entry.delay > 0 ? `+${Math.round(entry.delay / 60)} min` : 'Avance'})
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Big Countdown */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-white/10 pt-3 sm:border-0 sm:pt-0">
                    <div className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight tabular-nums ${countdown.isImminent ? accentColor : 'text-white'}`}>
                        {countdown.text}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <Clock className="h-3 w-3" />
                        <span>Passage prévu à {formattedTime}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
