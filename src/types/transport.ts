export interface BusUpdate {
    tripId: string;
    arrival: number;
    delay: number;
    isRealtime: boolean;
    headsign: string;
    direction: number;
}

export interface TrainUpdate {
    tripId: string;
    trainNumber: string;
    direction: string;
    arrival: { time: string; delay: number };
    departure: { time: string; delay: number };
    delay: number;
    isRealtime: boolean;
}

export interface TransportData {
    bus: BusUpdate[];
    train: TrainUpdate[];
    lastUpdated: number | null;
    loading: boolean;
    error: string | null;
}
