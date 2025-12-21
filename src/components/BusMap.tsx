'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLineE1Data, Stop } from '@/hooks/useLineE1Data';
import { useVehiclePositions, VehiclePosition } from '@/hooks/useVehiclePositions';
import { Loader2, MapPin, AlertCircle, Sun, Moon } from 'lucide-react';
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

// Zoom handler component - using useMapEvents hook
const ZoomHandlerComponent = dynamic(
    () => import('react-leaflet').then((mod) => {
        const { useMapEvents } = mod;
         
        return function ZoomHandler({ setZoom }: { setZoom: (z: number) => void }) {
            useMapEvents({
                zoomend: (e) => {
                    setZoom(e.target.getZoom());
                },
            });
            return null;
        };
    }),
    { ssr: false }
);

// Center of the Line E1 route (approximately)
const MAP_CENTER: [number, number] = [45.78, 3.10]; // Centered between Gerzat and Romagnat
const MAP_ZOOM = 12;

interface BusMapProps {
    showStops?: boolean;
}

export default function BusMap({ showStops = true }: BusMapProps) {
    const { data: lineData, isLoading: lineLoading, error: lineError } = useLineE1Data();
    const { data: vehicleData, isLoading: vehiclesLoading, isFetching } = useVehiclePositions();
    const [currentZoom, setCurrentZoom] = useState(MAP_ZOOM);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Map tile URLs
    const TILE_URLS = {
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    };

    // Leaflet CSS is imported in globals.css



    // Identify terminus stops (only main termini)
    const terminusStopIds = useMemo(() => {
        if (!lineData) return new Set<string>();
        const ids = new Set<string>();

        const MAIN_TERMINI = [
            'GERZAT Champfleuri',
            "ROMAGNAT La Gazelle",
            "AUBIÈRE Pl. des Ramacles"
        ];

        lineData.stops.forEach(stop => {
            if (MAIN_TERMINI.includes(stop.name)) {
                ids.add(stop.stopId);
            }
        });

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

    // Vehicle markers with collision detection
    const vehicleMarkers = useMemo(() => {
        const sortedVehicles = [...(vehicleData?.vehicles || [])].sort((a, b) => a.lat - b.lat || a.lon - b.lon);
        const positions = new Map<string, number>();

        return sortedVehicles.map((vehicle: VehiclePosition) => {
            const key = `${vehicle.lat}-${vehicle.lon}`;
            const count = positions.get(key) || 0;
            positions.set(key, count + 1);

            // If multiple buses are at the exact same spot, apply a small offset
            // 0.0001 degrees is roughly 11 meters
            let displayLat = vehicle.lat;
            let displayLon = vehicle.lon;

            if (count > 0) {
                // Circular offset pattern (0°, 90°, 180°, 270°) for even distribution
                const angle = (count * 90) * Math.PI / 180;
                const offset = 0.00012; // ~13m offset
                displayLat += offset * Math.cos(angle);
                displayLon += offset * Math.sin(angle);
            }

            // Create a modified vehicle object for display
            const displayVehicle = {
                ...vehicle,
                lat: displayLat,
                lon: displayLon
            };

            return <BusMarker key={vehicle.tripId} vehicle={displayVehicle} />;
        });
    }, [vehicleData?.vehicles]);

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

    const routeColor = lineData?.routeColor ? `#${lineData.routeColor}` : '#fdc300';

    return (
        <div className="relative h-full w-full">
            {/* Map Container */}
            <MapContainer
                center={MAP_CENTER}
                zoom={MAP_ZOOM}
                className="h-full w-full z-0"
                scrollWheelZoom={true}
            >
                <ZoomHandlerComponent setZoom={setCurrentZoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url={isDarkMode ? TILE_URLS.dark : TILE_URLS.light}
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
                {/* Additional branch shapes (if any) */}
                {lineData?.shapes.branches?.map((branch: [number, number][], index: number) => (
                    <Polyline
                        key={`branch-${index}`}
                        positions={branch}
                        color={routeColor}
                        weight={4}
                        opacity={0.6}
                    />
                ))}

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

                {/* Vehicle markers with collision detection */}
                {vehicleMarkers}
            </MapContainer>

            {/* Legend */}
            <div className="absolute top-16 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 z-[1001] border border-gray-700">
                <div className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: routeColor }} />
                    Ligne {lineData?.routeName}
                </div>
                <div className="space-y-1 text-xs">
                    {/* Direction colors */}
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-300">Vers Gerzat</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-300">Vers Aubière/Romagnat</span>
                    </div>
                    <div className="h-px bg-gray-700 my-1.5"></div>
                    {/* Delay status */}
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500/50 animate-pulse"></div>
                        <span className="text-gray-300">À l&apos;heure</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500/60 animate-pulse"></div>
                        <span className="text-gray-300">Retard 5-10 min</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/70 animate-pulse"></div>
                        <span className="text-gray-300">Retard &gt;10 min</span>
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

            {/* Theme Toggle */}
            <div className="absolute top-64 right-4 z-[1001]">
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 text-white hover:bg-gray-800 transition-colors"
                    aria-label={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
}
