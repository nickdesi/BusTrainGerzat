import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBusData } from './useBusData';
import { useTrainData } from './useTrainData';
import { useDeparturesModel } from './useDeparturesModel';

interface TransportStreamPayload {
    bus?: unknown;
    train?: unknown;
}

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
    // useRef to securely track the timeout ID across renders
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        let isDisposed = false;

        const connectSSE = () => {
            if (isDisposed) return;

            eventSourceRef.current?.close();
            const eventSource = new EventSource('/api/stream');
            eventSourceRef.current = eventSource;

            eventSource.addEventListener('transport-error', () => {
                // Keep the stream open: regular queries still provide fallback data.
            });

            eventSource.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data) as TransportStreamPayload;

                    if (payload.bus) {
                        queryClient.setQueryData(['bus-realtime'], payload.bus);
                    }
                    if (payload.train) {
                        queryClient.setQueryData(['train-realtime'], payload.train);
                    }
                } catch {
                    // Ignore malformed stream messages; regular queries remain the fallback.
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                if (eventSourceRef.current === eventSource) {
                    eventSourceRef.current = null;
                }

                if (isDisposed) return;

                // Retry connection after 5 seconds without triggering the Next.js console overlay.
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(connectSSE, 5000);
            };

            return eventSource;
        };

        connectSSE();

        return () => {
            isDisposed = true;
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, [queryClient]);

    // Transformation logic (pure, testable)
    const { departures, arrivals } = useDeparturesModel(
        busData?.updates,
        trainData?.updates
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
