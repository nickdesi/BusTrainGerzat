interface MapStatusProps {
    isLoading: boolean;
    vehicleCount: number;
    isFetching: boolean;
}

export default function MapStatus({ isLoading, vehicleCount, isFetching }: MapStatusProps) {
    return (
        <div className="absolute left-3 top-16 z-[var(--z-modal)] pointer-events-none md:left-4 md:top-4">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-1 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl pointer-events-auto" role="status" aria-live="polite">
                <div className="flex items-center gap-3 rounded-[calc(1.35rem-0.25rem)] border border-white/10 bg-slate-950/85 py-2 pl-3 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                    <div className="relative flex h-3 w-3" aria-hidden="true">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFetching ? 'bg-yellow-300' : 'bg-emerald-300'}`} />
                        <span className={`relative inline-flex rounded-full h-3 w-3 shadow-[0_0_12px_currentColor] ${isFetching ? 'bg-yellow-400 text-yellow-400' : 'bg-emerald-400 text-emerald-400'}`} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black font-display uppercase text-gray-400 leading-none tracking-[0.24em]">EN DIRECT</span>
                        <span className="mt-1 text-xs font-bold text-white leading-none tabular-nums">
                            {isLoading ? 'Scan réseau…' : `${vehicleCount} bus`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
