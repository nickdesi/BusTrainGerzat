'use client';

import { memo, useState, useEffect } from 'react';
import { Loader2, Wifi, Clock, Accessibility, Bus, MapPin, Navigation } from 'lucide-react';
import { StopTimeDetail } from '@/hooks/useTripDetails';
import { formatTime } from '@/utils/format';

interface TripTimelineProps {
    stops: StopTimeDetail[];
    isLoading?: boolean;
    isRealtime?: boolean;
    routeColor?: string;
    currentTime?: number; // Unix timestamp for current time
}

function formatDelay(delaySeconds: number): string {
    const minutes = Math.round(delaySeconds / 60);
    if (minutes === 0) return '';
    return minutes > 0 ? `+${minutes}min` : `${minutes}min`;
}

const TripTimeline = memo(function TripTimeline({
    stops,
    isLoading = false,
    isRealtime = false,
    routeColor = '#fdc300',
    currentTime
}: TripTimelineProps) {
    const [liveNowUnix, setLiveNowUnix] = useState(() => Math.floor(Date.now() / 1000));
    const nowUnix = currentTime ?? liveNowUnix;

    const currentStopIndex = stops.findIndex((stop) => stop.status === 'current');
    const activeSegmentIndex = currentStopIndex > 0 ? currentStopIndex - 1 : -1;
    // ⚡ Bolt: Use direct array indexing O(1) instead of find O(N) using the already calculated index
    // eslint-disable-next-line security/detect-object-injection
    const nextStop = currentStopIndex !== -1 ? stops[currentStopIndex] : null;
    // eslint-disable-next-line security/detect-object-injection
    const previousStop = activeSegmentIndex >= 0 ? stops[activeSegmentIndex] : null;
    const shouldTrackProgress = currentTime === undefined && Boolean(previousStop && nextStop);

    useEffect(() => {
        if (!shouldTrackProgress) return;

        const interval = setInterval(() => {
            setLiveNowUnix(Math.floor(Date.now() / 1000));
        }, 10_000);
        return () => clearInterval(interval);
    }, [shouldTrackProgress]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-xl animate-pulse" />
                    <Loader2 className="relative w-9 h-9 animate-spin text-yellow-400" />
                </div>
            </div>
        );
    }

    if (stops.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center text-gray-400">
                Aucun arrêt disponible
            </div>
        );
    }

    let activeProgress = 0;
    if (previousStop && nextStop) {
        const totalDuration = nextStop.predictedArrival - previousStop.predictedDeparture;
        if (totalDuration > 0) {
            activeProgress = Math.min(Math.max((nowUnix - previousStop.predictedDeparture) / totalDuration, 0), 1);
        }
    }

    return (
        <div className="space-y-3 sm:space-y-5">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 shadow-2xl shadow-black/30 sm:rounded-3xl">
                <div className="border-b border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-300/25">
                                <Navigation className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="font-semibold text-gray-100">Progression du trajet</p>
                                <p>{stops.length} arrêts sur la ligne</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                            {isRealtime ? (
                                <>
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse" />
                                    <Wifi className="h-3.5 w-3.5 text-emerald-300" />
                                    <span className="font-medium text-emerald-200">Temps réel</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Horaire théorique</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {previousStop && nextStop && (
                    <div className="m-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.07] p-3 shadow-lg shadow-emerald-950/20 sm:m-4 sm:p-4">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-gray-950 shadow-lg shadow-emerald-500/25">
                                <span className="absolute inset-0 rounded-2xl bg-emerald-300/40 blur-md" />
                                <Bus className="relative h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Bus en approche</p>
                                <p className="truncate text-base font-bold text-white">{nextStop.stopName}</p>
                            </div>
                            <span className="ml-auto shrink-0 rounded-full bg-black/25 px-3 py-1 font-mono text-sm font-semibold text-emerald-100 ring-1 ring-white/10">
                                {formatTime(nextStop.predictedArrival)}
                            </span>
                        </div>
                        <div className="relative h-2 overflow-hidden rounded-full bg-black/30">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-yellow-300 to-yellow-400 transition-all duration-1000 ease-out"
                                style={{ width: `${activeProgress * 100}%` }}
                            />
                        </div>
                        <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                            <span className="truncate pr-2">{previousStop.stopName}</span>
                            <span>{Math.round(activeProgress * 100)}%</span>
                        </div>
                    </div>
                )}

                <div className="px-2.5 pb-3 sm:px-4 sm:pb-4">
                    <div className="relative rounded-2xl bg-black/15 px-2 py-2 sm:px-3">
                        {stops.map((stop, index) => {
                            const isFirst = index === 0;
                            const isLast = index === stops.length - 1;
                            const isTerminus = isFirst || isLast;
                            const isPassed = stop.status === 'passed';
                            const isCurrent = stop.status === 'current';
                            const isNextStopCurrent = index === activeSegmentIndex;
                            const scheduledTime = formatTime(stop.scheduledArrival);
                            const predictedTime = formatTime(stop.predictedArrival);
                            const calculatedDelay = stop.predictedArrival - stop.scheduledArrival;
                            const delayText = formatDelay(calculatedDelay);
                            const showStrikethrough = isRealtime && stop.delay !== 0 && !isPassed && scheduledTime !== predictedTime;

                            return (
                                <div key={stop.stopId} className={`relative grid grid-cols-[2.25rem_1fr] gap-2 sm:grid-cols-[2.75rem_1fr] sm:gap-3 ${isPassed ? 'opacity-55' : ''}`}>
                                    <div className="relative flex justify-center">
                                        {!isLast && (
                                            <div className="absolute top-8 bottom-0 w-1 overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className="w-full rounded-full transition-all duration-700"
                                                    style={{
                                                        height: isPassed ? '100%' : isNextStopCurrent ? `${activeProgress * 100}%` : '0%',
                                                        background: isPassed || isNextStopCurrent
                                                            ? `linear-gradient(180deg, ${routeColor}, rgba(52,211,153,0.95))`
                                                            : undefined
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <div
                                            className={`relative z-10 mt-1 flex items-center justify-center rounded-full ring-4 ring-gray-950 transition-all ${isTerminus ? 'h-8 w-8' : 'h-6 w-6'} ${isCurrent
                                                ? 'scale-110 bg-emerald-400 text-gray-950 shadow-[0_0_24px_rgba(52,211,153,0.6)]'
                                                : isPassed
                                                    ? 'bg-gray-700 text-gray-500'
                                                    : 'bg-gray-950 text-gray-300'
                                                }`}
                                            style={{ border: `2px solid ${isCurrent ? '#6ee7b7' : isPassed ? '#4b5563' : routeColor}` }}
                                        >
                                            {isCurrent ? (
                                                <Bus className="h-3.5 w-3.5" />
                                            ) : isTerminus ? (
                                                <MapPin className="h-3.5 w-3.5" />
                                            ) : (
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isPassed ? '#6b7280' : routeColor }} />
                                            )}
                                        </div>
                                    </div>

                                    <div className={`pb-3 sm:pb-4 ${isLast ? 'pb-1' : ''}`}>
                                        <div className={`rounded-2xl border px-3 py-3 transition-all sm:px-3.5 ${isCurrent
                                            ? 'border-emerald-300/30 bg-emerald-400/[0.08] shadow-lg shadow-emerald-950/20'
                                            : 'border-white/8 bg-white/[0.035] hover:bg-white/[0.055]'
                                            }`}>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className={`break-words text-sm font-semibold leading-snug ${isCurrent ? 'text-emerald-100' : isPassed ? 'text-gray-500' : 'text-gray-100'} ${isTerminus ? 'text-base' : ''}`}>
                                                            {stop.stopName}
                                                        </h3>
                                                        {stop.isAccessible && <Accessibility className="h-3.5 w-3.5 shrink-0 text-sky-300" />}
                                                        {isCurrent && (
                                                            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                                                                {isFirst ? 'Départ' : isLast ? 'Arrivée' : 'Prochain arrêt'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 flex-row items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start sm:gap-1">
                                                    <div className="flex items-center gap-1.5 rounded-xl bg-black/25 px-2.5 py-1 ring-1 ring-white/10">
                                                        {showStrikethrough && <span className="font-mono text-[11px] text-gray-500 line-through">{scheduledTime}</span>}
                                                        {isRealtime && !isPassed && <Wifi className="h-3 w-3 text-emerald-300" />}
                                                        <span className={`font-mono text-sm font-bold ${isPassed ? 'text-gray-500' : 'text-yellow-300'}`}>{predictedTime}</span>
                                                    </div>
                                                    {calculatedDelay > 0 && !isPassed && delayText && showStrikethrough && (
                                                        <span className="rounded-full bg-orange-400/10 px-2 py-0.5 text-[11px] font-semibold text-orange-300 ring-1 ring-orange-300/20">
                                                            {delayText}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default TripTimeline;
