interface MapEmptyStateProps {
    isLoading: boolean;
    vehicleCount?: number;
}

export default function MapEmptyState({ isLoading, vehicleCount }: MapEmptyStateProps) {
    if (isLoading || (vehicleCount && vehicleCount > 0)) return null;

    return (
        <div className="absolute bottom-4 left-4 right-4 z-[var(--z-modal)] flex justify-center pointer-events-none md:left-1/2 md:right-auto md:-translate-x-1/2">
            <div className="rounded-[1.5rem] border border-yellow-300/20 bg-white/[0.055] p-1 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="rounded-[calc(1.5rem-0.25rem)] border border-white/10 bg-slate-950/86 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                    <span className="font-display text-xs font-black uppercase tracking-[0.18em] text-yellow-100">Aucun bus en circulation</span>
                </div>
            </div>
        </div>
    );
}
