interface MapStatusProps {
    isLoading: boolean;
    vehicleCount: number;
    isFetching: boolean;
}

export default function MapStatus({ isLoading, vehicleCount, isFetching }: MapStatusProps) {
    return (
        <div className="absolute left-4 top-4 z-[var(--z-modal)] pointer-events-none">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/80 py-2 pl-3 pr-4 shadow-lg backdrop-blur-xl pointer-events-auto" role="status" aria-live="polite">
                <div className="relative flex h-3 w-3" aria-hidden="true">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFetching ? 'bg-yellow-300' : 'bg-emerald-300'}`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isFetching ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold font-display uppercase text-gray-400 leading-none tracking-wider">EN DIRECT</span>
                    <span className="text-xs font-bold text-white leading-none">
                        {isLoading ? 'Chargement...' : `${vehicleCount} bus`}
                    </span>
                </div>
            </div>
        </div>
    );
}
