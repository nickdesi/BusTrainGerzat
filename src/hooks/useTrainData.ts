import { useQuery } from '@tanstack/react-query';
import { fetchWithRetry } from '@/lib/api-client';
import { TrainUpdate } from '@/types';

interface TrainDataResponse {
    updates: TrainUpdate[];
    timestamp: number;
}

async function fetchTrainData(): Promise<TrainDataResponse> {
    return fetchWithRetry<TrainDataResponse>('/api/trains', {
        retries: 2,
    });
}

/**
 * Pure data fetching hook for train realtime data.
 * Separated from transformation logic for better testability.
 */
export function useTrainData() {
    return useQuery<TrainDataResponse>({
        queryKey: ['train-realtime'],
        queryFn: fetchTrainData,
        refetchInterval: false,
        refetchOnWindowFocus: false,
    });
}
