import { useQuery } from '@tanstack/react-query';

export interface Stop {
    stopId: string;
    stopName: string;
    lat: number;
    lon: number;
    sequence: number;
}

export interface Route {
    routeId: string;
    routeShortName: string;
    routeLongName: string;
    routeColor: string;
}

export interface LineE1Data {
    route: Route;
    stops: Stop[];
    shapes: {
        "0": [number, number][];
        "1": [number, number][];
        branches?: [number, number][][];
    };
}

async function fetchLineE1Data(): Promise<LineE1Data> {
    const res = await fetch('/api/lineE1');
    if (!res.ok) {
        throw new Error('Failed to fetch Line E1 data');
    }
    return res.json();
}

export function useLineE1Data() {
    return useQuery({
        queryKey: ['lineE1-data'],
        queryFn: fetchLineE1Data,
        staleTime: Infinity, // Static data, never stale
        gcTime: Infinity,
    });
}
