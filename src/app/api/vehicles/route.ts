import { NextResponse } from 'next/server';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import lineE1Data from '../../../../public/data/lineE1_data.json';
import e1StopTimes from '../../../../public/data/e1_stop_times.json';

export const dynamic = 'force-dynamic';

const LINE_E1_ROUTE_ID = '3';

interface EstimatedVehicle {
    tripId: string;
    lat: number;
    lon: number;
    direction: number;
    nextStop: string;
    nextStopName: string;
    headsign: string;
    bearing: number;
    delay: number;
    progress: number;
    estimatedArrival: number;
    terminusEta: number;
    origin: string;
    isRealtime: boolean; // New field to indicate if position is from GPS
}

interface StaticTrip {
    tripId: string;
    headsign: string;
    direction: number;
    stops: { stopId: string; sequence: number; arrivalTime: number; departureTime: number }[];
}

interface RTVehiclePosition {
    tripId: string;
    lat: number;
    lon: number;
    bearing: number;
    timestamp: number;
}

interface RTTripUpdate {
    tripId: string;
    delay: number;
    stopUpdates: Map<string, { predictedTime: number; delay: number }>;
}

const stopsById = new Map(lineE1Data.stops.map(s => [s.stopId, s]));
const staticTripsById = new Map((e1StopTimes as StaticTrip[]).map(t => [t.tripId, t]));

/**
 * Convert seconds-from-midnight (Paris time) to Unix timestamp for today
 */
function secondsToUnix(secondsFromMidnight: number): number {
    const now = new Date();
    const parisDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    const [, month] = parisDateStr.split('-').map(Number);
    const isDST = month >= 4 && month <= 10;
    const offset = isDST ? '+02:00' : '+01:00';
    const correctMidnight = new Date(`${parisDateStr}T00:00:00${offset}`);
    return Math.floor(correctMidnight.getTime() / 1000) + secondsFromMidnight;
}

/**
 * Interpolate position between two stops based on progress
 */
function interpolatePosition(
    prevStop: { lat: number; lon: number },
    nextStop: { lat: number; lon: number },
    progress: number
): { lat: number; lon: number } {
    return {
        lat: prevStop.lat + (nextStop.lat - prevStop.lat) * progress,
        lon: prevStop.lon + (nextStop.lon - prevStop.lon) * progress
    };
}

/**
 * Calculate bearing between two points
 */
