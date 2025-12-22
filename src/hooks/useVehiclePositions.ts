import { useQuery } from '@tanstack/react-query';

export interface VehiclePosition {
    tripId: string;
    lat: number;
    lon: number;
    direction: number;
    nextStop: string;
    nextStopName: string;
    headsign: string; // Terminus name
    bearing: number;
    delay: number;
    progress: number;
    estimatedArrival: number;
    terminusEta: number; // ETA at terminus
    origin: string;
}

interface VehiclesResponse {
    vehicles: VehiclePosition[];
    timestamp: number;
    count: number;
    isEstimated: boolean;
}

async function fetchVehicles(): Promise<VehiclesResponse> {
    const res = await fetch('/api/vehicles');
    if (!res.ok) {
        throw new Error('Failed to fetch vehicle positions');
    }
    return res.json();
}

export function useVehiclePositions() {
    return useQuery({
        queryKey: ['vehicle-positions'],
        queryFn: fetchVehicles,
        refetchInterval: 15000, // Refresh every 15 seconds
        staleTime: 10000,
    });
}
