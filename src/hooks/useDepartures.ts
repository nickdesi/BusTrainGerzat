import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UnifiedEntry, Update, TrainUpdate } from '@/types';

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
    });

    const isLoading = busLoading || trainLoading;
    const isFetching = busFetching || trainFetching;
    const error = busError || trainError;

    const updates: Update[] = busData?.updates || [];
    const trainUpdates: TrainUpdate[] = trainData?.updates || [];

    // Memoized departures and arrivals
    const { departures, arrivals } = useMemo(() => {
        // Bus mapping
        const mapBusDeparture = (bus: Update): UnifiedEntry => ({
            id: `bus-${bus.tripId}-${bus.arrival}`,
            type: 'BUS',
            time: bus.arrival,
            arrivalTime: bus.arrival,
            departureTime: bus.departure || bus.arrival,
            line: '20',
            destination: bus.headsign,
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
            line: '20',
            destination: 'GERZAT Champfleuri',
            provenance: 'Clermont-Ferrand / Aéroport',
            delay: bus.delay,
            isRealtime: bus.isRealtime,
            isCancelled: bus.isCancelled || false,
            platform: 'Champfleuri',
        });

        // Train mapping - use real destination from API
        // Consolidated function to avoid duplication
        const mapTrain = (train: TrainUpdate, platform: string): UnifiedEntry => ({
            id: `train-${train.tripId}`,
            type: 'TER',
            time: Number(train.arrival.time),
            arrivalTime: Number(train.arrival.time),
            departureTime: Number(train.departure.time),
            line: train.trainNumber,
            destination: train.direction || 'Inconnu',
            provenance: train.origin || 'Inconnu',
            delay: train.delay,
            isRealtime: train.isRealtime,
            isCancelled: train.isCancelled || false,
            platform,
        });

        // Separate and map
        const busDepartures = deduplicate(updates.filter(u => u.direction === 0));
        const busArrivals = deduplicate(updates.filter(u => u.direction === 1));

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
        ].sort((a, b) => a.time - b.time);

        return { departures: deps, arrivals: arrs };
    }, [updates, trainUpdates]);

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
        lastUpdated: Math.max(busUpdatedAt || 0, trainUpdatedAt || 0),
        refetch
    };
}

