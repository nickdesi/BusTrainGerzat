import { useQuery } from '@tanstack/react-query';

interface FreshnessStatus {
    isValid: boolean;
    daysRemaining: number;
    warningLevel: 'none' | 'warning' | 'critical';
    message?: string;
}

interface FreshnessResponse {
    bus: FreshnessStatus;
    train: { isValid: boolean };
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
