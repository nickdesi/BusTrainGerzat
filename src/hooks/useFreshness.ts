import { useQuery } from '@tanstack/react-query';

export interface BusFreshnessStatus {
    isValid: boolean;
    daysRemaining: number;
    warningLevel: 'none' | 'info' | 'warning' | 'critical';
    message?: string;
}

export interface TrainFreshnessStatus {
    isValid: boolean;
    hasApiKey: boolean;
    isCached: boolean;
    cacheExpiresIn: number;
    lastFetchAge: number | null;
    warningLevel: 'none' | 'info' | 'warning' | 'critical';
    message?: string;
}

export interface FreshnessResponse {
    bus: BusFreshnessStatus;
    train: TrainFreshnessStatus;
    timestamp: number;
}

async function fetchFreshness(): Promise<FreshnessResponse> {
    const res = await fetch('/api/freshness');
    if (!res.ok) throw new Error('Failed to fetch freshness');
    return res.json();
}

/**
 * Hook for checking data freshness across all transport sources.
 * Returns warning status for UI display.
 */
export function useFreshness() {
    return useQuery<FreshnessResponse>({
        queryKey: ['freshness'],
        queryFn: fetchFreshness,
        staleTime: 1000 * 60 * 60, // 1 hour - freshness changes slowly
        refetchOnWindowFocus: false,
    });
}
