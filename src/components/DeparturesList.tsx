'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import { ArrowRight, RefreshCw, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { UnifiedEntry } from '@/types';
import SplitFlapDisplay from './SplitFlapDisplay';
import StatusDisplay, { DataConfidenceSignal } from './StatusDisplay';
import TripDetailModal from './TripDetailModal';
import { formatTime, getDisplayTime } from '@/utils/format';
import { useFreshness } from '@/hooks/useFreshness';

interface DeparturesListProps {
    departures: UnifiedEntry[];
    loading: boolean;
    boardType?: 'departures' | 'arrivals';
    favorites?: string[];
    onToggleFavorite?: (id: string, line: string, destination: string, type: 'BUS' | 'TER') => void;
}

interface DepartureRowProps {
    entry: UnifiedEntry;
    boardType: 'departures' | 'arrivals';
    isFav: boolean;
    sourceSignal?: DataConfidenceSignal;
    onToggleFavorite?: (id: string, line: string, destination: string, type: 'BUS' | 'TER') => void;
    onTripClick?: (tripId: string, line: string) => void;
}

const DepartureRow = memo(function DepartureRow({ entry, boardType, isFav, sourceSignal, onToggleFavorite, onTripClick }: DepartureRowProps) {
    const isClickable = entry.type === 'BUS' && entry.tripId;
    const accentBorder = boardType === 'arrivals' ? 'border-blue-500/20' : 'border-yellow-500/20';
    const favoriteTint = boardType === 'arrivals' ? 'bg-blue-900/15' : 'bg-yellow-900/15';
    const timeColor = boardType === 'arrivals' ? 'text-blue-400' : 'text-yellow-500';
    const activeTint = boardType === 'arrivals' ? 'active:bg-blue-900/30' : 'active:bg-yellow-900/30';
    const favoriteLabel = boardType === 'arrivals' ? entry.provenance ?? entry.destination : entry.destination;

    return (
        <div
            onClick={() => isClickable && onTripClick?.(entry.tripId!, entry.line)}
            className={`flip-enter rounded-3xl border p-4 shadow-lg shadow-black/20 transition-colors ${isClickable ? `cursor-pointer ${activeTint}` : ''} ${isFav ? `${favoriteTint} ${accentBorder}` : 'border-white/[0.06] bg-white/[0.03]'} ${entry.isCancelled ? 'opacity-60' : ''}`}
            title={entry.isCancelled ? 'Train supprimé' : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(event) => {
                if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onTripClick?.(entry.tripId!, entry.line);
                }
            }}
        >
            <div className="flex items-start justify-between mb-3">
                {entry.type === 'TER' ? (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase">Arrivée</span>
                            <SplitFlapDisplay text={formatTime(entry.arrivalTime)} size="sm" color={timeColor} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase">Départ</span>
                            <SplitFlapDisplay text={formatTime(entry.departureTime)} size="sm" color={timeColor} />
                        </div>
                    </div>
                ) : (
                    <SplitFlapDisplay text={formatTime(getDisplayTime(entry, boardType)!)} size="lg" color={timeColor} />
                )}
                <div className="flex items-center gap-3">
                    {onToggleFavorite && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(entry.id, entry.line, favoriteLabel, entry.type);
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${isFav ? 'text-yellow-400 bg-yellow-900/20' : 'text-gray-600 hover:bg-white/5'}`}
                            title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                            aria-label={isFav ? `Retirer ${entry.line} des favoris` : `Ajouter ${entry.line} aux favoris`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </button>
                    )}
                    {entry.type === 'BUS' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold border border-yellow-600/50" style={{ backgroundColor: '#fdc300', color: '#000' }}>
                            BUS {entry.line}
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-900/30 text-blue-400 border border-blue-700/50">
                            TER {entry.line}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-gray-500" />
                <div className="overflow-hidden">
                    <SplitFlapDisplay
                        text={boardType === 'arrivals' && entry.provenance ? entry.provenance : entry.destination}
                        size="xs"
                        color="text-gray-200"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                    {entry.platform}
                </span>
                <div className="flex items-center gap-2">
                    <StatusDisplay delay={entry.delay} isRealtime={entry.isRealtime} isCancelled={entry.isCancelled} sourceSignal={sourceSignal} />
                    {entry.isRealtime ? (
                        <Wifi className="w-4 h-4 text-green-500 animate-pulse" strokeWidth={3} />
                    ) : (
                        <WifiOff className="w-3 h-3 text-gray-700/50" />
                    )}
                    {isClickable && (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                </div>
            </div>
        </div>
    );
});

export default function DeparturesList({ departures, loading, boardType = 'departures', favorites = [], onToggleFavorite }: DeparturesListProps) {
    const { data: freshness } = useFreshness();
    const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
    const [selectedTrip, setSelectedTrip] = useState<{ tripId: string; line: string } | null>(null);
    const accentText = boardType === 'arrivals' ? 'text-blue-400' : 'text-yellow-400';
    const emptyMessage = boardType === 'arrivals' ? 'Aucune arrivée trouvée' : 'Aucun départ trouvé';

    // ⚡ Bolt: Memoize sorted departures to prevent re-sorting on every render
    const sortedDepartures = useMemo(() => {
        return [...departures].sort((a, b) => {
            const aFav = favoritesSet.has(a.id);
            const bFav = favoritesSet.has(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return 0;
        });
    }, [departures, favoritesSet]);

    // ⚡ Bolt: Provide a stable reference for the click handler to prevent defeating DepartureRow's React.memo() on every render
    const handleTripClick = useCallback((tripId: string, line: string) => {
        setSelectedTrip({ tripId, line });
    }, []);

    const handleToggleFavorite = useCallback((id: string, line: string, destination: string, type: 'BUS' | 'TER') => {
        onToggleFavorite?.(id, line, destination, type);
    }, [onToggleFavorite]);

    return (
        <div className="space-y-3 bg-surface p-3 md:hidden">
            {loading && departures.length === 0 ? (
                <div className="px-4 py-12 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-gray-500">
                        <RefreshCw className={`w-8 h-8 animate-spin ${accentText}`} />
                        <p className="text-sm font-bold uppercase tracking-wide">Chargement...</p>
                    </div>
                </div>
            ) : departures.length === 0 ? (
                <div className="px-4 py-12 text-center">
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-gray-500">
                        <p className="text-sm font-bold uppercase tracking-wide">{emptyMessage}</p>
                        <p className="mt-2 text-xs text-gray-600">Modifiez la recherche ou les filtres.</p>
                    </div>
                </div>
            ) : (
                sortedDepartures.map((entry) => {
                    const isFav = favoritesSet.has(entry.id);

                    return (
                        <DepartureRow
                            key={entry.id}
                            entry={entry}
                            boardType={boardType}
                            isFav={isFav}
                            sourceSignal={entry.type === 'BUS' ? freshness?.bus : freshness?.train}
                            onToggleFavorite={onToggleFavorite ? handleToggleFavorite : undefined}
                            onTripClick={handleTripClick}
                        />
                    );
                })
            )}

            {/* Trip Detail Modal */}
            <TripDetailModal
                tripId={selectedTrip?.tripId || null}
                lineName={selectedTrip?.line || 'E1'}
                onClose={() => setSelectedTrip(null)}
            />
        </div>
    );
}
