'use client';

import { useMemo, memo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { VehiclePosition } from '@/hooks/useVehiclePositions';
import { Bus } from 'lucide-react';

// Dynamically import react-leaflet components to avoid SSR/hydration issues
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

// ⚡ Bolt: Cache Intl.DateTimeFormat instance to avoid expensive recreation on every render
const TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
});

interface BusMarkerProps {
    vehicle: VehiclePosition;
}

interface LeafletMarkerRef {
    setLatLng(latlng: [number, number]): void;
}

const BusMarker = memo(function BusMarker({ vehicle }: BusMarkerProps) {
    // Ref to access native Leaflet marker for smooth position updates
    const markerRef = useRef<LeafletMarkerRef | null>(null);

    // Determine bus color based on direction
    // direction 0 = From Gerzat towards Aubière/Romagnat (blue)
    // direction 1 = Towards Gerzat (green)
    const iconColor = vehicle.direction === 1 ? '#22c55e' : '#3b82f6';
    const directionLabel = vehicle.direction === 1 ? 'GERZAT' : 'SUD';

    // Determine pulse class based on delay
    const delayMinutes = Math.round(vehicle.delay / 60);
    const getPulseClass = () => {
        if (delayMinutes > 10) return 'bus-icon-pulse bus-icon-pulse-red';
        if (delayMinutes >= 5) return 'bus-icon-pulse bus-icon-pulse-orange';
        return 'bus-icon-pulse bus-icon-pulse-green';
    };
    const pulseClass = getPulseClass();

    // Create custom bus icon with SVG that rotates properly
    const busIcon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const L = require('leaflet');

        // SVG bus icon pointing up (will be rotated by bearing)
        const svgIcon = `
            <svg class="bus-vector" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" style="transform: rotate(${vehicle.bearing || 0}deg);">
                <path fill="${iconColor}" d="M16 3.2c-5.8 0-9.5 1.1-9.5 5.3v11.2c0 1.3.6 2.5 1.6 3.3v2.1c0 .8.6 1.4 1.4 1.4h1.2c.8 0 1.4-.6 1.4-1.4v-1h7.8v1c0 .8.6 1.4 1.4 1.4h1.2c.8 0 1.4-.6 1.4-1.4V23c1-.8 1.6-2 1.6-3.3V8.5c0-4.2-3.7-5.3-9.5-5.3Zm-5.3 4.7h10.6c.9 0 1.6.7 1.6 1.6v5.2H9.1V9.5c0-.9.7-1.6 1.6-1.6Zm.6 12.1a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Zm9.4 0a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z"/>
                <path fill="rgba(255,255,255,.8)" d="M10.4 10.1h11.2v3.2H10.4z"/>
            </svg>
        `;

        return L.divIcon({
            className: 'bus-marker',
            html: `
                <div class="bus-icon-container" style="--bus-color:${iconColor}">
                    <div class="${pulseClass}"></div>
                    <div class="bus-bearing-ring"></div>
                    <div class="bus-icon">
                        ${svgIcon}
                        <span class="bus-direction-chip">${directionLabel}</span>
                    </div>
                </div>
            `,
            iconSize: [52, 52],
            iconAnchor: [26, 26],
            popupAnchor: [0, -26],
        });
    }, [vehicle.bearing, iconColor, pulseClass, directionLabel]);

    // Update marker position smoothly when vehicle data changes
    useEffect(() => {
        if (markerRef.current) {
            // Use native Leaflet setLatLng for smooth CSS-transitioned update
            markerRef.current.setLatLng([vehicle.lat, vehicle.lon]);
        }
    }, [vehicle.lat, vehicle.lon]);

    // Capture marker reference on mount
    const eventHandlers = useMemo(() => ({
        add: (e: { target: LeafletMarkerRef }) => {
            markerRef.current = e.target;
        },
    }), []);

    if (!busIcon) return null;

    return (
        <Marker
            position={[vehicle.lat, vehicle.lon]}
            icon={busIcon}
            eventHandlers={eventHandlers}
        >
            <Popup>
                <div className="min-w-[240px] p-1">
                    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                            <Bus className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-display text-lg font-black leading-none text-white">Ligne E1</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">{vehicle.direction === 1 ? 'Retour nord' : 'Trajet sud'}</div>
                        </div>
                    </div>

                    {/* Origin & Direction indicator */}
                    <div className="mb-3 flex flex-col gap-1.5">
                        <div className="text-center text-xs text-gray-400">
                            Depuis {vehicle.origin}
                        </div>
                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <span className="text-sm font-bold text-emerald-200">
                                → {vehicle.headsign}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Prochain arrêt</div>
                            <div className="font-medium text-white">{vehicle.nextStopName}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
                                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Retard</div>
                                <div className={`font-display text-lg font-black ${vehicle.delay > 0 ? 'text-orange-300' : 'text-emerald-300'}`}>
                                    {vehicle.delay > 0 ? `+${Math.round(vehicle.delay / 60)} min` : 'OK'}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
                                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Arrivée</div>
                                <div className="font-display text-lg font-black tabular-nums text-white">
                                    {TIME_FORMATTER.format(vehicle.estimatedArrival * 1000)}
                                </div>
                            </div>
                        </div>

                        {/* Terminus ETA */}
                        <div className="rounded-[1.25rem] border border-yellow-300/20 bg-gradient-to-r from-yellow-300/15 to-orange-300/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-100/45">Terminus</div>
                                    <div className="max-w-[145px] truncate text-sm font-semibold text-white">{vehicle.headsign}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-100/45">Arrivée</div>
                                    <div className="font-display text-xl font-black tabular-nums text-yellow-300">
                                        {TIME_FORMATTER.format(vehicle.terminusEta * 1000)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
});

export default BusMarker;
