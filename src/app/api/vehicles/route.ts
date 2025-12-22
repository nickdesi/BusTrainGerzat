import staticSchedule from '@/data/static_schedule.json';

// Simple types for static schedule lookup
interface StaticScheduleItem {
    tripId: string;
    stopId?: string;
    arrival: number;
}

// ... existing code ...

const delay = nextStopUpdate.arrival?.delay || nextStopUpdate.departure?.delay || 0;

// FIX: Strict Delay Calculation for Live Map
// If API reports 0 delay, cross-check with static schedule
if (delay === 0) {
    const currentStopId = nextStopId;
    // Find matching static entry
    const staticEntry = (staticSchedule as StaticScheduleItem[]).find(s =>
        s.tripId === tripUpdate.trip.tripId && s.stopId === currentStopId
    );

    if (staticEntry) {
        const estimatedArrival = Number(nextStopUpdate.arrival?.time || 0);
        if (estimatedArrival > 0) {
            const calculatedDelay = estimatedArrival - staticEntry.arrival;
            // If difference is significant (> 60s), use calculated delay
            if (Math.abs(calculatedDelay) >= 60) {
                // We can't easily mutate 'const delay', so we'll use the calculated value in the push
                // or better, just mute the variable above if possible? 
                // calculatedDelay will be used below.
            }
        }
    }
}

export const dynamic = 'force-dynamic';

interface EstimatedVehicle {
    tripId: string;
    lat: number;
    lon: number;
    direction: number;
    nextStop: string;
    nextStopName: string;
    headsign: string; // Terminus name (e.g., "AUBIÈRE Pl. des Ramacles")
    bearing: number;
    delay: number;
    progress: number; // 0-1 progress along the route
    estimatedArrival: number;
    terminusEta: number; // Estimated arrival at terminus
}

const LINE_E1_ROUTE_ID = '3'; // Line E1 (formerly Line 20)

// Simple in-memory cache
interface VehicleCacheData {
    vehicles: EstimatedVehicle[];
    timestamp: number;
    count: number;
    isEstimated: boolean;
}

let vehicleCache: {
    data: VehicleCacheData;
    timestamp: number;
} | null = null;
const CACHE_DURATION = 5000; // 5 seconds

export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);

        // Return cached data if valid
        if (vehicleCache && (Date.now() - vehicleCache.timestamp < CACHE_DURATION)) {
            return NextResponse.json({
                ...vehicleCache.data,
                timestamp: now, // Update timestamp to show liveness
                cached: true
            });
        }

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
                    lineE1Data.stops.map(s => [s.stopId, s])
                );

                // Process each trip update
                feed.entity.forEach((entity) => {
                    if (entity.tripUpdate) {
                        const tripUpdate = entity.tripUpdate;

                        // Only process Line E1 trips
                        if (tripUpdate.trip.routeId !== LINE_E1_ROUTE_ID) return;

                        // Check for trip-level cancellation
                        const stopTimeUpdates = tripUpdate.stopTimeUpdate || [];
                        if (stopTimeUpdates.length === 0) return;

                        // Check for trip-level cancellation
                        if (tripUpdate.trip.scheduleRelationship === 3) { // CANCELED
                            // Ghost Cancellation Check:
                            // If we have valid updates (not SKIPPED) and enough stops, treat as ACTIVE
                            const hasValidUpdates = stopTimeUpdates.some(s => s.scheduleRelationship !== 1);
                            if (!hasValidUpdates || stopTimeUpdates.length < 5) {
                                return; // Confirm cancellation
                            }
                        }

                        // Find the next stop (first stop with arrival time in the future)
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

                                // Variable `i` is used for prevStopUpdate, no need for separate index
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
                        let nextStop = stopsById.get(nextStopId);

                        // Fallback: If stop ID not found (e.g. Added Trip with different IDs),
                        // try to map by sequence using canonical stops
                        if (!nextStop) {
                            const directionId = tripUpdate.trip.directionId ?? 0;
                            const currentSeq = nextStopUpdate.stopSequence;

                            // Check if lineE1Data has canonicalStops (added via script)
                            // @ts-ignore
                            const canonicalStops = lineE1Data.canonicalStops as Record<string, string[]> | undefined;

                            if (canonicalStops) {
                                const canonicalList = canonicalStops[String(directionId)];
                                if (canonicalList && currentSeq && currentSeq <= canonicalList.length) {
                                    // Sequence is 1-based usually
                                    const mappedId = canonicalList[currentSeq - 1]; // Try exact match
                                    if (mappedId) {
                                        nextStop = stopsById.get(mappedId);
                                    }
                                }
                            }
                        }

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

                        // Apply Snap to Route using Trip Direction
                        // Use directionId from the trip update (reliable per recent audit)
                        const directionId = tripUpdate.trip.directionId ?? 0;
                        const directionKey = String(directionId) as keyof typeof lineE1Data.shapes;


                        const shape = lineE1Data.shapes[directionKey];

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

                        let delay = nextStopUpdate.arrival?.delay || nextStopUpdate.departure?.delay || 0;

                        // FIX: Strict Delay Calculation for Live Map
                        // If API reports 0 delay, cross-check with static schedule to detect hidden delays
                        if (delay === 0) {
                            const tm = Number(nextStopUpdate.arrival?.time || 0);
                            if (tm > 0) {
                                // Find matching static entry
                                const staticEntry = (staticSchedule as StaticScheduleItem[]).find(s =>
                                    s.tripId === tripUpdate.trip.tripId && s.stopId === nextStopId
                                );
                                if (staticEntry) {
                                    const diff = tm - staticEntry.arrival;
                                    if (Math.abs(diff) >= 60) {
                                        delay = diff;
                                    }
                                }
                            }
                        }

                        // Get terminus ETA (last stop in the trip)
                        const lastStopUpdate = stopTimeUpdates[stopTimeUpdates.length - 1];
                        const lastStopId = lastStopUpdate?.stopId as string;
                        const lastStopInfo = stopsById.get(lastStopId);
                        const terminusEta = Number(lastStopUpdate?.arrival?.time || lastStopUpdate?.departure?.time || 0);

                        let headsign = directionId === 0
                            ? "AUBIÈRE Pl. des Ramacles"
                            : "GERZAT Champfleuri";

                        // Use actual last stop name if available (handles partial trips like "Les Vignes")
                        if (lastStopInfo?.stopName) {
                            headsign = lastStopInfo.stopName;
                        }

                        estimatedVehicles.push({
                            tripId: tripUpdate.trip.tripId as string,
                            lat,
                            lon,
                            direction: directionId,
                            nextStop: nextStopId,
                            nextStopName: nextStop.stopName,
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

        const responseData = {
            vehicles: estimatedVehicles,
            timestamp: now,
            count: estimatedVehicles.length,
            isEstimated: true,
        };

        // Update cache
        vehicleCache = {
            data: responseData,
            timestamp: Date.now()
        };

        return NextResponse.json(responseData);
    } catch {
        return NextResponse.json(
            { error: 'Failed to estimate vehicle positions' },
            { status: 500 }
        );
    }
}
