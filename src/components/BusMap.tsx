'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLine20Data, Stop } from '@/hooks/useLine20Data';
import { useVehiclePositions, VehiclePosition } from '@/hooks/useVehiclePositions';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import StopMarker from './StopMarker';
import BusMarker from './BusMarker';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Polyline = dynamic(
    () => import('react-leaflet').then((mod) => mod.Polyline),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);
const CircleMarker = dynamic(
    () => import('react-leaflet').then((mod) => mod.CircleMarker),
    { ssr: false }
);

// Zoom handler component
const ZoomHandler = ({ setZoom }: { setZoom: (z: number) => void }) => {
    const { useMapEvents } = require('react-leaflet');
    useMapEvents({
        zoomend: (e: any) => {
            setZoom(e.target.getZoom());
        },
    });
    return null;
};

// Center of the Line 20 route (approximately)
const MAP_CENTER: [number, number] = [45.81, 3.135];
const MAP_ZOOM = 13;

interface BusMapProps {
    showStops?: boolean;
}

export default function BusMap({ showStops = true }: BusMapProps) {
    const { data: lineData, isLoading: lineLoading, error: lineError } = useLine20Data();
    const { data: vehicleData, isLoading: vehiclesLoading, isFetching } = useVehiclePositions();
    const [currentZoom, setCurrentZoom] = useState(MAP_ZOOM);

    // Leaflet CSS is imported in globals.css



    // Identify terminus stops (first and last in each direction)
    const terminusStopIds = useMemo(() => {
        if (!lineData) return new Set<string>();
        const ids = new Set<string>();

        // Find min and max sequence for each direction
        const dir0Stops = lineData.stops.filter(s => s.direction === 0);
        const dir1Stops = lineData.stops.filter(s => s.direction === 1);

        if (dir0Stops.length > 0) {
            const minSeq = Math.min(...dir0Stops.map(s => s.sequence));
            const maxSeq = Math.max(...dir0Stops.map(s => s.sequence));
            dir0Stops.filter(s => s.sequence === minSeq || s.sequence === maxSeq)
                .forEach(s => ids.add(s.stopId));
        }
        if (dir1Stops.length > 0) {
            const minSeq = Math.min(...dir1Stops.map(s => s.sequence));
            const maxSeq = Math.max(...dir1Stops.map(s => s.sequence));
            dir1Stops.filter(s => s.sequence === minSeq || s.sequence === maxSeq)
                .forEach(s => ids.add(s.stopId));
        }

        return ids;
    }, [lineData]);

    // Deduplicate stops by position (some stops are duplicated for both directions)
    const uniqueStops = useMemo(() => {
        if (!lineData) return [];
        const seen = new Map<string, Stop>();
        lineData.stops.forEach(stop => {
            const key = `${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`;
            if (!seen.has(key)) {
                seen.set(key, stop);
            }
        });
        return Array.from(seen.values());
    }, [lineData]);

    if (lineLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
                    <p className="text-gray-400">Chargement de la carte...</p>
                </div>
            </div>
        );
    }

    if (lineError) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="text-center text-red-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                    <p>Erreur lors du chargement des données</p>
                </div>
            </div>
        );
    }

    const routeColor = lineData?.routeColor ? `#${lineData.routeColor}` : '#8dc63f';

    return (
        <div className="relative h-full w-full">
            {/* Map Container */}
            <MapContainer
                center={MAP_CENTER}
                zoom={MAP_ZOOM}
                className="h-full w-full z-0"
                scrollWheelZoom={true}
            >
                <ZoomHandler setZoom={setCurrentZoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Route shapes */}
                {lineData?.shapes.direction0 && (
                    <Polyline
                        positions={lineData.shapes.direction0 as [number, number][]}
                        color={routeColor}
                        weight={5}
                        opacity={0.8}
                    />
                )}
                {lineData?.shapes.direction1 && (
                    <Polyline
                        positions={lineData.shapes.direction1 as [number, number][]}
                        color={routeColor}
                        weight={5}
                        opacity={0.8}
                        dashArray="10, 10"
                    />
                )}

                {/* Stop markers - Only show standard stops when zoomed in */}
                {showStops && uniqueStops.map((stop) => {
                    const isTerminus = terminusStopIds.has(stop.stopId);

                    // Show standard stops only if zoomed in enough (> 13)
                    // Always show terminus
                    if (!isTerminus && currentZoom < 14) return null;

                    return (
                        <StopMarker
                            key={stop.stopId}
                            stop={stop}
                            isTerminus={isTerminus}
                            routeColor={routeColor}
                        />
                    );
                })}

                {/* Vehicle markers */}
                {vehicleData?.vehicles.map((vehicle: VehiclePosition) => (
                    <BusMarker key={vehicle.tripId} vehicle={vehicle} />
                ))}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 z-[1000] border border-gray-700">
                <div className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: routeColor }} />
                    Ligne {lineData?.routeName}
                </div>
                <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 rounded" style={{ backgroundColor: routeColor }}></div>
                        <span className="text-gray-300">Direction Aller</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 rounded border-dashed border-t-2" style={{ borderColor: routeColor }}></div>
                        <span className="text-gray-300">Direction Retour</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-white border-2" style={{ borderColor: routeColor }}></div>
                        <span className="text-gray-300">Arrêt</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🚌</span>
                        <span className="text-gray-300">Bus en circulation</span>
                    </div>
                </div>
            </div>

            {/* Status indicator */}
            <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 z-[1000] border border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${isFetching ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-gray-300">
                        {vehiclesLoading ? 'Chargement...' : `${vehicleData?.count || 0} bus en ligne`}
                    </span>
                </div>
            </div>
        </div>
    );
}
