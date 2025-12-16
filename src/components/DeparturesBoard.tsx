import { ArrowRight, Bus, Train, RefreshCw } from 'lucide-react';
import { UnifiedEntry } from '@/types';
import SplitFlapDisplay from './SplitFlapDisplay';
import StatusDisplay from './StatusDisplay';
import { formatTime } from '@/utils/format';

interface DeparturesBoardProps {
    departures: UnifiedEntry[];
    loading: boolean;
    boardType?: 'departures' | 'arrivals';
}

// Helper to get the display time based on board type
const getDisplayTime = (entry: UnifiedEntry, boardType: 'departures' | 'arrivals') => {
    if (entry.type === 'TER') return null; // TER shows both times
    return boardType === 'arrivals' ? entry.arrivalTime : entry.departureTime;
};

export default function DeparturesBoard({ departures, loading, boardType = 'departures' }: DeparturesBoardProps) {
    const emptyMessage = boardType === 'arrivals' ? 'Aucune arrivée prévue' : 'Aucun départ prévu';

    return (
        <div className="hidden md:block overflow-x-auto bg-[#151515]">
            <table className="w-full">
                <thead>
                    <tr className="bg-black text-yellow-500/60 text-xs font-bold uppercase tracking-[0.2em] border-b border-gray-800">
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
                            <td colSpan={6} className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center gap-3 text-gray-500">
                                    <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
                                    <p className="text-sm uppercase tracking-wide">Chargement des données...</p>
                                </div>
                            </td>
                        </tr>
                    ) : departures.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                <p className="text-sm uppercase tracking-wide">{emptyMessage}</p>
                            </td>
                        </tr>
                    ) : (
                        departures.map((entry, index) => (
                            <tr
                                key={entry.id}
                                className={`flip-enter hover:bg-gray-800/50 transition-colors ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1f1f1f]'}`}
                            >
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
                                        <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded shadow-lg shadow-red-900/40 border border-red-500/50">
                                            <span className="text-lg font-bold text-white font-sans tracking-tight">{entry.line}</span>
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
                                    <div className="flex items-center justify-center gap-3">
                                        <StatusDisplay delay={entry.delay} isRealtime={entry.isRealtime} isCancelled={entry.isCancelled} />
                                        {entry.isRealtime && (
                                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse"></div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
