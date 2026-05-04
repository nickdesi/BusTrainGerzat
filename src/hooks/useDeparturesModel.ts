import { useMemo } from 'react';
import { UnifiedEntry, TrainUpdate } from '@/types';
import { normalizeText } from '@/utils/format';
import { BusUpdate } from './useBusData';

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
        provenance: bus.origin, // Use origin from GTFS data (e.g., Ballainvilliers for Express)
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

// ⚡ Bolt: Cache empty arrays to avoid recreating them on every render
// when data is undefined (e.g., during loading). This prevents defeating
// the useMemo hook below and subsequent React.memo optimizations in the UI.
const EMPTY_BUS_UPDATES: BusUpdate[] = [];
const EMPTY_TRAIN_UPDATES: TrainUpdate[] = [];

/**
 * Pure transformation hook - converts raw bus/train data into unified departures/arrivals
 * Separated from fetching logic for better testability and separation of concerns.
 */
export function useDeparturesModel(
    busUpdates: BusUpdate[] = EMPTY_BUS_UPDATES,
    trainUpdates: TrainUpdate[] = EMPTY_TRAIN_UPDATES
): DeparturesModelResult {
    return useMemo(() => {
        // ⚡ Bolt: Single pass processing to avoid intermediate array allocations
        // from multiple filter() and map() calls.
        const deps: UnifiedEntry[] = [];
        const arrs: UnifiedEntry[] = [];
        const seenBusDepartures = new Set<string>();
        const seenBusArrivals = new Set<string>();

        // Process buses
        for (const bus of busUpdates) {
            const roundedTime = Math.floor(bus.arrival / 60);
            const key = `${roundedTime}-${bus.headsign}`;

            // Departures: direction 0
            if (bus.direction === 0) {
                if (!seenBusDepartures.has(key)) {
                    seenBusDepartures.add(key);
                    deps.push(mapBusDeparture(bus));
                }
            }
            // Arrivals: direction 1
            else if (bus.direction === 1) {
                if (!seenBusArrivals.has(key)) {
                    seenBusArrivals.add(key);
                    arrs.push(mapBusArrival(bus));
                }
            }
        }

        // Process trains
        for (const train of trainUpdates) {
            deps.push(mapTrain(train, 'Voie 1'));
            arrs.push(mapTrain(train, 'Voie 2'));
        }

        // Sort at the end
        deps.sort((a, b) => a.time - b.time);
        arrs.sort((a, b) => a.arrivalTime - b.arrivalTime);

        return { departures: deps, arrivals: arrs };
    }, [busUpdates, trainUpdates]);
}
