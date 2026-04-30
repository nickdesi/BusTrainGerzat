interface MapEmptyStateProps {
    isLoading: boolean;
    vehicleCount?: number;
}

export default function MapEmptyState({ isLoading, vehicleCount }: MapEmptyStateProps) {
    if (isLoading || (vehicleCount && vehicleCount > 0)) return null;

    return (
        <div className="absolute bottom-4 left-4 right-4 z-[var(--z-modal)] flex justify-center pointer-events-none md:left-1/2 md:right-auto md:-translate-x-1/2">
            <div className="rounded-2xl border border-yellow-300/20 bg-black/80 px-4 py-3 text-center shadow-lg backdrop-blur-xl">
                <span className="text-sm font-medium text-yellow-100">Pas de bus en circulation actuellement</span>
            </div>
        </div>
    );
}
