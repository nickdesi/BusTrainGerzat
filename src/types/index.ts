export interface Update {
    tripId: string;
    arrival: number;
    departure: number;
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
    headsign: string;
    direction: number;
}

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

export interface UnifiedEntry {
    id: string;
    tripId?: string; // Original trip ID for API calls
    type: 'BUS' | 'TER';
    time: number;
    arrivalTime: number;
    departureTime: number;
    line: string;
    destination: string;
    provenance?: string; // For arrivals: where it comes from
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
    platform?: string;
}

export type TransportFilter = 'all' | 'bus' | 'train';
