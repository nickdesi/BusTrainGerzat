import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { NextResponse } from 'next/server';
import line20Data from '../../../../public/data/line20_data.json';

export const dynamic = 'force-dynamic';

interface EstimatedVehicle {
    tripId: string;
    lat: number;
    lon: number;
    direction: number;
    nextStop: string;
    nextStopName: string;
    bearing: number;
    delay: number;
    progress: number; // 0-1 progress along the route
    estimatedArrival: number;
}

const LINE_20_ROUTE_ID = '11821953316814877';
const GERZAT_STOP_ID = '3377704015495667';

export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);
        const estimatedVehicles: EstimatedVehicle[] = [];

        // Fetch trip updates to see which trips are currently active
        try {
            const response = await fetch(
                'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update',
                { cache: 'no-store' }
            );

            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
                    new Uint8Array(buffer)
                );

                // Get stops data for mapping
                const stopsById = new Map(
                    line20Data.stops.map(s => [s.stopId, s])
                );

                // Process each trip update
                feed.entity.forEach((entity) => {
                    if (entity.tripUpdate) {
                        const tripUpdate = entity.tripUpdate;

                        // Only process Line 20 trips
                        if (tripUpdate.trip.routeId !== LINE_20_ROUTE_ID) return;

                        // Check for trip-level cancellation
                        if (tripUpdate.trip.scheduleRelationship === 3) return; // CANCELED

                        const stopTimeUpdates = tripUpdate.stopTimeUpdate || [];
                        if (stopTimeUpdates.length === 0) return;

                        // Find the next stop (first stop with arrival time in the future)
                        let currentStopIndex = -1;
                        let nextStopUpdate = null;
                        let prevStopUpdate = null;

                        for (let i = 0; i < stopTimeUpdates.length; i++) {
                            const stu = stopTimeUpdates[i];
                            const arrivalTime = Number(stu.arrival?.time || stu.departure?.time || 0);

                            if (arrivalTime > now) {
                                currentStopIndex = i;
                                nextStopUpdate = stu;
                                if (i > 0) {
                                    prevStopUpdate = stopTimeUpdates[i - 1];
                                }
                                break;
                            }
                        }

                        // If no future stop, the trip is completed
                        if (!nextStopUpdate) return;

                        const nextStopId = nextStopUpdate.stopId as string;
                        const nextStop = stopsById.get(nextStopId);
                        if (!nextStop) return;

                        // Calculate estimated position
                        let lat = nextStop.lat;
                        let lon = nextStop.lon;
                        let progress = currentStopIndex / stopTimeUpdates.length;
                        let bearing = 0;

                        // Calculate bearing function
                        const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                            const toRad = (n: number) => (n * Math.PI) / 180;
                            const toDeg = (n: number) => (n * 180) / Math.PI;

                            const dLon = toRad(lon2 - lon1);
                            const y = Math.sin(dLon) * Math.cos(toRad(lat2));
                            const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
                                Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

                            return (toDeg(Math.atan2(y, x)) + 360) % 360;
                        };

                        // If we have a previous stop, interpolate position
                        if (prevStopUpdate) {
                            const prevStopId = prevStopUpdate.stopId as string;
                            const prevStop = stopsById.get(prevStopId);
                            if (prevStop) {
                                const prevTime = Number(prevStopUpdate.departure?.time || prevStopUpdate.arrival?.time || 0);
                                const nextTime = Number(nextStopUpdate.arrival?.time || 0);

                                // Calculate bearing between stops regardless of progress to establish direction
                                bearing = calculateBearing(prevStop.lat, prevStop.lon, nextStop.lat, nextStop.lon);

                                if (nextTime > prevTime) {
                                    const fraction = (now - prevTime) / (nextTime - prevTime);
                                    const clampedFraction = Math.max(0, Math.min(1, fraction));

                                    lat = prevStop.lat + (nextStop.lat - prevStop.lat) * clampedFraction;
                                    lon = prevStop.lon + (nextStop.lon - prevStop.lon) * clampedFraction;
                                }
                            }
                        }

                        const delay = nextStopUpdate.arrival?.delay || nextStopUpdate.departure?.delay || 0;

                        estimatedVehicles.push({
                            tripId: tripUpdate.trip.tripId as string,
                            lat,
                            lon,
                            direction: nextStop.direction,
                            nextStop: nextStopId,
                            nextStopName: nextStop.name,
                            bearing,
                            delay: delay,
                            progress,
                            estimatedArrival: Number(nextStopUpdate.arrival?.time || 0),
                        });
                    }
                });
            }
        } catch (e) {
            console.error('Failed to fetch trip updates for vehicle estimation:', e);
        }

        return NextResponse.json({
            vehicles: estimatedVehicles,
            timestamp: now,
            count: estimatedVehicles.length,
            isEstimated: true, // Flag to indicate these are estimated positions
        });
    } catch (error) {
        console.error('Error in vehicles API route:', error);
        return NextResponse.json(
            { error: 'Failed to estimate vehicle positions' },
            { status: 500 }
        );
    }
}
