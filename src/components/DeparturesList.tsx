'use client';

import { memo, useState } from 'react';
import { ArrowRight, RefreshCw, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { UnifiedEntry } from '@/types';
import SplitFlapDisplay from './SplitFlapDisplay';
import StatusDisplay from './StatusDisplay';
import TripDetailModal from './TripDetailModal';
import { formatTime, getDisplayTime } from '@/utils/format';

interface DeparturesListProps {
    departures: UnifiedEntry[];
    loading: boolean;
    boardType?: 'departures' | 'arrivals';
    favorites?: string[];
    onToggleFavorite?: (id: string, line: string, destination: string, type: 'BUS' | 'TER') => void;
}

interface DepartureRowProps {
    entry: UnifiedEntry;
    index: number;
    boardType: 'departures' | 'arrivals';
    isFav: boolean;
    onToggleFavorite?: (id: string, line: string, destination: string, type: 'BUS' | 'TER') => void;
    onTripClick?: (tripId: string, line: string) => void;
}

const DepartureRow = memo(function DepartureRow({ entry, index, boardType, isFav, onToggleFavorite, onTripClick }: DepartureRowProps) {
    const isClickable = entry.type === 'BUS' && entry.tripId;

    return (
        <div
            onClick={() => isClickable && onTripClick?.(entry.tripId!, entry.line)}
            className={`p-4 flip-enter ${isClickable ? 'cursor-pointer active:bg-yellow-900/30' : ''} ${isFav ? 'bg-yellow-900/10' : index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1f1f1f]'} ${entry.isCancelled ? 'opacity-60' : ''}`}
            title={entry.isCancelled ? 'Train supprimé' : undefined}
        >
            <div className="flex items-start justify-between mb-3">
                {entry.type === 'TER' ? (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase">Arrivée</span>
                            <SplitFlapDisplay text={formatTime(entry.arrivalTime)} size="sm" color="text-yellow-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase">Départ</span>
                            <SplitFlapDisplay text={formatTime(entry.departureTime)} size="sm" color="text-yellow-500" />
                        </div>
                    </div>
                ) : (
                    <SplitFlapDisplay text={formatTime(getDisplayTime(entry, boardType)!)} size="lg" color="text-yellow-500" />
                )}
                <div className="flex items-center gap-3">
                    {onToggleFavorite && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(entry.id, entry.line, entry.destination, entry.type);
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${isFav ? 'text-yellow-400 bg-yellow-900/20' : 'text-gray-600 hover:bg-white/5'}`}
                            title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
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
                    <SplitFlapDisplay text={entry.destination} size="xs" color="text-gray-200" />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                    {entry.platform}
                </span>
                <div className="flex items-center gap-2">
                    <StatusDisplay delay={entry.delay} isRealtime={entry.isRealtime} isCancelled={entry.isCancelled} />
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
    const emptyMessage = boardType === 'arrivals' ? 'Aucune arrivée prévue' : 'Aucun départ prévu';
    const [selectedTrip, setSelectedTrip] = useState<{ tripId: string; line: string } | null>(null);

    // Sort departures: Favorites first
    const sortedDepartures = [...departures].sort((a, b) => {
        const idA = a.id;
        const idB = b.id;
        const isFavA = favorites.includes(idA);
        const isFavB = favorites.includes(idB);

        if (isFavA && !isFavB) return -1;
        if (!isFavA && isFavB) return 1;
        return 0;
    });

    return (
        <div className="md:hidden divide-y divide-gray-800">
            {loading && departures.length === 0 ? (
                <div className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                        <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
                        <p className="text-sm uppercase tracking-wide">Chargement...</p>
                    </div>
                </div>
            ) : departures.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500">
                    <p className="text-sm uppercase tracking-wide">{emptyMessage}</p>
                </div>
            ) : (
                sortedDepartures.map((entry, index) => {
                    const isFav = favorites.includes(entry.id);

                    return (
                        <DepartureRow
                            key={entry.id}
                            entry={entry}
                            index={index}
                            boardType={boardType}
                            isFav={isFav}
                            onToggleFavorite={onToggleFavorite}
                            onTripClick={(tripId, line) => setSelectedTrip({ tripId, line })}
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
