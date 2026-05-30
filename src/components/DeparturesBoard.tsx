'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import { ArrowRight, Bus, Train, RefreshCw, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { UnifiedEntry } from '@/types';
import SplitFlapDisplay from './SplitFlapDisplay';
import StatusDisplay, { DataConfidenceSignal } from './StatusDisplay';
import TripDetailModal from './TripDetailModal';
import { formatTime, getDisplayTime } from '@/utils/format';
import { usePredictiveDelay } from '@/hooks/usePredictiveDelay';
import { BrainCircuit } from 'lucide-react';
import { useFreshness } from '@/hooks/useFreshness';

interface DeparturesBoardProps {
    departures: UnifiedEntry[];
    loading: boolean;
    boardType?: 'departures' | 'arrivals';
    favorites?: Set<string>; // IDs of favorite lines
    onToggleFavorite?: (id: string, line: string, destination: string, type: 'BUS' | 'TER') => void;
}

// ⚡ Bolt: Extract DepartureBoardRow into a memoized component to prevent expensive re-renders
// when parent state (like selectedTrip) changes.
interface DepartureBoardRowProps {
    entry: UnifiedEntry;
    index: number;
    boardType: 'departures' | 'arrivals';
    isFav: boolean;
    sourceSignal?: DataConfidenceSignal;
    onToggleFavorite?: (id: string, line: string, destination: string, type: 'BUS' | 'TER') => void;
    onTripClick?: (tripId: string, line: string) => void;
}

