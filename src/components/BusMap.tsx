'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLineE1Data, Stop } from '@/hooks/useLineE1Data';
import { useVehiclePositions, VehiclePosition } from '@/hooks/useVehiclePositions';
import { Loader2, Sun, Moon, AlertCircle, Info, X } from 'lucide-react';
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
    const [isDarkMode, setIsDarkMode] = useState(false); // Default to OSM classic (light)
    const [isLegendOpen, setIsLegendOpen] = useState(false); // Mobile legend toggle

    // Map tile URLs - OpenStreetMap classic as default
    // Map tile URLs - OpenStreetMap classic as default
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
            if (MAIN_TERMINI.includes(stop.stopName)) {
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

    const routeColor = lineData?.route?.routeColor ? `#${lineData.route.routeColor}` : '#fdc300';

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
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={isDarkMode
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
                />

                {/* Route shapes */}
                {lineData?.shapes['0'] && (
                    <Polyline
                        positions={lineData.shapes['0'] as [number, number][]}
                        color={routeColor}
                        weight={5}
                        opacity={0.8}
                    />
                )}
                {lineData?.shapes['1'] && (
                    <Polyline
                        positions={lineData.shapes['1'] as [number, number][]}
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

            {/* Legend - HUD Style - Responsive */}
            <div className="absolute top-20 right-4 z-[1001] flex flex-col items-end gap-2 pointer-events-none">
                {/* Mobile Toggle Button */}
                <button
                    onClick={() => setIsLegendOpen(!isLegendOpen)}
                    className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-xl border border-white/10 shadow-lg text-yellow-500 pointer-events-auto"
                    aria-label={isLegendOpen ? "Masquer la légende" : "Afficher la légende"}
                >
                    <Info className="w-5 h-5" />
                </button>

                {/* Legend Content */}
                <div className={`
                    w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl transition-all duration-300 origin-top-right
                    ${isLegendOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none md:opacity-100 md:scale-100 md:translate-y-0 md:pointer-events-auto'}
                `}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-display uppercase tracking-widest text-yellow-500">STATUT LIGNE</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors"
                                aria-label={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                            >
                                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-yellow-500" /> : <Moon className="w-3.5 h-3.5 text-gray-400" />}
                            </button>
                            {/* Mobile Close Button */}
                            <button
                                onClick={() => setIsLegendOpen(false)}
                                className="md:hidden w-10 h-10 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors text-gray-400 border border-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-white/5">
                                <span className="font-bold text-yellow-500">{lineData?.route?.routeShortName}</span>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-gray-500 font-mono tracking-wider">Ligne Actuelle</div>
                                <div className="text-sm font-bold text-white leading-none">T2C {lineData?.route?.routeShortName}</div>
                            </div>
                        </div>

                        <div className="h-px bg-white/10 w-full"></div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-sm bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                <span className="text-xs text-gray-400 uppercase tracking-wide">Vers Gerzat Champfleuri</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-sm bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                <span className="text-xs text-gray-400 uppercase tracking-wide">Vers Aubière / Romagnat</span>
                            </div>
                        </div>

                        <div className="h-px bg-white/10 w-full"></div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="px-2 py-1.5 rounded border border-white/5 bg-white/5 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                <span className="text-[10px] uppercase text-gray-400">Normal</span>
                            </div>
                            <div className="px-2 py-1.5 rounded border border-white/5 bg-white/5 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-[10px] uppercase text-gray-400">Retard</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty state overlay */}
            {!vehiclesLoading && vehicleData?.count === 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
                    <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-lg">
                        <span className="text-gray-400 text-sm">Pas de bus en circulation actuellement</span>
                    </div>
                </div>
            )}

            {/* Status indicator - HUD Style */}
            <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
                <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg pointer-events-auto">
                    <div className={`relative flex h-3 w-3`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFetching ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isFetching ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold font-display uppercase text-gray-400 leading-none tracking-wider">EN DIRECT</span>
                        <span className="text-xs font-bold text-white leading-none">
                            {vehiclesLoading ? 'Chargement...' : `${vehicleData?.count || 0} bus`}
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
}
