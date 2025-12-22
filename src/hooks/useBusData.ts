import { useQuery } from '@tanstack/react-query';

export interface BusUpdate {
    tripId: string;
    arrival: number;
    departure: number;
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
    headsign: string;
    direction: number;
    origin: string; // First stop name from GTFS (e.g., Ballainvilliers for Express)
}

interface BusDataResponse {
    updates: BusUpdate[];
    timestamp: number;
}

async function fetchBusData(): Promise<BusDataResponse> {
    const res = await fetch('/api/realtime');
    if (!res.ok) throw new Error('Failed to fetch bus data');
    return res.json();
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
