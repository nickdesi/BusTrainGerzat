'use client';

import { ReactNode, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
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

function useIsMobileMap() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(max-width: 640px), (pointer: coarse)');
        const update = () => setIsMobile(query.matches);

        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return isMobile;
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
    const routeGlow = `${routeColor}55`;
    const isMobileMap = useIsMobileMap();
    const pathSmoothFactor = isMobileMap ? 3.5 : 1;

    return (
        <MapContainer
            center={center as LatLngExpression}
            zoom={zoom}
            className="transit-map h-full min-h-[420px] w-full"
            style={{ height: '100%', minHeight: '420px', width: '100%' }}
            scrollWheelZoom
            preferCanvas
            zoomControl={false}
            zoomAnimation={!isMobileMap}
            markerZoomAnimation={!isMobileMap}
            fadeAnimation={!isMobileMap}
        >
            <MapResizeController />
            <ZoomController onZoomChange={onZoomChange} />
            <ZoomControl position="bottomleft" />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url={tileUrl}
                zIndex={1}
                updateWhenIdle
                keepBuffer={3}
            />

            {secondaryShape && (
                <Polyline
                    positions={secondaryShape}
                    color={routeColor}
                    weight={isMobileMap ? 4 : 5}
                    opacity={0.42}
                    lineCap="round"
                    lineJoin="round"
                    smoothFactor={pathSmoothFactor}
                />
            )}

            {primaryShape && (
                <>
                    {!isMobileMap && (
                        <>
                            <Polyline
                                positions={primaryShape}
                                color="#020617"
                                weight={14}
                                opacity={0.7}
                                lineCap="round"
                                lineJoin="round"
                                smoothFactor={pathSmoothFactor}
                            />
                            <Polyline
                                positions={primaryShape}
                                color={routeGlow}
                                weight={11}
                                opacity={0.55}
                                lineCap="round"
                                lineJoin="round"
                                smoothFactor={pathSmoothFactor}
                            />
                        </>
                    )}
                    <Polyline
                        positions={primaryShape}
                        color={routeColor}
                        weight={isMobileMap ? 5 : 6}
                        opacity={0.98}
                        lineCap="round"
                        lineJoin="round"
                        smoothFactor={pathSmoothFactor}
                    />
                </>
            )}
            {branchShapes?.map((branch, index) => (
                <Polyline
                    key={`branch-${index}`}
                    positions={branch}
                    color={routeColor}
                    weight={isMobileMap ? 3 : 4}
                    opacity={0.7}
                    lineCap="round"
                    lineJoin="round"
                    smoothFactor={pathSmoothFactor}
                />
            ))}

            {children}
        </MapContainer>
    );
}
