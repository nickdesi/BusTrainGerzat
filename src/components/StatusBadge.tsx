import React from 'react';

interface StatusBadgeProps {
    delay: number;
    isRealtime: boolean;
}

export function StatusBadge({ delay, isRealtime }: StatusBadgeProps) {
    if (!isRealtime) {
        return (
            <span className="text-gray-400 text-[11px] font-semibold bg-white/10 px-2.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap">
                Théorique
            </span>
        );
    }
    if (delay === 0) {
        return (
            <span className="text-emerald-300 text-[11px] font-bold bg-emerald-500/20 px-2.5 py-1.5 rounded-full border border-emerald-500/30 whitespace-nowrap shadow-sm">
                À l'heure
            </span>
        );
    }
    if (delay > 0) {
        return (
            <span className="text-rose-300 text-[11px] font-bold bg-rose-500/20 px-2.5 py-1.5 rounded-full border border-rose-500/30 whitespace-nowrap shadow-sm">
                +{Math.floor(delay / 60)} min
            </span>
        );
    }
    return (
        <span className="text-blue-300 text-[11px] font-bold bg-blue-500/20 px-2.5 py-1.5 rounded-full border border-blue-500/30 whitespace-nowrap shadow-sm">
            Avance
        </span>
    );
}
