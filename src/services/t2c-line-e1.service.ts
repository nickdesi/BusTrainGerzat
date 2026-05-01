import lineE1Data from '../../public/data/lineE1_data.json';
import e1StopTimes from '../../public/data/e1_stop_times.json';

export interface LineE1StopInfo {
    stopId: string;
    stopName: string;
    lat: number;
    lon: number;
}

export interface LineE1StaticStopTime {
    stopId: string;
    sequence: number;
    arrivalTime: number;
    departureTime: number;
}

export interface LineE1StaticTrip {
    tripId: string;
    headsign: string;
    direction: number;
    stops: LineE1StaticStopTime[];
}

export type LineE1Shapes = typeof lineE1Data.shapes;

const staticTrips = e1StopTimes as LineE1StaticTrip[];
const staticTripsById = new Map(staticTrips.map(trip => [trip.tripId, trip]));
const staticTripsByPattern = new Map<string, LineE1StaticTrip>();

for (const trip of staticTrips) {
    const pattern = extractTripPattern(trip.tripId);
    if (!staticTripsByPattern.has(pattern)) {
        staticTripsByPattern.set(pattern, trip);
    }
}

const stopsById = new Map<string, LineE1StopInfo>(
    lineE1Data.stops.map(stop => [stop.stopId, stop as LineE1StopInfo])
);

export function extractTripPattern(tripId: string): string {
    const parts = tripId.split('_');
    return parts.length > 2 ? parts.slice(2).join('_') : tripId;
}

export function getLineE1StaticTrips(): LineE1StaticTrip[] {
    return staticTrips;
}

export function getLineE1StaticTrip(tripId: string): LineE1StaticTrip | undefined {
    return staticTripsById.get(tripId) ?? staticTripsByPattern.get(extractTripPattern(tripId));
}

export function getLineE1Stop(stopId: string): LineE1StopInfo | undefined {
    return stopsById.get(stopId);
}

export function getLineE1Shapes(): LineE1Shapes {
    return lineE1Data.shapes;
}

export function getStopAt(trip: LineE1StaticTrip, index: number): LineE1StaticStopTime | undefined {
    return trip.stops.at(index);
}

export function getFirstStop(trip: LineE1StaticTrip): LineE1StaticStopTime | undefined {
    return trip.stops.at(0);
}

export function getLastStop(trip: LineE1StaticTrip): LineE1StaticStopTime | undefined {
    return trip.stops.at(-1);
}

export function getEffectiveDelay(reportedDelay: number, predictedTime: number | undefined, scheduledTime: number): number {
    if (reportedDelay !== 0 || !predictedTime) return reportedDelay;

    const calculatedDelay = predictedTime - scheduledTime;
    return Math.abs(calculatedDelay) >= 60 ? calculatedDelay : reportedDelay;
}
