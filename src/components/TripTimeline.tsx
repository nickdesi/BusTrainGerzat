'use client';

import { memo } from 'react';
import { Loader2, Wifi, Clock, Accessibility, Bus } from 'lucide-react';
import { StopTimeDetail } from '@/hooks/useTripDetails';

interface TripTimelineProps {
    stops: StopTimeDetail[];
    isLoading?: boolean;
    isRealtime?: boolean;
    routeColor?: string;
    currentTime?: number; // Unix timestamp for current time
}

function formatTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    });
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
    // Use provided timestamp or fallback (only at mount time)
    const nowUnix = currentTime ?? Math.floor(Date.now() / 1000);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (stops.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                Aucun arrêt disponible
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Horaire théorique</span>
                </div>
                {isRealtime && (
                    <div className="flex items-center gap-1.5 text-green-400">
                        <Wifi className="w-3.5 h-3.5" />
                        <span>Temps réel</span>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="relative">
                {stops.map((stop, index) => {
                    const isFirst = index === 0;
                    const isLast = index === stops.length - 1;
                    const isTerminus = isFirst || isLast;
                    const isPassed = stop.status === 'passed';
                    const isCurrent = stop.status === 'current';
                    // Only show bus "in transit" if current time >= departure time of this stop
                    const hasDeparted = isCurrent && nowUnix >= stop.predictedDeparture;

                    // Calculate bus progress between current stop and next stop
                    let busProgress = 0; // 0% = at current stop, 100% = at next stop
                    if (hasDeparted && !isLast) {
                        const nextStop = stops[index + 1];
                        const departureTime = stop.predictedDeparture;
                        const arrivalTime = nextStop.predictedArrival;
                        const totalDuration = arrivalTime - departureTime;
                        if (totalDuration > 0) {
                            const elapsed = nowUnix - departureTime;
                            busProgress = Math.min(Math.max(elapsed / totalDuration, 0), 1);
                        }
                    }

                    return (
                        <div
                            key={stop.stopId}
                            className={`relative flex items-start gap-4 ${isPassed ? 'opacity-50' : ''}`}
                        >
                            {/* Vertical Line + Circle */}
                            <div className="flex flex-col items-center w-5">
                                {/* Circle */}
                                <div
                                    className={`relative z-10 flex items-center justify-center rounded-full border-3 ${isTerminus ? 'w-5 h-5' : 'w-3 h-3'
                                        } ${isCurrent
                                            ? 'bg-green-500 border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                                            : isPassed
                                                ? 'bg-gray-600 border-gray-500'
                                                : 'border-2'
                                        }`}
                                    style={{
                                        borderColor: isCurrent ? undefined : (isPassed ? undefined : routeColor),
                                        backgroundColor: isCurrent ? undefined : (isPassed ? undefined : (isTerminus ? routeColor : 'transparent'))
                                    }}
                                >
                                    {isCurrent && (
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    )}
                                </div>

                                {/* Vertical Line (not after last item) */}
                                {!isLast && (
                                    <div className="relative">
                                        <div
                                            className={`w-0.5 h-12 ${isPassed ? 'bg-gray-600' : ''}`}
                                            style={{ backgroundColor: isPassed ? undefined : routeColor }}
                                        />
                                        {/* Bus position indicator - show between current stop and next */}
                                        {hasDeparted && (
                                            <div
                                                className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-1000"
                                                style={{ top: `${busProgress * 80}%` }}
                                            >
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-50 animate-ping" />
                                                    <div className="relative bg-green-500 rounded-full p-1 shadow-lg shadow-green-500/50">
                                                        <Bus className="w-3 h-3 text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stop Info */}
                            <div className={`flex-1 pb-4 ${isLast ? 'pb-0' : ''}`}>
                                <div className="flex items-center justify-between">
                                    {/* Stop Name */}
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium ${isCurrent ? 'text-green-400' :
                                            isPassed ? 'text-gray-500' : 'text-white'
                                            } ${isTerminus ? 'font-bold' : ''}`}>
                                            {stop.stopName}
                                        </span>
                                        {stop.isAccessible && (
                                            <Accessibility className="w-4 h-4 text-blue-400" />
                                        )}
                                        {isCurrent && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded uppercase">
                                                En cours
                                            </span>
                                        )}
                                    </div>

                                    {/* Times */}
                                    <div className="flex items-center gap-2 text-sm">
                                        {(() => {
                                            // Calculate both displayed times
                                            const scheduledTime = formatTime(stop.scheduledArrival);
                                            const predictedTime = formatTime(stop.predictedArrival);
                                            const delayText = formatDelay(stop.delay);

                                            // Only show strikethrough if times VISUALLY differ
                                            const showStrikethrough = isRealtime &&
                                                stop.delay !== 0 &&
                                                !isPassed &&
                                                scheduledTime !== predictedTime;

                                            return (
                                                <>
                                                    {showStrikethrough && (
                                                        <>
                                                            <span className="text-gray-500 line-through">
                                                                {scheduledTime}
                                                            </span>
                                                            <Wifi className="w-3 h-3 text-green-400" />
                                                        </>
                                                    )}
                                                    {/* Show Wifi icon without strikethrough if delay exists but times look same */}
                                                    {isRealtime && !showStrikethrough && !isPassed && (
                                                        <Wifi className="w-3 h-3 text-green-400" />
                                                    )}
                                                    <span className={`font-mono ${isPassed ? 'text-gray-500' : 'text-yellow-500'
                                                        }`}>
                                                        {predictedTime}
                                                    </span>
                                                    {/* Only show delay badge if it's significant and visible */}
                                                    {stop.delay > 0 && !isPassed && delayText && showStrikethrough && (
                                                        <span className="text-orange-400 font-medium text-xs">
                                                            {delayText}
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default TripTimeline;