const DepartureBoardRow = memo(function DepartureBoardRow({
    entry,
    index,
    boardType,
    isFav,
    sourceSignal,
    onToggleFavorite,
    onTripClick
}: DepartureBoardRowProps) {
    const { getPrediction } = usePredictiveDelay();
    const accentHover = boardType === 'arrivals' ? 'hover:bg-blue-900/20' : 'hover:bg-yellow-900/20';
    const favoriteTint = boardType === 'arrivals' ? 'bg-blue-900/10' : 'bg-yellow-900/10';

    // ⚡ Bolt: Compute prediction inside the memoized row instead of the parent.
    // Parent passing a new object on every render defeated React.memo.
    // Also fixed bug: departureTime needs to be * 1000 for Date constructor
    const prediction = useMemo(() => {
        const departureTime = new Date(entry.departureTime * 1000);
        return getPrediction(entry.line, departureTime.getHours(), departureTime.getDay());
    }, [entry.departureTime, entry.line, getPrediction]);

    const showPrediction = !entry.isRealtime && !entry.isCancelled && (prediction.probability === 'HIGH' || prediction.probability === 'MEDIUM');
    const isClickable = entry.type === 'BUS' && !!entry.tripId;

    const timeColor = boardType === 'arrivals' ? 'text-blue-400' : 'text-yellow-500';
    const favoriteLabel = boardType === 'arrivals' ? entry.provenance ?? entry.destination : entry.destination;

    return (
        <tr
            onClick={() => isClickable && onTripClick?.(entry.tripId!, entry.line)}
            onKeyDown={(event) => {
                if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onTripClick?.(entry.tripId!, entry.line);
                }
            }}
            tabIndex={isClickable ? 0 : undefined}
            role={isClickable ? 'button' : undefined}
            className={`group flip-enter border-b border-white/[0.04] transition-colors ${isClickable
                ? `cursor-pointer ${accentHover}`
                : 'hover:bg-white/[0.03]'
                } ${isFav ? favoriteTint : index % 2 === 0 ? 'bg-surface-elevated' : 'bg-surface-raised'} ${entry.isCancelled ? 'opacity-60' : ''}`}
            title={entry.type === 'BUS' ? 'Cliquez pour voir le détail du trajet' : entry.isCancelled ? 'Train supprimé' : undefined}
        >
            {/* Favorite Toggle */}
            <td className="px-2 py-4 text-center">
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(entry.id, entry.line, favoriteLabel, entry.type);
                        }}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${isFav ? 'bg-yellow-400/15 text-yellow-300' : 'text-gray-600 hover:bg-white/5 hover:text-gray-300'}`}
                        title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                        aria-label={isFav ? `Retirer la ligne ${entry.line} vers ${favoriteLabel} des favoris` : `Ajouter la ligne ${entry.line} vers ${favoriteLabel} aux favoris`}
                        aria-pressed={isFav}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </button>
                )}
            </td>

            {/* Time */}
            <td className="px-6 py-4">
                {entry.type === 'TER' ? (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase text-gray-500 mb-1">Arrivée</span>
                            <SplitFlapDisplay text={formatTime(entry.arrivalTime)} size="lg" color={timeColor} />
                        </div>
                        <span className="text-gray-600 text-xl">→</span>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase text-gray-500 mb-1">Départ</span>
                            <SplitFlapDisplay text={formatTime(entry.departureTime)} size="lg" color={timeColor} />
                        </div>
                    </div>
                ) : (
                    <SplitFlapDisplay text={formatTime(getDisplayTime(entry, boardType)!)} size="xl" color={timeColor} />
                )}
            </td>

            {/* Type */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    {entry.type === 'BUS' ? (
                        <>
                            <Bus className="w-5 h-5 text-red-500" />
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-red-900/30 text-red-400 border border-red-700/50 uppercase">
                                Bus
                            </span>
                        </>
                    ) : (
                        <>
                            <Train className="w-5 h-5 text-blue-500" />
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-blue-900/30 text-blue-400 border border-blue-700/50 uppercase">
                                TER
                            </span>
                        </>
                    )}
                </div>
            </td>

            {/* Line */}
            <td className="px-6 py-4">
                {entry.type === 'BUS' ? (
                    <div className="w-10 h-10 flex items-center justify-center rounded shadow-lg border border-yellow-600/50" style={{ backgroundColor: '#fdc300', boxShadow: '0 4px 14px rgba(253, 195, 0, 0.3)' }}>
                        <span className="text-lg font-bold text-black font-sans tracking-tight">{entry.line}</span>
                    </div>
                ) : (
                    <div className="px-3 py-1.5 bg-blue-600 flex items-center justify-center rounded shadow-lg shadow-blue-900/40 border border-blue-500/50 min-w-[70px]">
                        <span className="text-xs font-bold text-white font-mono tracking-wider">{entry.line}</span>
                    </div>
                )}
            </td>

            {/* Destination / Provenance */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <ArrowRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="overflow-hidden">
                        <SplitFlapDisplay
                            text={boardType === 'arrivals' && entry.provenance ? entry.provenance : entry.destination}
                            size="xs"
                            color="text-gray-200"
                        />
                    </div>
                </div>
            </td>

            {/* Platform */}
            <td className="px-6 py-4">
                <span className="text-sm text-gray-400 font-medium">
                    {entry.platform}
                </span>
            </td>

            {/* Status */}
            <td className="px-6 py-4 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-3">
                        <StatusDisplay delay={entry.delay} isRealtime={entry.isRealtime} isCancelled={entry.isCancelled} sourceSignal={sourceSignal} />
                        {entry.isRealtime ? (
                            <Wifi className="w-4 h-4 text-green-500 animate-pulse" strokeWidth={3} />
                        ) : (
                            <WifiOff className="w-3 h-3 text-gray-700/50" />
                        )}
                    </div>
                    {showPrediction && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-900/30 border border-purple-500/30 animate-pulse">
                            <BrainCircuit className="w-3 h-3 text-purple-400" />
                            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                                Prévision: +{prediction.estimatedDelay} min probables
                            </span>
                        </div>
                    )}
                </div>
            </td>

            {/* Click indicator */}
            <td className="px-3 py-5 text-right">
                {isClickable && <ChevronRight className="ml-auto h-4 w-4 text-gray-600 transition-colors group-hover:text-gray-400" />}
            </td>
        </tr>
    );
});

// ⚡ Bolt: Empty Set default value for memoization
const EMPTY_FAVORITES_SET = new Set<string>();

export default memo(function DeparturesBoard({ departures, loading, boardType = 'departures', favorites = EMPTY_FAVORITES_SET, onToggleFavorite }: DeparturesBoardProps) {
    const { data: freshness } = useFreshness();
    const emptyMessage = boardType === 'arrivals' ? 'Aucune arrivée prévue' : 'Aucun départ prévu';
    const accentText = boardType === 'arrivals' ? 'text-blue-400' : 'text-yellow-500';
    const [selectedTrip, setSelectedTrip] = useState<{ tripId: string; line: string } | null>(null);
    // Sort departures: Favorites first, then by time
    const sortedDepartures = useMemo(() => {
        // ⚡ Bolt: Use the memoized favoritesSet to make lookups O(1) inside the sort loop
        // instead of O(M) inside an O(N log N) loop.
        return [...departures].sort((a, b) => {
            const idA = a.id;
            const idB = b.id;
            const isFavA = favorites.has(idA);
            const isFavB = favorites.has(idB);

            if (isFavA && !isFavB) return -1;
            if (!isFavA && isFavB) return 1;
            return 0; // Maintain existing sort (by time)
        });
    }, [departures, favorites]);

    // ⚡ Bolt: Provide a stable reference for the click handler to prevent defeating DepartureBoardRow's React.memo() on every render
    const handleTripClick = useCallback((tripId: string, line: string) => {
        setSelectedTrip({ tripId, line });
    }, []);

    // ⚡ Bolt: Provide a stable reference for toggle favorite to prevent defeating DepartureBoardRow's React.memo()
    const handleToggleFavorite = useCallback((id: string, line: string, destination: string, type: 'BUS' | 'TER') => {
        onToggleFavorite?.(id, line, destination, type);
    }, [onToggleFavorite]);

    return (
        <div className="hidden bg-surface md:block">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                    <thead className="sticky top-0 z-10">
                        <tr className="border-b border-white/10 bg-black/90 text-xs font-bold uppercase tracking-[0.2em] text-gray-400 backdrop-blur">
                            <th className={`w-16 px-2 py-4 text-center ${accentText}`}>★</th>
                            <th className="px-6 py-4 text-left font-mono">Heure</th>
                            <th className="px-6 py-4 text-left">Type</th>
                            <th className="px-6 py-4 text-left">Ligne</th>
                            <th className="px-6 py-4 text-left">{boardType === 'arrivals' ? 'Provenance' : 'Destination'}</th>
                            <th className="px-6 py-4 text-left">Quai</th>
                            <th className="px-6 py-4 text-center">État</th>
                            <th className="w-10 px-3 py-4" aria-label="Actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && departures.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-16 text-center">
                                    <div className="mx-auto flex max-w-xs flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-gray-400">
                                        <RefreshCw className={`h-9 w-9 animate-spin ${accentText}`} />
                                        <div>
                                            <p className="text-sm font-bold uppercase tracking-[0.2em]">Chargement en cours</p>
                                            <p className="mt-1 text-xs text-gray-500">Synchronisation des prochains passages…</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : departures.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-16 text-center">
                                    <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-gray-500">
                                        <p className="text-sm font-bold uppercase tracking-[0.2em]">{emptyMessage}</p>
                                        <p className="mt-2 text-xs text-gray-600">Essayez un autre filtre ou relancez l’actualisation.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedDepartures.map((entry, index) => {
                                // ⚡ Bolt: Use O(1) set lookup instead of O(M) includes
                                const isFav = favorites.has(entry.id);

                                return (
                                    <DepartureBoardRow
                                        key={entry.id}
                                        entry={entry}
                                        index={index}
                                        boardType={boardType}
                                        isFav={isFav}
                                        sourceSignal={entry.type === 'BUS' ? freshness?.bus : freshness?.train}
                                        onToggleFavorite={onToggleFavorite ? handleToggleFavorite : undefined}
                                        onTripClick={handleTripClick}
                                    />
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Trip Detail Modal */}
            <TripDetailModal
                tripId={selectedTrip?.tripId || null}
                lineName={selectedTrip?.line || 'E1'}
                onClose={() => setSelectedTrip(null)}
            />
        </div>
    );
});
