'use client';

import { memo, useState, useEffect } from 'react';
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
    // Real-time clock for bus position - updates every second
    const [nowUnix, setNowUnix] = useState(() => currentTime ?? Math.floor(Date.now() / 1000));

    useEffect(() => {
        const interval = setInterval(() => {
            setNowUnix(Math.floor(Date.now() / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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

                    // Show bus indicator on the segment LEADING TO the current stop
                    // i.e., on the line below the PREVIOUS stop (which is now 'passed')
                    const isNextStopCurrent = !isLast && stops[index + 1]?.status === 'current';

                    // Calculate bus progress TOWARDS the next stop (current)
                    let busProgress = 0;
                    if (isNextStopCurrent && isPassed) {
                        const nextStop = stops[index + 1];
                        // Progress from this stop's departure to next stop's arrival
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
                            className={`relative flex items-start gap-4 pr-3 ${isPassed ? 'opacity-50' : ''}`}
                        >
                            {/* Vertical Line + Circle */}
                            <div className="flex flex-col items-center w-6 flex-shrink-0">
                                {/* Circle */}
                                <div
                                    className={`relative z-10 flex items-center justify-center rounded-full border-[3px] box-content ${isTerminus ? 'w-4 h-4' : 'w-2.5 h-2.5'
                                        } ${isCurrent
                                            ? 'bg-green-500 border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                                            : isPassed
                                                ? 'bg-gray-700 border-gray-600'
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
                                    <div className="relative h-full min-h-16">
                                        <div
                                            className={`w-1 absolute inset-y-0 left-1/2 -translate-x-1/2 ${isPassed ? 'bg-gray-700' : ''}`}
                                            style={{ backgroundColor: isPassed ? undefined : routeColor }}
                                        />
                                        {/* Bus position indicator - show BEFORE current stop */}
                                        {isNextStopCurrent && (
                                            <div
                                                className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-1000"
                                                style={{ top: `${busProgress * 80}%` }}
                                            >
                                                <div className="relative flex items-center justify-center w-8 h-8">
                                                    <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-60 animate-pulse" />
                                                    <div className="relative flex items-center justify-center w-7 h-7 bg-green-600 rounded-full shadow-lg shadow-green-900/50 border-2 border-green-400">
                                                        <Bus className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stop Info */}
                            <div className={`flex-1 min-w-0 pb-6 ${isLast ? 'pb-0' : ''}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                                    {/* Stop Name */}
                                    <div className="flex items-start gap-2 max-w-full">
                                        <span className={`font-medium text-base leading-tight break-words ${isCurrent ? 'text-green-400' :
                                            isPassed ? 'text-gray-500' : 'text-gray-100'
                                            } ${isTerminus ? 'font-bold' : ''}`}>
                                            {stop.stopName}
                                        </span>
                                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                            {stop.isAccessible && (
                                                <Accessibility className="w-3.5 h-3.5 text-blue-400" />
                                            )}
                                            {isCurrent && (
                                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/20 text-green-400 rounded uppercase tracking-wider border border-green-500/30">
                                                    En cours
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Times */}
                                    <div className="flex items-center gap-2 text-sm">
                                        {(() => {
                                            // Calculate both displayed times
                                            const scheduledTime = formatTime(stop.scheduledArrival);
                                            const predictedTime = formatTime(stop.predictedArrival);
                                            // Calculate delay from actual time difference for consistency
                                            const calculatedDelay = stop.predictedArrival - stop.scheduledArrival;
                                            const delayText = formatDelay(calculatedDelay);

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
                                                    {calculatedDelay > 0 && !isPassed && delayText && showStrikethrough && (
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
