'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { Stop } from '@/hooks/useLineE1Data';

// Dynamically import react-leaflet components to avoid SSR/hydration issues
const CircleMarker = dynamic(
    () => import('react-leaflet').then((mod) => mod.CircleMarker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

interface StopMarkerProps {
    stop: Stop;
    isTerminus: boolean;
    routeColor: string;
}

const StopMarker = memo(function StopMarker({ stop, isTerminus, routeColor }: StopMarkerProps) {
    return (
        <CircleMarker
            center={[stop.lat, stop.lon]}
            radius={isTerminus ? 11 : 5}
            fillColor={isTerminus ? routeColor : '#f8fafc'}
            fillOpacity={isTerminus ? 0.98 : 0.88}
            color={isTerminus ? '#f8fafc' : routeColor}
            weight={isTerminus ? 4 : 2}
            opacity={isTerminus ? 0.95 : 0.72}
        >
            <Popup>
                <div className="w-[min(72vw,240px)] p-1 text-white sm:min-w-[180px]">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Arrêt E1</div>
                        <div className="font-display text-base font-black leading-tight">{stop.stopName}</div>
                        {isTerminus && (
                            <span className="mt-2 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                                Terminus
                            </span>
                        )}
                    </div>
                </div>
            </Popup>
        </CircleMarker>
    );
});

export default StopMarker;