function calculateBearing(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
    const toRad = Math.PI / 180;
    const dLon = (to.lon - from.lon) * toRad;
    const lat1 = from.lat * toRad;
    const lat2 = to.lat * toRad;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

/**
 * Fetch GTFS-RT Vehicle Positions
 */
async function fetchRTVehiclePositions(): Promise<Map<string, RTVehiclePosition>> {
    const positions = new Map<string, RTVehiclePosition>();
    try {
        const response = await fetch(
            'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-vehicle-position',
            { cache: 'no-store' }
        );
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

            for (const entity of feed.entity) {
                if (entity.vehicle && entity.vehicle.trip?.routeId === LINE_E1_ROUTE_ID) {
                    const v = entity.vehicle;
                    const tripId = v.trip?.tripId;
                    if (tripId && v.position) {
                        positions.set(tripId, {
                            tripId,
                            lat: v.position.latitude,
                            lon: v.position.longitude,
                            bearing: v.position.bearing || 0,
                            timestamp: Number(v.timestamp) || 0
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('RT vehicle positions fetch failed:', e);
    }
    return positions;
}

/**
 * Fetch GTFS-RT Trip Updates (for delays)
 */
async function fetchRTTripUpdates(): Promise<Map<string, RTTripUpdate>> {
    const updates = new Map<string, RTTripUpdate>();
    try {
        const response = await fetch(
            'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update',
            { cache: 'no-store' }
        );
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

            for (const entity of feed.entity) {
                if (entity.tripUpdate && entity.tripUpdate.trip?.routeId === LINE_E1_ROUTE_ID) {
                    const tu = entity.tripUpdate;
                    const tripId = tu.trip.tripId;
                    if (!tripId) continue;

                    const stopUpdates = new Map<string, { predictedTime: number; delay: number }>();
                    let tripDelay = 0;

                    for (const stu of tu.stopTimeUpdate || []) {
                        const stopId = stu.stopId as string;
                        const predictedTime = Number(stu.arrival?.time || stu.departure?.time || 0);
                        const delay = Number(stu.arrival?.delay || stu.departure?.delay || 0);

                        if (predictedTime > 0) {
                            stopUpdates.set(stopId, { predictedTime, delay });
                            tripDelay = delay; // Use last known delay
                        }
                    }

                    if (stopUpdates.size > 0) {
                        updates.set(tripId, { tripId, delay: tripDelay, stopUpdates });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('RT trip updates fetch failed:', e);
    }
    return updates;
}

export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);
        const vehicles: EstimatedVehicle[] = [];

        // Fetch GTFS-RT data in parallel
        const [rtPositions, rtUpdates] = await Promise.all([
            fetchRTVehiclePositions(),
            fetchRTTripUpdates()
        ]);

        const processedTripIds = new Set<string>();

        // PRIORITY 1: Use actual GPS positions from GTFS-RT
        for (const [tripId, rtPos] of rtPositions) {
            const staticTrip = staticTripsById.get(tripId);
            if (!staticTrip) continue;

            processedTripIds.add(tripId);
            const rtUpdate = rtUpdates.get(tripId);

            // Find next stop based on predicted times
            let nextStopIdx = 0;
            for (let i = 0; i < staticTrip.stops.length; i++) {
                const stopId = staticTrip.stops[i].stopId;
                const rtStopData = rtUpdate?.stopUpdates.get(stopId);
                const predictedTime = rtStopData?.predictedTime || secondsToUnix(staticTrip.stops[i].arrivalTime);
                if (predictedTime > now) {
                    nextStopIdx = i;
                    break;
                }
                if (i === staticTrip.stops.length - 1) {
                    nextStopIdx = i;
                }
            }

            const nextStop = staticTrip.stops[nextStopIdx];
            const nextStopInfo = stopsById.get(nextStop.stopId);
            const lastStop = staticTrip.stops[staticTrip.stops.length - 1];
            const lastStopInfo = stopsById.get(lastStop.stopId);
            const firstStop = staticTrip.stops[0];
            const firstStopInfo = stopsById.get(firstStop.stopId);

            // Get predicted arrival times
            const rtNextStopData = rtUpdate?.stopUpdates.get(nextStop.stopId);
            const nextTime = rtNextStopData?.predictedTime || secondsToUnix(nextStop.arrivalTime);
            const rtLastStopData = rtUpdate?.stopUpdates.get(lastStop.stopId);
            const terminusTime = rtLastStopData?.predictedTime || secondsToUnix(lastStop.arrivalTime);

            vehicles.push({
                tripId,
                lat: rtPos.lat,
                lon: rtPos.lon,
                direction: staticTrip.direction,
                nextStop: nextStop.stopId,
                nextStopName: nextStopInfo?.stopName || nextStop.stopId,
                headsign: lastStopInfo?.stopName || staticTrip.headsign,
                bearing: rtPos.bearing,
                delay: rtUpdate?.delay || 0,
                progress: nextStopIdx / staticTrip.stops.length,
                estimatedArrival: nextTime,
                terminusEta: terminusTime,
                origin: firstStopInfo?.stopName || 'Inconnu',
                isRealtime: true
            });
        }

        // PRIORITY 2: Use RT trip updates for interpolation (no GPS but have delay data)
        for (const [tripId, rtUpdate] of rtUpdates) {
            if (processedTripIds.has(tripId)) continue;

            const staticTrip = staticTripsById.get(tripId);
            if (!staticTrip || staticTrip.stops.length < 2) continue;

            // Check if trip is currently active based on predicted times
            const firstStopData = rtUpdate.stopUpdates.get(staticTrip.stops[0].stopId);
            const lastStopData = rtUpdate.stopUpdates.get(staticTrip.stops[staticTrip.stops.length - 1].stopId);
            const firstPredicted = firstStopData?.predictedTime || secondsToUnix(staticTrip.stops[0].arrivalTime);
            const lastPredicted = lastStopData?.predictedTime || secondsToUnix(staticTrip.stops[staticTrip.stops.length - 1].arrivalTime);

            if (now < firstPredicted - 120 || now > lastPredicted + 300) continue;

            processedTripIds.add(tripId);

            // Find position based on PREDICTED times
            let prevStopIdx = 0;
            let nextStopIdx = 1;

            for (let i = 0; i < staticTrip.stops.length; i++) {
                const stopId = staticTrip.stops[i].stopId;
                const rtStopData = rtUpdate.stopUpdates.get(stopId);
                const predictedTime = rtStopData?.predictedTime || secondsToUnix(staticTrip.stops[i].arrivalTime);
                if (predictedTime > now) {
                    nextStopIdx = i;
                    prevStopIdx = Math.max(0, i - 1);
                    break;
                }
                if (i === staticTrip.stops.length - 1) {
                    prevStopIdx = i - 1;
                    nextStopIdx = i;
                }
            }

            const prevStop = staticTrip.stops[prevStopIdx];
            const nextStop = staticTrip.stops[nextStopIdx];
            const prevStopInfo = stopsById.get(prevStop.stopId);
            const nextStopInfo = stopsById.get(nextStop.stopId);

            if (!prevStopInfo || !nextStopInfo) continue;

            // Calculate progress using PREDICTED times
            const prevRtData = rtUpdate.stopUpdates.get(prevStop.stopId);
            const nextRtData = rtUpdate.stopUpdates.get(nextStop.stopId);
            const prevTime = prevRtData?.predictedTime || secondsToUnix(prevStop.arrivalTime);
            const nextTime = nextRtData?.predictedTime || secondsToUnix(nextStop.arrivalTime);
            const timeDiff = nextTime - prevTime;
            const elapsed = now - prevTime;
            const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

            const position = interpolatePosition(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
                segmentProgress
            );

            const bearing = calculateBearing(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon }
            );

            const lastStop = staticTrip.stops[staticTrip.stops.length - 1];
            const lastStopInfo = stopsById.get(lastStop.stopId);
            const firstStop = staticTrip.stops[0];
            const firstStopInfo = stopsById.get(firstStop.stopId);
            const lastRtData = rtUpdate.stopUpdates.get(lastStop.stopId);
            const terminusTime = lastRtData?.predictedTime || secondsToUnix(lastStop.arrivalTime);

            vehicles.push({
                tripId,
                lat: position.lat,
                lon: position.lon,
                direction: staticTrip.direction,
                nextStop: nextStop.stopId,
                nextStopName: nextStopInfo.stopName,
                headsign: lastStopInfo?.stopName || staticTrip.headsign,
                bearing,
                delay: rtUpdate.delay,
                progress: nextStopIdx / staticTrip.stops.length,
                estimatedArrival: nextTime,
                terminusEta: terminusTime,
                origin: firstStopInfo?.stopName || 'Inconnu',
                isRealtime: true // Has RT delay data
            });
        }

        // PRIORITY 3: Fall back to pure static schedule (no RT data at all)
        for (const trip of e1StopTimes as StaticTrip[]) {
            if (processedTripIds.has(trip.tripId)) continue;
            if (!trip.stops || trip.stops.length < 2) continue;

            const firstStopTime = secondsToUnix(trip.stops[0].arrivalTime);
            const lastStopTime = secondsToUnix(trip.stops[trip.stops.length - 1].arrivalTime);

            if (now < firstStopTime - 120 || now > lastStopTime + 300) continue;

            // Find position using scheduled times (fallback)
            let prevStopIdx = 0;
            let nextStopIdx = 1;

            for (let i = 0; i < trip.stops.length; i++) {
                const stopTime = secondsToUnix(trip.stops[i].arrivalTime);
                if (stopTime > now) {
                    nextStopIdx = i;
                    prevStopIdx = Math.max(0, i - 1);
                    break;
                }
                if (i === trip.stops.length - 1) {
                    prevStopIdx = i - 1;
                    nextStopIdx = i;
                }
            }

            const prevStop = trip.stops[prevStopIdx];
            const nextStop = trip.stops[nextStopIdx];
            const prevStopInfo = stopsById.get(prevStop.stopId);
            const nextStopInfo = stopsById.get(nextStop.stopId);

            if (!prevStopInfo || !nextStopInfo) continue;

            const prevTime = secondsToUnix(prevStop.arrivalTime);
            const nextTime = secondsToUnix(nextStop.arrivalTime);
            const timeDiff = nextTime - prevTime;
            const elapsed = now - prevTime;
            const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

            const position = interpolatePosition(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
                segmentProgress
            );

            const bearing = calculateBearing(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon }
            );

            const lastStop = trip.stops[trip.stops.length - 1];
            const lastStopInfo = stopsById.get(lastStop.stopId);
            const firstStop = trip.stops[0];
            const firstStopInfo = stopsById.get(firstStop.stopId);

            vehicles.push({
                tripId: trip.tripId,
                lat: position.lat,
                lon: position.lon,
                direction: trip.direction,
                nextStop: nextStop.stopId,
                nextStopName: nextStopInfo.stopName,
                headsign: lastStopInfo?.stopName || trip.headsign,
                bearing,
                delay: 0,
                progress: nextStopIdx / trip.stops.length,
                estimatedArrival: nextTime,
                terminusEta: lastStopTime,
                origin: firstStopInfo?.stopName || 'Inconnu',
                isRealtime: false
            });
        }

        return NextResponse.json({
            vehicles,
            timestamp: now,
            count: vehicles.length,
            hasRealtime: rtPositions.size > 0 || rtUpdates.size > 0
        });

    } catch (error) {
        console.error('Vehicles API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vehicles', vehicles: [], count: 0 },
            { status: 500 }
        );
    }
}
