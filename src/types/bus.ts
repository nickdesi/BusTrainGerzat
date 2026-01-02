/**
 * Bus-specific type definitions
 * Types related to T2C bus data and GTFS
 */

/**
 * Real-time bus update from GTFS-RT
 */
export interface BusUpdate {
    tripId: string;
    arrival: number;
    departure: number;
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
    headsign: string;
    direction: number;
    origin: string; // First stop name from GTFS
}

/**
 * Stop information for bus routes
 */
export interface BusStop {
    stopId: string;
    stopName: string;
    lat: number;
    lon: number;
    sequence: number;
}

/**
 * Bus trip details
 */
export interface BusTrip {
    tripId: string;
    routeId: string;
    directionId: number;
    headsign: string;
    stops: BusStop[];
}
