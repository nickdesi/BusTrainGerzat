import { useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UnifiedEntry, Update, TrainUpdate } from '@/types';
import { normalizeText } from '@/utils/format';

async function fetchBusData() {
    const res = await fetch('/api/realtime');
    if (!res.ok) throw new Error('Failed to fetch bus data');
    return res.json();
}

async function fetchTrainData() {
    const res = await fetch('/api/trains');
    if (!res.ok) {
        return { updates: [] };
    }
    return res.json();
}

// Deduplicate by time (rounded to minute) + headsign
function deduplicate(items: Update[]): Update[] {
    return items.filter((update, index, self) => {
        const roundedTime = Math.floor(update.arrival / 60);
        return index === self.findIndex((t) => (
            Math.floor(t.arrival / 60) === roundedTime && t.headsign === update.headsign
        ));
    });
}

export function useDepartures() {
    const queryClient = useQueryClient();

    const {
        data: busData,
        error: busError,
        isLoading: busLoading,
        dataUpdatedAt: busUpdatedAt,
        isFetching: busFetching
    } = useQuery({
        queryKey: ['bus-realtime'],
        queryFn: fetchBusData,
        refetchInterval: false, // Disable polling, use SSE
        refetchOnWindowFocus: false,
    });

    const {
        data: trainData,
        error: trainError,
        isLoading: trainLoading,
        dataUpdatedAt: trainUpdatedAt,
        isFetching: trainFetching
    } = useQuery({
        queryKey: ['train-realtime'],
        queryFn: fetchTrainData,
        refetchInterval: false, // Disable polling, use SSE
        refetchOnWindowFocus: false,
    });

    // SSE Subscription
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
            } catch (err) {
                console.error('Failed to parse SSE data', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Error', err);
            eventSource.close();
            // Optional: Strategy to reconnect or fallback to polling could go here
            // For now, EventSource auto-retries connection errors
        };

        return () => {
            eventSource.close();
        };
    }, [queryClient]);

    const isLoading = busLoading || trainLoading;
    const isFetching = busFetching || trainFetching;
    const error = busError || trainError;

    // Memoized departures and arrivals
    const { departures, arrivals } = useMemo(() => {
        const updates: Update[] = busData?.updates || [];
        const trainUpdates: TrainUpdate[] = trainData?.updates || [];
        // Bus mapping - use departure time for departures board sorting
        const mapBusDeparture = (bus: Update): UnifiedEntry => ({
            id: `bus-${bus.tripId}-${bus.departure}`,
            type: 'BUS',
            time: bus.departure || bus.arrival, // Sort by departure time
            arrivalTime: bus.arrival,
            departureTime: bus.departure || bus.arrival,
            line: 'E1',
            destination: normalizeText(bus.headsign),
            delay: bus.delay,
            isRealtime: bus.isRealtime,
            isCancelled: bus.isCancelled || false,
            platform: 'Champfleuri',
        });

        const mapBusArrival = (bus: Update): UnifiedEntry => ({
            id: `bus-${bus.tripId}-${bus.arrival}`,
            type: 'BUS',
            time: bus.arrival,
            arrivalTime: bus.arrival,
            departureTime: bus.departure || bus.arrival,
            line: 'E1',
            destination: 'GERZAT Champfleuri',
            provenance: normalizeText('Aubière / Romagnat'),
            delay: bus.delay,
            isRealtime: bus.isRealtime,
            isCancelled: bus.isCancelled || false,
            platform: 'Champfleuri',
        });

        // Train mapping - use departure time for departures board sorting
        // Consolidated function to avoid duplication
        const mapTrain = (train: TrainUpdate, platform: string): UnifiedEntry => ({
            id: `train-${train.tripId}`,
            type: 'TER',
            time: Number(train.departure.time), // Sort by departure time
            arrivalTime: Number(train.arrival.time),
            departureTime: Number(train.departure.time),
            line: train.trainNumber,
            destination: normalizeText(train.direction || 'Inconnu'),
            provenance: normalizeText(train.origin || 'Inconnu'),
            delay: train.delay,
            isRealtime: train.isRealtime,
            isCancelled: train.isCancelled || false,
            platform,
        });

        // Separate and map
        console.log('UseDepartures - Raw updates:', updates.length, updates);

        // Filter by direction:
        // - Departures: buses LEAVING Gerzat (direction 0 = towards Aubière/Romagnat)
        // - Arrivals: buses ARRIVING at Gerzat (direction 1 = towards Gerzat)
        const busDepartures = deduplicate(updates.filter((u: Update) => u.direction === 0));
        const busArrivals = deduplicate(updates.filter((u: Update) => u.direction === 1));

        // All trains from SNCF API are departures from Gerzat (with arrival time = when it arrives at Gerzat)
        // Show all trains in both boards - they arrive at Gerzat, then depart from Gerzat
        const trainDepartures = trainUpdates;
        const trainArrivals = trainUpdates;

        const deps: UnifiedEntry[] = [
            ...busDepartures.map(mapBusDeparture),
            ...trainDepartures.map(t => mapTrain(t, 'Voie 1')),
        ].sort((a, b) => a.time - b.time);

        const arrs: UnifiedEntry[] = [
            ...busArrivals.map(mapBusArrival),
            ...trainArrivals.map(t => mapTrain(t, 'Voie 2')),
        ].sort((a, b) => a.arrivalTime - b.arrivalTime);

        return { departures: deps, arrivals: arrs };
    }, [busData, trainData]);

    // Memoized refetch function
    const refetch = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['bus-realtime'] });
        queryClient.invalidateQueries({ queryKey: ['train-realtime'] });
    }, [queryClient]);

    return {
        departures,
        arrivals,
        isLoading,
        isFetching,
        error,
        lastUpdated: Math.max(
            (busData?.timestamp ? busData.timestamp * 1000 : busUpdatedAt) || 0,
            (trainData?.timestamp ? trainData.timestamp * 1000 : trainUpdatedAt) || 0
        ),
        refetch
    };
}

