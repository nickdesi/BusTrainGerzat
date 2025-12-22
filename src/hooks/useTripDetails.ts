import { useQuery } from '@tanstack/react-query';

export interface StopTimeDetail {
    stopId: string;
    stopName: string;
    sequence: number;
    scheduledArrival: number;
    scheduledDeparture: number;
    predictedArrival: number;
    predictedDeparture: number;
    delay: number;
    status: 'passed' | 'current' | 'upcoming';
    isAccessible: boolean;
}

export interface TripDetails {
    tripId: string;
    routeId: string;
    direction: number;
    headsign: string;
    stops: StopTimeDetail[];
    timestamp: number;
    isRealtime: boolean;
    origin: string;
}

async function fetchTripDetails(tripId: string): Promise<TripDetails> {
    const res = await fetch(`/api/trip/${tripId}`);
    if (!res.ok) {
        throw new Error('Failed to fetch trip details');
    }
    return res.json();
}

/**
 * Hook to fetch detailed trip information including all stops
 * @param tripId - The trip ID to fetch, or null to skip
 */
export function useTripDetails(tripId: string | null) {
    return useQuery({
        queryKey: ['trip-details', tripId],
        queryFn: () => fetchTripDetails(tripId!),
        enabled: !!tripId,
        staleTime: 10000, // 10 seconds - realtime data
        refetchInterval: 15000, // Refetch every 15s when modal is open
    });
}
