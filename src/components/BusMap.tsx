'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLineE1Data, Stop } from '@/hooks/useLineE1Data';
import { useVehiclePositions, VehiclePosition } from '@/hooks/useVehiclePositions';
import { AlertCircle } from 'lucide-react';
import StopMarker from './StopMarker';
import BusMarker from './BusMarker';
import MapLegend from './map/MapLegend';
import MapStatus from './map/MapStatus';
import MapEmptyState from './map/MapEmptyState';
import BusMapSkeleton from './BusMapSkeleton';

const LeafletMapClient = dynamic(() => import('./map/LeafletMapClient'), {
    ssr: false,
    loading: () => <BusMapSkeleton />,
});

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
    const [routeDirection, setRouteDirection] = useState<'all' | '0' | '1'>('all');

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

    // Calculate distance between two coordinates in meters (Haversine formula)
    const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Deduplicate stops only if they have same name AND are very close (< 5m)
    // Keep both stops if they're on opposite sides of the road (> 5m apart)
    const uniqueStops = useMemo(() => {
        if (!lineData) return [];
        const result: Stop[] = [];
        const seenByName = new Map<string, Stop[]>();

        // Group stops by name
        lineData.stops.forEach(stop => {
            const existing = seenByName.get(stop.stopName) || [];
            existing.push(stop);
            seenByName.set(stop.stopName, existing);
        });

        // For each name, keep unique positions (> 5m apart)
        seenByName.forEach(stops => {
            stops.forEach(stop => {
                // Check if we already added a stop at nearly the same position
                const isDuplicate = result.some(existing =>
                    existing.stopName === stop.stopName &&
                    getDistanceMeters(existing.lat, existing.lon, stop.lat, stop.lon) < 5
                );
                if (!isDuplicate) {
                    result.push(stop);
                }
            });
        });

        return result;
    }, [lineData]);

    // Vehicle markers with collision detection
    const vehicleMarkers = useMemo(() => {
        const selectedVehicles = routeDirection === 'all'
            ? (vehicleData?.vehicles || [])
            : (vehicleData?.vehicles || []).filter(vehicle => String(vehicle.direction) === routeDirection);
        const sortedVehicles = [...selectedVehicles].sort((a, b) => a.lat - b.lat || a.lon - b.lon);
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
    }, [routeDirection, vehicleData?.vehicles]);

    const routeColor = lineData?.route?.routeColor ? `#${lineData.route.routeColor}` : '#fdc300';
    const direction0Shape = lineData?.shapes['0'] as [number, number][] | undefined;
    const direction1Shape = lineData?.shapes['1'] as [number, number][] | undefined;
    const visiblePrimaryShape = routeDirection === '1' ? direction1Shape : direction0Shape;
    const visibleSecondaryShape = routeDirection === 'all' ? direction1Shape : undefined;
    const visibleBranchShapes = routeDirection === 'all' ? lineData?.shapes.branches : undefined;
    const tileUrl = isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    if (lineLoading) {
        return <BusMapSkeleton />;
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

    return (
        <div className="relative h-full min-h-[min(72dvh,720px)] w-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950 shadow-[0_28px_90px_rgba(0,0,0,0.45)] ring-1 ring-white/5 md:min-h-[420px] md:rounded-[2rem]">
            <div className="pointer-events-none absolute inset-0 z-[var(--z-ui-base)] bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.20),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.16),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.18),transparent_36%,rgba(2,6,23,0.34))]" />
            <div className="pointer-events-none absolute inset-0 z-[var(--z-ui-base)] bg-noise opacity-35 mix-blend-soft-light" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[calc(var(--z-ui-base)+1)] h-16 bg-gradient-to-b from-slate-950/70 to-transparent md:h-24" />
            <div className="pointer-events-none absolute left-4 top-20 z-[calc(var(--z-modal)+1)] hidden rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 shadow-lg shadow-black/30 backdrop-blur-xl md:block">
                <span className="font-display text-[10px] font-black uppercase tracking-[0.28em] text-white/80">Carte temps réel</span>
            </div>

            <LeafletMapClient
                center={MAP_CENTER}
                zoom={MAP_ZOOM}
                tileUrl={tileUrl}
                routeColor={routeColor}
                primaryShape={visiblePrimaryShape}
                secondaryShape={visibleSecondaryShape}
                branchShapes={visibleBranchShapes}
                onZoomChange={setCurrentZoom}
            >
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
            </LeafletMapClient>

            {/* Legend - HUD Style - Responsive */}
            <MapLegend
                lineData={lineData}
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                isLegendOpen={isLegendOpen}
                setIsLegendOpen={setIsLegendOpen}
                routeDirection={routeDirection}
                setRouteDirection={setRouteDirection}
            />

            {/* Empty state overlay */}
            <MapEmptyState
                isLoading={vehiclesLoading}
                vehicleCount={vehicleData?.count}
            />

            {/* Status indicator - HUD Style */}
            <MapStatus
                isLoading={vehiclesLoading}
                vehicleCount={vehicleData?.count || 0}
                isFetching={isFetching}
            />

        </div>
    );
}
