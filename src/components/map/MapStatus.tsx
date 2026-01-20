interface MapStatusProps {
    isLoading: boolean;
    vehicleCount: number;
    isFetching: boolean;
}

export default function MapStatus({ isLoading, vehicleCount, isFetching }: MapStatusProps) {
    return (
        <div className="absolute top-4 right-4 z-[var(--z-modal)] pointer-events-none">
            <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg pointer-events-auto">
                <div className={`relative flex h-3 w-3`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFetching ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isFetching ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
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
