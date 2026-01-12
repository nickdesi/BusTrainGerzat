'use client';

import { AlertTriangle } from 'lucide-react';
import { useFreshness } from '@/hooks/useFreshness';

/**
 * Warning banner that displays when GTFS data is stale or expired.
 * Shows at the top of the departures page.
 */
export function DataFreshnessWarning() {
    const { data: freshness, isLoading } = useFreshness();

    if (isLoading || !freshness) return null;

    const { warningLevel, message } = freshness.bus;

    if (warningLevel === 'none') return null;

    const bgColor = warningLevel === 'critical'
        ? 'bg-red-900/80 border-red-700'
        : 'bg-amber-900/80 border-amber-700';

    const iconColor = warningLevel === 'critical' ? 'text-red-400' : 'text-amber-400';

    return (
        <div className={`${bgColor} border rounded-lg p-3 mb-4 flex items-center gap-3`}>
            <AlertTriangle className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
            <span className="text-sm text-gray-200">{message}</span>
        </div>
    );
}
