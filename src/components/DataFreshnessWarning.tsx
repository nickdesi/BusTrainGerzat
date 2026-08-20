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

    const config = warningLevel === 'critical'
        ? {
            wrapper: 'border-red-500/30 bg-red-950/40 shadow-red-950/20 text-red-300',
            iconBox: 'bg-red-500/15 text-red-400 ring-red-500/30',
            label: 'Données Expirées'
        }
        : warningLevel === 'info'
            ? {
                wrapper: 'border-sky-500/30 bg-sky-950/40 shadow-sky-950/20 text-sky-300',
                iconBox: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
                label: 'Information GTFS'
            }
            : {
                wrapper: 'border-amber-500/30 bg-amber-950/40 shadow-amber-950/20 text-amber-300',
                iconBox: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
                label: 'Mise à Jour Nécessaire'
            };

    return (
        <div className={`relative overflow-hidden rounded-2xl border ${config.wrapper} p-3.5 mb-4 shadow-lg backdrop-blur-xl transition-all duration-300`}>
            <div className="relative flex items-center gap-3">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${config.iconBox} ring-1`}>
                    <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {config.label}
                    </span>
                    <span className="text-xs text-gray-300">
                        {message}
                    </span>
                </div>
            </div>
        </div>
    );
}
