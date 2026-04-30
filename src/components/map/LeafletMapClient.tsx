'use client';

import { ReactNode, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

type Shape = [number, number][];

interface LeafletMapClientProps {
    center: [number, number];
    zoom: number;
    tileUrl: string;
    routeColor: string;
    primaryShape?: Shape;
    secondaryShape?: Shape;
    branchShapes?: Shape[];
    onZoomChange: (zoom: number) => void;
    children: ReactNode;
}

function MapResizeController() {
    const map = useMap();

    useEffect(() => {
        const resize = () => map.invalidateSize({ animate: false });
        const frame = window.requestAnimationFrame(resize);
        const timeout = window.setTimeout(resize, 250);

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timeout);
        };
    }, [map]);

    return null;
}

function ZoomController({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
    useMapEvents({
        zoomend: (event) => {
            onZoomChange(event.target.getZoom());
        },
    });

    return null;
}

export default function LeafletMapClient({
    center,
    zoom,
    tileUrl,
    routeColor,
    primaryShape,
    secondaryShape,
    branchShapes,
    onZoomChange,
    children,
}: LeafletMapClientProps) {
    return (
        <MapContainer
            center={center as LatLngExpression}
            zoom={zoom}
            className="h-full min-h-[420px] w-full"
            style={{ height: '100%', minHeight: '420px', width: '100%' }}
            scrollWheelZoom
            preferCanvas
        >
            <MapResizeController />
            <ZoomController onZoomChange={onZoomChange} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={tileUrl}
                zIndex={1}
            />

            {primaryShape && (
                <Polyline
                    positions={primaryShape}
                    color={routeColor}
                    weight={8}
                    opacity={0.92}
                />
            )}
            {secondaryShape && (
                <Polyline
                    positions={secondaryShape}
                    color={routeColor}
                    weight={8}
                    opacity={0.78}
                    dashArray="12, 10"
                />
            )}
            {branchShapes?.map((branch, index) => (
                <Polyline
                    key={`branch-${index}`}
                    positions={branch}
                    color={routeColor}
                    weight={6}
                    opacity={0.72}
                />
            ))}

            {children}
        </MapContainer>
    );
}
