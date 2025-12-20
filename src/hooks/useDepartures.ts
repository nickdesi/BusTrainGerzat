import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBusData } from './useBusData';
import { useTrainData } from './useTrainData';
import { useDeparturesModel } from './useDeparturesModel';

/**
 * Main departures hook - composes data fetching, SSE, and transformation.
 * Refactored to follow separation of concerns principle.
 */
export function useDepartures() {
    const queryClient = useQueryClient();

    // Data fetching hooks
    const {
        data: busData,
        error: busError,
        isLoading: busLoading,
        dataUpdatedAt: busUpdatedAt,
        isFetching: busFetching
    } = useBusData();

    const {
        data: trainData,
        error: trainError,
        isLoading: trainLoading,
        dataUpdatedAt: trainUpdatedAt,
        isFetching: trainFetching
    } = useTrainData();

    // SSE Subscription for real-time updates
    useEffect(() => {
        const eventSource = new EventSource('/api/stream');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.bus) {
                    queryClient.setQueryData(['bus-realtime'], data.bus);
                }
                if (data.train) {
                    queryClient.setQueryData(['train-realtime'], data.train);
                }
            } catch {
                // Silently ignore parse errors
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [queryClient]);

    // Transformation logic (pure, testable)
    const { departures, arrivals } = useDeparturesModel(
        busData?.updates || [],
        trainData?.updates || []
    );

    // Memoized refetch function
    const refetch = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['bus-realtime'] });
        queryClient.invalidateQueries({ queryKey: ['train-realtime'] });
    }, [queryClient]);

    return {
        departures,
        arrivals,
        isLoading: busLoading || trainLoading,
        isFetching: busFetching || trainFetching,
        error: busError || trainError,
        lastUpdated: Math.max(
            (busData?.timestamp ? busData.timestamp * 1000 : busUpdatedAt) || 0,
            (trainData?.timestamp ? trainData.timestamp * 1000 : trainUpdatedAt) || 0
        ),
        refetch
    };
}
