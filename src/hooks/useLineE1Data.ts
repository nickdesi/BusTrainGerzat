import { useQuery } from '@tanstack/react-query';

export interface Stop {
    stopId: string;
    name: string;
    lat: number;
    lon: number;
    sequence: number;
    direction: number;
}

export interface LineE1Data {
    routeId: string;
    routeName: string;
    routeLongName: string;
    routeColor: string;
    stops: Stop[];
    shapes: {
        direction0: [number, number][];
        direction1: [number, number][];
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
