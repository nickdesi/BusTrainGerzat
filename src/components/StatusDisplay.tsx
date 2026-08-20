import { memo } from 'react';

export interface DataConfidenceSignal {
    isValid: boolean;
    warningLevel: 'none' | 'info' | 'warning' | 'critical';
    lastFetchAge?: number | null;
}

interface StatusDisplayProps {
    delay: number;
    isRealtime: boolean;
    isCancelled?: boolean;
    sourceSignal?: DataConfidenceSignal;
}

/**
 * StatusDisplay with WCAG 2.1 AA compliant colors
 * All colors meet 4.5:1 contrast ratio on dark background
 */
const StatusDisplay = memo(function StatusDisplay({ delay, isRealtime, isCancelled, sourceSignal }: StatusDisplayProps) {

    const confidenceLevel: 'faible' | 'moyenne' | 'elevee' = (() => {
        if (isCancelled) return 'faible';

        if (sourceSignal) {
            if (!sourceSignal.isValid || sourceSignal.warningLevel === 'critical') return 'faible';
            if (typeof sourceSignal.lastFetchAge === 'number') {
                if (sourceSignal.lastFetchAge > 600) return 'faible';
                if (sourceSignal.lastFetchAge > 300) return 'moyenne';
            }
            if (sourceSignal.warningLevel === 'warning' || sourceSignal.warningLevel === 'info') {
                return isRealtime ? 'moyenne' : 'faible';
            }
        }

        if (!isRealtime) return 'moyenne';
        return 'elevee';
    })();

    const confidenceBadge = (
        <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                confidenceLevel === 'elevee'
                    ? 'border border-emerald-500/30 bg-emerald-900/20 text-emerald-300'
                    : confidenceLevel === 'moyenne'
                        ? 'border border-amber-500/30 bg-amber-900/20 text-amber-300'
                        : 'border border-red-500/30 bg-red-900/20 text-red-300'
            }`}
            title={
                confidenceLevel === 'elevee'
                    ? 'Donnees temps reel fraiches'
                    : confidenceLevel === 'moyenne'
                        ? 'Donnees partielles ou fraicheur moyenne'
                        : 'Donnees potentiellement obsoletes ou non confirmees'
            }
        >
            <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                    confidenceLevel === 'elevee'
                        ? 'bg-emerald-400'
                        : confidenceLevel === 'moyenne'
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                }`}
            />
            {confidenceLevel === 'elevee' ? 'Confiance elevee' : confidenceLevel === 'moyenne' ? 'Confiance moyenne' : 'Confiance faible'}
        </span>
    );

    if (isCancelled) {
        return (
            <div className="flex flex-col items-center gap-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-red-400 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    ANNULÉ
                </span>
                {confidenceBadge}
            </div>
        );
    }

    if (!isRealtime) {
        return (
            <div className="flex flex-col items-center gap-1" title="Horaire planifié - non confirmé par le temps réel T2C">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600/30 bg-gray-800/40 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-gray-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                    PLANIFIÉ
                </span>
                {confidenceBadge}
            </div>
        );
    }

    const minutes = Math.floor(Math.abs(delay) / 60);

    // Less than 1 minute delay = on time
    if (minutes === 0) {
        return (
            <div className="flex flex-col items-center gap-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    À L&apos;HEURE
                </span>
                {confidenceBadge}
            </div>
        );
    }

    if (delay > 0) {
        return (
            <div className="flex flex-col items-center gap-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.15)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                    +{minutes} MIN
                </span>
                {confidenceBadge}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                -{minutes} MIN
            </span>
            {confidenceBadge}
        </div>
    );
});

export default StatusDisplay;
