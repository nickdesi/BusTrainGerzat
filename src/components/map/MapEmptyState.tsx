interface MapEmptyStateProps {
    isLoading: boolean;
    vehicleCount?: number;
}

export default function MapEmptyState({ isLoading, vehicleCount }: MapEmptyStateProps) {
    if (isLoading || (vehicleCount && vehicleCount > 0)) return null;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[var(--z-modal)]">
            <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-lg">
                <span className="text-gray-400 text-sm">Pas de bus en circulation actuellement</span>
            </div>
        </div>
    );
}
