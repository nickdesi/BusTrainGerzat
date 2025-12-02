import { Train, ArrowRight, Clock } from 'lucide-react';
import { TrainUpdate } from '@/types/transport';
import { StatusBadge } from './StatusBadge';

interface TrainSectionProps {
    updates: TrainUpdate[];
    loading: boolean;
}

export function TrainSection({ updates, loading }: TrainSectionProps) {
    const formatTime = (timestamp: string) => {
        return new Date(Number(timestamp) * 1000).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const trainsToClermont = updates.filter(t => t.direction === 'To Clermont');
    const trainsFromClermont = updates.filter(t => t.direction === 'From Clermont');

    const TrainCard = ({ train, type }: { train: TrainUpdate; type: 'to' | 'from' }) => (
        <div className={`group bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-transparent transition-all duration-300 ${type === 'to' ? 'hover:border-blue-500/30' : 'hover:border-indigo-500/30'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Arrivée</span>
                        <span className={`text-2xl font-bold font-mono transition-colors ${type === 'to' ? 'text-blue-100 group-hover:text-blue-400' : 'text-indigo-100 group-hover:text-indigo-400'}`}>
                            {formatTime(train.arrival.time)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Départ</span>
                        <span className={`text-lg font-bold font-mono transition-colors ${type === 'to' ? 'text-blue-200/90 group-hover:text-blue-300' : 'text-indigo-200/90 group-hover:text-indigo-300'}`}>
                            {formatTime(train.departure.time)}
                        </span>
                    </div>
                </div>
                <StatusBadge delay={train.delay} isRealtime={train.isRealtime} />
            </div>
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Numéro</span>
                    <span className="text-sm text-gray-300 font-mono">TER {train.trainNumber}</span>
                </div>
                <div className={`w-8 h-1 rounded-full transition-colors ${type === 'to' ? 'bg-blue-500/20 group-hover:bg-blue-500' : 'bg-indigo-500/20 group-hover:bg-indigo-500'}`} />
            </div>
        </div>
    );

    const SkeletonCard = () => (
        <div className="bg-white/5 p-4 rounded-2xl border border-transparent animate-pulse">
            <div className="flex justify-between items-center mb-2">
                <div className="h-8 w-16 bg-gray-700 rounded" />
                <div className="h-4 w-16 bg-gray-700 rounded" />
            </div>
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <div className="h-2 w-10 bg-gray-700 rounded" />
                    <div className="h-4 w-20 bg-gray-700 rounded" />
                </div>
                <div className="h-1 w-8 bg-gray-700 rounded" />
            </div>
        </div>
    );

    return (
        <section className="lg:col-span-7 space-y-6 animate-fade-in delay-200">
            <div className="flex items-center gap-4 mb-2 px-2">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
                    <Train className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Trains TER</h2>
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">Gare de Gerzat</p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* To Clermont */}
                <div className="glass-panel rounded-3xl p-1 overflow-hidden">
                    <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Vers Clermont-Fd</h3>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="p-3 space-y-3 min-h-[200px]">
                        {loading && trainsToClermont.length === 0 ? (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        ) : trainsToClermont.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3 py-12">
                                <Clock className="w-12 h-12 text-gray-700 opacity-30" />
                                <p className="text-sm font-medium text-gray-500">Aucun départ imminent</p>
                            </div>
                        ) : (
                            trainsToClermont.map((train) => (
                                <TrainCard key={train.tripId} train={train} type="to" />
                            ))
                        )}
                    </div>
                </div>

                {/* From Clermont */}
                <div className="glass-panel rounded-3xl p-1 overflow-hidden">
                    <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Vers Riom / Moulins</h3>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="p-3 space-y-3 min-h-[200px]">
                        {loading && trainsFromClermont.length === 0 ? (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        ) : trainsFromClermont.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3 py-12">
                                <Clock className="w-12 h-12 text-gray-700 opacity-30" />
                                <p className="text-sm font-medium text-gray-500">Aucun départ imminent</p>
                            </div>
                        ) : (
                            trainsFromClermont.map((train) => (
                                <TrainCard key={train.tripId} train={train} type="from" />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
