import { useMemo } from 'react';
import { UnifiedEntry, Update, TrainUpdate } from '@/types';
import { normalizeText } from '@/utils/format';
import { BusUpdate } from './useBusData';

/**
 * Deduplicate bus updates by time (rounded to minute) + headsign
 */
function deduplicate(items: Update[]): Update[] {
    return items.filter((update, index, self) => {
        const roundedTime = Math.floor(update.arrival / 60);
        return index === self.findIndex((t) => (
            Math.floor(t.arrival / 60) === roundedTime && t.headsign === update.headsign
        ));
    });
}

/**
 * Map a bus update to a unified departure entry
 */
function mapBusDeparture(bus: BusUpdate): UnifiedEntry {
    return {
        id: `bus-${bus.tripId}-${bus.departure}`,
        tripId: bus.tripId,
        type: 'BUS',
        time: bus.departure || bus.arrival,
        arrivalTime: bus.arrival,
        departureTime: bus.departure || bus.arrival,
        line: 'E1',
        destination: normalizeText(bus.headsign),
        delay: bus.delay,
        isRealtime: bus.isRealtime,
        isCancelled: bus.isCancelled || false,
        platform: 'Champfleuri',
    };
}

/**
 * Map a bus update to a unified arrival entry
 */
function mapBusArrival(bus: BusUpdate): UnifiedEntry {
    // Express trips have headsign "Patural", standard trips have "GERZAT Champfleuri"
    const isExpress = bus.headsign.toUpperCase().includes('PATURAL');

    return {
        id: `bus-${bus.tripId}-${bus.arrival}`,
        tripId: bus.tripId,
        type: 'BUS',
        time: bus.arrival,
        arrivalTime: bus.arrival,
        departureTime: bus.departure || bus.arrival,
        line: 'E1',
        destination: normalizeText(bus.headsign), // Use actual headsign (Patural or GERZAT Champfleuri)
        provenance: isExpress ? 'Ballainvilliers' : 'Aubière Romagnat',
        delay: bus.delay,
        isRealtime: bus.isRealtime,
        isCancelled: bus.isCancelled || false,
        platform: isExpress ? 'Patural' : 'Champfleuri',
    };
}

/**
 * Map a train update to a unified entry
 */
function mapTrain(train: TrainUpdate, platform: string): UnifiedEntry {
    return {
        id: `train-${train.tripId}`,
        type: 'TER',
        time: Number(train.departure.time),
        arrivalTime: Number(train.arrival.time),
        departureTime: Number(train.departure.time),
        line: train.trainNumber,
        destination: normalizeText(train.direction || 'Inconnu'),
        provenance: normalizeText(train.origin || 'Inconnu'),
        delay: train.delay,
        isRealtime: train.isRealtime,
        isCancelled: train.isCancelled || false,
        platform,
    };
}

interface DeparturesModelResult {
    departures: UnifiedEntry[];
    arrivals: UnifiedEntry[];
}

/**
 * Pure transformation hook - converts raw bus/train data into unified departures/arrivals
 * Separated from fetching logic for better testability and separation of concerns.
 */
export function useDeparturesModel(
    busUpdates: BusUpdate[] = [],
    trainUpdates: TrainUpdate[] = []
): DeparturesModelResult {
    return useMemo(() => {
        // Filter by direction:
        // - Departures: buses LEAVING Gerzat (direction 0)
        // - Arrivals: buses ARRIVING at Gerzat (direction 1)
        const busDepartures = deduplicate(busUpdates.filter(u => u.direction === 0));
        const busArrivals = deduplicate(busUpdates.filter(u => u.direction === 1));

        const deps: UnifiedEntry[] = [
            ...busDepartures.map(mapBusDeparture),
            ...trainUpdates.map(t => mapTrain(t, 'Voie 1')),
        ].sort((a, b) => a.time - b.time);

        const arrs: UnifiedEntry[] = [
            ...busArrivals.map(mapBusArrival),
            ...trainUpdates.map(t => mapTrain(t, 'Voie 2')),
        ].sort((a, b) => a.arrivalTime - b.arrivalTime);

        return { departures: deps, arrivals: arrs };
    }, [busUpdates, trainUpdates]);
}
