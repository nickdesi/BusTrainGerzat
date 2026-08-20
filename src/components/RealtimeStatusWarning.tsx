'use client';

import { WifiOff } from 'lucide-react';
import { useBusData } from '@/hooks/useBusData';

/**
 * Warning banner shown when the GTFS-RT feed is unavailable.
 *
 * Reads the `rtAvailable` flag propagated from the server (`getBusData`) through
 * `/api/realtime` and `/api/stream`. When false, displayed bus times fall back to
 * the theoretical static schedule, so we inform the user that live tracking is off.
 */
export function RealtimeStatusWarning() {
    const { data } = useBusData();

    // Only warn once we have a response that explicitly reports RT as unavailable.
    if (!data || data.rtAvailable !== false) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-950/40 p-3.5 mb-4 shadow-lg shadow-amber-950/20 backdrop-blur-xl transition-all duration-300">
            <div className="pointer-events-none absolute -left-6 -top-6 h-16 w-16 rounded-full bg-amber-500/10 blur-xl" />
            <div className="relative flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
                    <WifiOff className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Mode Dégradé
                    </span>
                    <span className="text-xs text-gray-300">
                        Temps réel indisponible — horaires théoriques affichés.
                    </span>
                </div>
            </div>
        </div>
    );
}
