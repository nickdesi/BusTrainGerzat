import { memo, useState } from 'react';
import { ArrowRight, Bus, Train, RefreshCw, ChevronRight } from 'lucide-react';
import { UnifiedEntry } from '@/types';
import SplitFlapDisplay from './SplitFlapDisplay';
import StatusDisplay from './StatusDisplay';
import TripDetailModal from './TripDetailModal';
import { formatTime, getDisplayTime } from '@/utils/format';
import { usePredictiveDelay } from '@/hooks/usePredictiveDelay';
import { BrainCircuit } from 'lucide-react';

interface DeparturesBoardProps {
    departures: UnifiedEntry[];
    loading: boolean;
    boardType?: 'departures' | 'arrivals';
    favorites?: string[]; // IDs of favorite lines
    onToggleFavorite?: (id: string, line: string, destination: string, type: 'BUS' | 'TER') => void;
}

export default memo(function DeparturesBoard({ departures, loading, boardType = 'departures', favorites = [], onToggleFavorite }: DeparturesBoardProps) {
    const emptyMessage = boardType === 'arrivals' ? 'Aucune arrivée prévue' : 'Aucun départ prévu';
    const { getPrediction } = usePredictiveDelay();
    const [selectedTrip, setSelectedTrip] = useState<{ tripId: string; line: string } | null>(null);

    // Sort departures: Favorites first, then by time
    const sortedDepartures = [...departures].sort((a, b) => {
        const idA = a.id;
        const idB = b.id;
        const isFavA = favorites.includes(idA);
        const isFavB = favorites.includes(idB);

        if (isFavA && !isFavB) return -1;
        if (!isFavA && isFavB) return 1;
        return 0; // Maintain existing sort (by time)
    });

    return (
        <div className="hidden md:block overflow-x-auto bg-[#151515]">
            <table className="w-full">
                <thead>
                    <tr className="bg-black text-yellow-500/60 text-xs font-bold uppercase tracking-[0.2em] border-b border-gray-800">
                        <th className="w-12 px-2 py-4 text-center">★</th>
                        <th className="px-6 py-4 text-left font-mono">Heure</th>
                        <th className="px-6 py-4 text-left">Type</th>
                        <th className="px-6 py-4 text-left">Ligne</th>
                        <th className="px-6 py-4 text-left">{boardType === 'arrivals' ? 'Provenance' : 'Destination'}</th>
                        <th className="px-6 py-4 text-left">Quai</th>
                        <th className="px-6 py-4 text-center">État</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {loading && departures.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center gap-3 text-gray-500">
                                    <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
                                    <p className="text-sm uppercase tracking-wide">Chargement des données...</p>
                                </div>
                            </td>
                        </tr>
                    ) : departures.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                <p className="text-sm uppercase tracking-wide">{emptyMessage}</p>
                            </td>
                        </tr>
                    ) : (
                        sortedDepartures.map((entry, index) => {
                            const isFav = favorites.includes(entry.id);

                            // Prediction Logic
                            const departureTime = new Date(entry.departureTime);
                            const prediction = getPrediction(entry.line, departureTime.getHours(), departureTime.getDay());
                            const showPrediction = !entry.isRealtime && !entry.isCancelled && (prediction.probability === 'HIGH' || prediction.probability === 'MEDIUM');

                            return (
                                <tr
                                    key={entry.id}
                                    onClick={() => entry.type === 'BUS' && entry.tripId && setSelectedTrip({ tripId: entry.tripId, line: entry.line })}
                                    className={`flip-enter transition-colors ${entry.type === 'BUS' && entry.tripId
                                            ? 'cursor-pointer hover:bg-yellow-900/20'
                                            : 'hover:bg-gray-800/50'
                                        } ${isFav ? 'bg-yellow-900/10' : index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1f1f1f]'}`}
                                    title={entry.type === 'BUS' ? 'Cliquez pour voir le détail du trajet' : undefined}
                                >
                                    {/* Favorite Toggle */}
                                    <td className="px-2 py-5 text-center">
                                        {onToggleFavorite && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleFavorite(entry.id, entry.line, entry.destination, entry.type);
                                                }}
                                                className={`transition-all hover:scale-110 ${isFav ? 'text-yellow-400' : 'text-gray-700 hover:text-gray-400'}`}
                                                title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                                                aria-label={isFav ? `Retirer la ligne ${entry.line} vers ${entry.destination} des favoris` : `Ajouter la ligne ${entry.line} vers ${entry.destination} aux favoris`}
                                                aria-pressed={isFav}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                            </button>
                                        )}
                                    </td>

                                    {/* Time */}
                                    <td className="px-6 py-5">
                                        {entry.type === 'TER' ? (
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] uppercase text-gray-500 mb-1">Arrivée</span>
                                                    <SplitFlapDisplay text={formatTime(entry.arrivalTime)} size="lg" color="text-yellow-500" />
                                                </div>
                                                <span className="text-gray-600 text-xl">→</span>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] uppercase text-gray-500 mb-1">Départ</span>
                                                    <SplitFlapDisplay text={formatTime(entry.departureTime)} size="lg" color="text-yellow-500" />
                                                </div>
                                            </div>
                                        ) : (
                                            <SplitFlapDisplay text={formatTime(getDisplayTime(entry, boardType)!)} size="xl" color="text-yellow-500" />
                                        )}
                                    </td>

                                    {/* Type */}
                                    <td className="px-6 py-5">
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
                                    <td className="px-6 py-5">
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
                                    <td className="px-6 py-5">
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
                                    <td className="px-6 py-5">
                                        <span className="text-sm text-gray-400 font-medium">
                                            {entry.platform}
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="flex items-center gap-3">
                                                <StatusDisplay delay={entry.delay} isRealtime={entry.isRealtime} isCancelled={entry.isCancelled} />
                                                {entry.isRealtime && (
                                                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse"></div>
                                                )}
                                            </div>
                                            {showPrediction && (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-900/30 border border-purple-500/30 animate-pulse">
                                                    <BrainCircuit className="w-3 h-3 text-purple-400" />
                                                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                                                        IA: +{prediction.estimatedDelay} min probables
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Click indicator for buses */}
                                    {entry.type === 'BUS' && entry.tripId && (
                                        <td className="px-2 py-5">
                                            <ChevronRight className="w-4 h-4 text-gray-600" />
                                        </td>
                                    )}
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>

            {/* Trip Detail Modal */}
            <TripDetailModal
                tripId={selectedTrip?.tripId || null}
                lineName={selectedTrip?.line || 'E1'}
                onClose={() => setSelectedTrip(null)}
            />
        </div>
    );
});
