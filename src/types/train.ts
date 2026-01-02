/**
 * Train-specific type definitions
 * Types related to SNCF TER data
 */

/**
 * Real-time train update from SNCF API
 */
export interface TrainUpdate {
    tripId: string;
    trainNumber: string;
    direction: string;
    origin: string;
    arrival: { time: string; delay: number };
    departure: { time: string; delay: number };
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
}

/**
 * Train station information
 */
export interface TrainStation {
    stationId: string;
    stationName: string;
    lat: number;
    lon: number;
}
