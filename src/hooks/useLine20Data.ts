import { useQuery } from '@tanstack/react-query';

export interface Stop {
    stopId: string;
    name: string;
    lat: number;
    lon: number;
    sequence: number;
    direction: number;
}

export interface Line20Data {
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

async function fetchLine20Data(): Promise<Line20Data> {
    const res = await fetch('/api/line20');
    if (!res.ok) {
        throw new Error('Failed to fetch Line 20 data');
    }
    return res.json();
}

export function useLine20Data() {
    return useQuery({
        queryKey: ['line20-data'],
        queryFn: fetchLine20Data,
        staleTime: Infinity, // Static data, never stale
        gcTime: Infinity,
    });
}
