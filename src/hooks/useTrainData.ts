import { useQuery } from '@tanstack/react-query';
import { TrainUpdate } from '@/types';

interface TrainDataResponse {
    updates: TrainUpdate[];
    timestamp: number;
}

async function fetchTrainData(): Promise<TrainDataResponse> {
    const res = await fetch('/api/trains');
    if (!res.ok) {
        return { updates: [], timestamp: Date.now() / 1000 };
    }
    return res.json();
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
