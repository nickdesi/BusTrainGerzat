import { Bus, Clock } from 'lucide-react';
import { BusUpdate } from '@/types/transport';
import { StatusBadge } from './StatusBadge';

interface BusSectionProps {
    updates: BusUpdate[];
    loading: boolean;
}

export function BusSection({ updates, loading }: BusSectionProps) {
    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const departures = updates.filter(u => u.headsign !== 'GERZAT Champfleuri');
    const arrivals = updates.filter(u => u.headsign === 'GERZAT Champfleuri');

    const BusCard = ({ update, type }: { update: BusUpdate; type: 'departure' | 'arrival' }) => (
        <div className={`flex justify-between items-center bg-gray-800/30 hover:bg-gray-800/50 p-3 rounded-xl border border-transparent transition-all duration-300 ${type === 'departure' ? 'hover:border-rose-500/20' : 'hover:border-orange-500/20'}`}>
            <div className="flex items-center gap-4">
                <div className={`text-xl font-bold font-mono ${type === 'departure' ? 'text-rose-100' : 'text-orange-100'}`}>
                    {formatTime(update.arrival)}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium">
                        {type === 'departure'
                            ? (update.headsign === "Musée d'Art R. Quilliot" ? "Direction : Clermont-Fd (Quillot)" :
                                update.headsign === "AULNAT St Exup. via Aéro." ? "Direction : Aéroport (via Clermont)" :
                                    `Direction : ${update.headsign}`)
                            : "Provenance : Clermont / Aéroport"
                        }
                    </span>
                    <span className="text-xs text-gray-400 font-mono">Ligne 20</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1">
                <StatusBadge delay={update.delay} isRealtime={update.isRealtime} />
            </div>
        </div>
    );

    const SkeletonCard = () => (
        <div className="flex justify-between items-center bg-gray-800/20 p-3 rounded-xl border border-transparent animate-pulse">
            <div className="flex items-center gap-4">
                <div className="h-6 w-12 bg-gray-700 rounded" />
                <div className="flex flex-col gap-1">
                    <div className="h-3 w-32 bg-gray-700 rounded" />
                    <div className="h-2 w-16 bg-gray-700 rounded" />
                </div>
            </div>
            <div className="h-4 w-16 bg-gray-700 rounded" />
        </div>
    );

    return (
        <section className="lg:col-span-5 space-y-6 animate-fade-in delay-100">
            <div className="flex items-center gap-4 mb-2 px-2">
                <div className="bg-gradient-to-br from-rose-500 to-orange-600 p-3 rounded-2xl shadow-lg shadow-rose-900/20">
                    <Bus className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Bus T2C</h2>
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <p className="text-xs text-rose-400 font-bold uppercase tracking-widest">Ligne 20</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {/* Bus Departures */}
                <div className="glass-panel rounded-3xl p-1 border border-gray-800/50">
                    <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-800/50 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Départs (Vers Clermont / Aéroport)</h3>
                    </div>
                    <div className="p-2 space-y-2">
                        {loading && departures.length === 0 ? (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        ) : departures.length === 0 ? (
                            <p className="text-gray-600 text-sm text-center py-4 italic">Aucun départ prévu</p>
                        ) : (
                            departures.map((update) => (
                                <BusCard key={`${update.tripId}-${update.arrival}`} update={update} type="departure" />
                            ))
                        )}
                    </div>
                </div>

                {/* Bus Arrivals */}
                <div className="glass-panel rounded-3xl p-1 border border-gray-800/50">
                    <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-800/50 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Arrivées (Terminus)</h3>
                    </div>
                    <div className="p-2 space-y-2">
                        {loading && arrivals.length === 0 ? (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        ) : arrivals.length === 0 ? (
                            <p className="text-gray-600 text-sm text-center py-4 italic">Aucune arrivée prévue</p>
                        ) : (
                            arrivals.map((update) => (
                                <BusCard key={`${update.tripId}-${update.arrival}`} update={update} type="arrival" />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
