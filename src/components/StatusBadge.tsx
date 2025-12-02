import React from 'react';

interface StatusBadgeProps {
    delay: number;
    isRealtime: boolean;
}

export function StatusBadge({ delay, isRealtime }: StatusBadgeProps) {
    if (!isRealtime) {
        return (
            <span className="text-gray-500 text-[10px] font-medium bg-white/5 px-2 py-1 rounded-full border border-white/5 whitespace-nowrap">
                Théorique
            </span>
        );
    }
    if (delay === 0) {
        return (
            <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                À l'heure
            </span>
        );
    }
    if (delay > 0) {
        return (
            <span className="text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20 whitespace-nowrap">
                +{Math.floor(delay / 60)} min
            </span>
        );
    }
    return (
        <span className="text-blue-400 text-[10px] font-bold bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20 whitespace-nowrap">
            Avance
        </span>
    );
}
