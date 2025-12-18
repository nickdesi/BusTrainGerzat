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
    headsign: string; // Terminus name (e.g., "Musée d'Art Roger Quilliot")
    bearing: number;
    delay: number;
    progress: number; // 0-1 progress along the route
    estimatedArrival: number;
    terminusEta: number; // Estimated arrival at terminus
}

const LINE_20_ROUTE_ID = '11821953316814877';


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
                                // FIX: Ignore trips that are too far in the future (e.g. > 30 mins)
                                // This prevents showing the entire day's schedule as "Live" buses
                                if (arrivalTime - now > 1800) break;

                                // FIX: For the very first stop, be stricter (e.g. > 10 mins)
                                // We don't want to show a bus waiting at terminus for 20 mins
                                const isFirstStop = stu.stopSequence === 1;
                                if (isFirstStop && (arrivalTime - now > 600)) break;

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
                        const progress = (nextStopUpdate.stopSequence ?? 0) / (tripUpdate.stopTimeUpdate?.length || 1);
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

                        // Snap to Route Logic
                        const snapToRoute = (lat: number, lon: number, shapePoints: number[][]) => {
                            let minDest = Infinity;
                            let bestLat = lat;
                            let bestLon = lon;
                            let bestBearing = 0;

                            for (let i = 0; i < shapePoints.length - 1; i++) {
                                const [p1Lat, p1Lon] = shapePoints[i];
                                const [p2Lat, p2Lon] = shapePoints[i + 1];

                                // Project point onto segment
                                const A = lat - p1Lat;
                                const B = lon - p1Lon;
                                const C = p2Lat - p1Lat;
                                const D = p2Lon - p1Lon;

                                const dot = A * C + B * D;
                                const lenSq = C * C + D * D;
                                let param = -1;
                                if (lenSq !== 0) param = dot / lenSq;

                                let xx, yy;

                                if (param < 0) {
                                    xx = p1Lat;
                                    yy = p1Lon;
                                } else if (param > 1) {
                                    xx = p2Lat;
                                    yy = p2Lon;
                                } else {
                                    xx = p1Lat + param * C;
                                    yy = p1Lon + param * D;
                                }

                                const dx = lat - xx;
                                const dy = lon - yy;
                                const dist = dx * dx + dy * dy;

                                if (dist < minDest) {
                                    minDest = dist;
                                    bestLat = xx;
                                    bestLon = yy;
                                    // Use segment bearing
                                    bestBearing = calculateBearing(p1Lat, p1Lon, p2Lat, p2Lon);
                                }
                            }
                            return { lat: bestLat, lon: bestLon, bearing: bestBearing };
                        };

                        // Initial linear interpolation
                        if (prevStopUpdate) {
                            const prevStopId = prevStopUpdate.stopId as string;
                            const prevStop = stopsById.get(prevStopId);
                            if (prevStop) {
                                const prevTime = Number(prevStopUpdate.departure?.time || prevStopUpdate.arrival?.time || 0);
                                const nextTime = Number(nextStopUpdate.arrival?.time || 0);

                                if (nextTime > prevTime) {
                                    const fraction = (now - prevTime) / (nextTime - prevTime);
                                    const clampedFraction = Math.max(0, Math.min(1, fraction));

                                    lat = prevStop.lat + (nextStop.lat - prevStop.lat) * clampedFraction;
                                    lon = prevStop.lon + (nextStop.lon - prevStop.lon) * clampedFraction;
                                }
                            }
                        }

                        // Apply Snap to Route if shape is available
                        const directionKey = `direction${nextStop.direction}` as keyof typeof line20Data.shapes;
                        const shape = line20Data.shapes[directionKey];

                        if (shape && Array.isArray(shape)) {
                            const snapped = snapToRoute(lat, lon, shape as number[][]);
                            lat = snapped.lat;
                            lon = snapped.lon;
                            bearing = snapped.bearing;
                        } else {
                            // Fallback bearing if no shape or snap failed
                            if (prevStopUpdate) {
                                const prevStopId = prevStopUpdate.stopId as string;
                                const prevStop = stopsById.get(prevStopId);
                                if (prevStop) {
                                    bearing = calculateBearing(prevStop.lat, prevStop.lon, nextStop.lat, nextStop.lon);
                                }
                            }
                        }

                        const delay = nextStopUpdate.arrival?.delay || nextStopUpdate.departure?.delay || 0;

                        // Get terminus info based on direction
                        const headsign = nextStop.direction === 0
                            ? "Musée d'Art Roger Quilliot"
                            : "GERZAT Champfleuri";

                        // Get terminus ETA (last stop in the trip)
                        const lastStopUpdate = stopTimeUpdates[stopTimeUpdates.length - 1];
                        const terminusEta = Number(lastStopUpdate?.arrival?.time || lastStopUpdate?.departure?.time || 0);

                        estimatedVehicles.push({
                            tripId: tripUpdate.trip.tripId as string,
                            lat,
                            lon,
                            direction: nextStop.direction,
                            nextStop: nextStopId,
                            nextStopName: nextStop.name,
                            headsign,
                            bearing,
                            delay: delay,
                            progress,
                            estimatedArrival: Number(nextStopUpdate.arrival?.time || 0),
                            terminusEta,
                        });
                    }
                });
            }
        } catch {
            // Failed to fetch trip updates - continue without estimated positions
        }

        return NextResponse.json({
            vehicles: estimatedVehicles,
            timestamp: now,
            count: estimatedVehicles.length,
            isEstimated: true, // Flag to indicate these are estimated positions
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to estimate vehicle positions' },
            { status: 500 }
        );
    }
}
