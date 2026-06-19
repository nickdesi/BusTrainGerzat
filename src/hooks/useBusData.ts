import { useQuery } from '@tanstack/react-query';
import { fetchWithRetry } from '@/lib/api-client';
import { BusUpdate } from '@/types/bus';

interface BusDataResponse {
    updates: BusUpdate[];
    timestamp: number;
    /** False when the GTFS-RT feed could not be fetched or was too stale to use. */
    rtAvailable?: boolean;
}

async function fetchBusData(): Promise<BusDataResponse> {
    return fetchWithRetry<BusDataResponse>('/api/realtime', {
        retries: 2, // Slightly less than default since it's realtime data
    });
}

/**
 * Pure data fetching hook for bus realtime data.
 * Separated from transformation logic for better testability.
 */
export function useBusData() {
    return useQuery<BusDataResponse>({
        queryKey: ['bus-realtime'],
        queryFn: fetchBusData,
        refetchInterval: false,
        refetchOnWindowFocus: false,
    });
}
