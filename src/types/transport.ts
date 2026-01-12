
// --- Shared Transport Types ---

export interface BusUpdate {
    tripId: string;
    arrival: number; // Unix timestamp
    departure: number; // Unix timestamp
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
    headsign: string;
    direction: number;
    origin: string; // First stop name (e.g., Ballainvilliers for Express)
}

export interface TrainUpdate {
    tripId: string;
    trainNumber: string;
    direction: string;
    origin: string;
    platform?: string; // Platform number if available from API
    arrival: { time: string; delay: number };
    departure: { time: string; delay: number };
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
}
