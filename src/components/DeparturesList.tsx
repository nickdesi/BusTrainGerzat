import { ArrowRight, RefreshCw } from 'lucide-react';
import { UnifiedEntry } from '@/types';
import SplitFlapDisplay from './SplitFlapDisplay';
import StatusDisplay from './StatusDisplay';
import { formatTime, normalizeText } from '@/utils/format';

interface DeparturesListProps {
    departures: UnifiedEntry[];
    loading: boolean;
    boardType?: 'departures' | 'arrivals';
}

export default function DeparturesList({ departures, loading, boardType = 'departures' }: DeparturesListProps) {
    const emptyMessage = boardType === 'arrivals' ? 'Aucune arrivée prévue' : 'Aucun départ prévu';

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
                departures.map((entry, index) => (
                    <div
                        key={entry.id}
                        className={`p-4 flip-enter ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1f1f1f]'}`}
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
                                <SplitFlapDisplay text={formatTime(entry.departureTime)} size="lg" color="text-yellow-500" />
                            )}
                            <div className="flex items-center gap-2">
                                {entry.type === 'BUS' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-900/30 text-red-400 border border-red-700/50">
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
                                <SplitFlapDisplay text={normalizeText(entry.destination)} size="xs" color="text-gray-200" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                                {entry.platform}
                            </span>
                            <div className="flex items-center gap-2">
                                <StatusDisplay delay={entry.delay} isRealtime={entry.isRealtime} isCancelled={entry.isCancelled} />
                                {entry.isRealtime && (
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
