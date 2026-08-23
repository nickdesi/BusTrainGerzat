import { memo } from 'react';

interface StatusDisplayProps {
    delay: number;
    isRealtime: boolean;
    isCancelled?: boolean;
}

/**
 * StatusDisplay with WCAG 2.1 AA compliant colors
 * All colors meet 4.5:1 contrast ratio on dark background
 */
const StatusDisplay = memo(function StatusDisplay({ delay, isRealtime, isCancelled }: StatusDisplayProps) {
    if (isCancelled) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-red-400 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                ANNULÉ
            </span>
        );
    }

    if (!isRealtime) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600/30 bg-gray-800/40 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-gray-300" title="Horaire théorique - non suivi en direct">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                PLANIFIÉ
            </span>
        );
    }

    const minutes = Math.floor(Math.abs(delay) / 60);

    // Less than 1 minute delay = on time
    if (minutes === 0) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                À L&apos;HEURE
            </span>
        );
    }

    if (delay > 0) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.15)]">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                +{minutes} MIN
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            -{minutes} MIN
        </span>
    );
});

export default StatusDisplay;
