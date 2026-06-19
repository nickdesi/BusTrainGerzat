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
        <div className="bg-amber-900/80 border border-amber-700 rounded-lg p-3 mb-4 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="text-sm text-gray-200">
                Temps réel indisponible — horaires théoriques affichés.
            </span>
        </div>
    );
}
