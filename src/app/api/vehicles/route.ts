import { NextResponse } from 'next/server';
import { fetchTripUpdates, fetchVehiclePositions } from '@/lib/gtfs-rt';
import lineE1Data from '../../../../public/data/lineE1_data.json';
import e1StopTimes from '../../../../public/data/e1_stop_times.json';

export const dynamic = 'force-dynamic';

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
    isRealtime: boolean;
}

interface StaticTrip {
    tripId: string;
    headsign: string;
    direction: number;
    stops: { stopId: string; sequence: number; arrivalTime: number; departureTime: number }[];
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
 * Interpolate position between two stops based on progress (fallback - straight line)
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

// Pre-compute shape arrays for each direction
type ShapePoint = [number, number]; // [lat, lon]
const shapes = lineE1Data.shapes as unknown as Record<string, ShapePoint[]>;

/**
 * Calculate squared distance between two points (faster than actual distance for comparisons)
 */
function distanceSquared(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    return dLat * dLat + dLon * dLon;
}

/**
 * Find the index of the closest point on the shape to a given stop
 * Uses sampling for performance (check every Nth point, then refine)
 */
function findClosestShapeIndex(shape: ShapePoint[], lat: number, lon: number): number {
    if (shape.length === 0) return 0;

    // Coarse search: sample every 20th point
    let bestIdx = 0;
    let bestDist = Infinity;
    const step = 20;

    for (let i = 0; i < shape.length; i += step) {
        const dist = distanceSquared(lat, lon, shape[i][0], shape[i][1]);
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }

    // Fine search: check nearby points
    const searchStart = Math.max(0, bestIdx - step);
    const searchEnd = Math.min(shape.length - 1, bestIdx + step);

    for (let i = searchStart; i <= searchEnd; i++) {
        const dist = distanceSquared(lat, lon, shape[i][0], shape[i][1]);
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }

    return bestIdx;
}

/**
 * Calculate cumulative distances along shape segment
 */
function calculateShapeSegmentLength(shape: ShapePoint[], startIdx: number, endIdx: number): number {
    let length = 0;
    const start = Math.min(startIdx, endIdx);
    const end = Math.max(startIdx, endIdx);

    for (let i = start; i < end; i++) {
        length += Math.sqrt(distanceSquared(
            shape[i][0], shape[i][1],
            shape[i + 1][0], shape[i + 1][1]
        ));
    }
    return length;
}

/**
 * Interpolate position along the shape path between two stops
 * This ensures the bus follows the actual route instead of cutting corners
 */
function interpolateAlongShape(
    prevStop: { lat: number; lon: number },
    nextStop: { lat: number; lon: number },
    progress: number,
    direction: number
): { lat: number; lon: number; bearing: number } {
    // Get shape for this direction
    const shapeKey = String(direction);
    const shape = shapes[shapeKey];

    // Fallback to straight line if no shape available
    if (!shape || shape.length < 2) {
        const pos = interpolatePosition(prevStop, nextStop, progress);
        return {
            ...pos,
            bearing: calculateBearing(prevStop, nextStop)
        };
    }

    // Find closest shape points to prev and next stops
    const prevIdx = findClosestShapeIndex(shape, prevStop.lat, prevStop.lon);
    const nextIdx = findClosestShapeIndex(shape, nextStop.lat, nextStop.lon);

    // Handle edge case where points are same or reversed
    if (prevIdx === nextIdx) {
        return {
            lat: shape[prevIdx][0],
            lon: shape[prevIdx][1],
            bearing: calculateBearing(prevStop, nextStop)
        };
    }

    // Determine segment direction on shape
    const shapeStart = Math.min(prevIdx, nextIdx);
    const shapeEnd = Math.max(prevIdx, nextIdx);
    const isReversed = prevIdx > nextIdx;

    // Calculate total segment length
    const totalLength = calculateShapeSegmentLength(shape, shapeStart, shapeEnd);
    if (totalLength === 0) {
        return {
            lat: shape[prevIdx][0],
            lon: shape[prevIdx][1],
            bearing: calculateBearing(prevStop, nextStop)
        };
    }

    // Find position at given progress along the segment
    const targetDistance = totalLength * progress;
    let accumulatedLength = 0;

    // Walk along shape from prevIdx toward nextIdx
    const walkStart = isReversed ? shapeEnd : shapeStart;
    const walkDirection = isReversed ? -1 : 1;
    const walkEnd = isReversed ? shapeStart : shapeEnd;

    let currentIdx = walkStart;
    while ((walkDirection > 0 ? currentIdx < walkEnd : currentIdx > walkEnd)) {
        const nextPointIdx = currentIdx + walkDirection;
        const segmentLength = Math.sqrt(distanceSquared(
            shape[currentIdx][0], shape[currentIdx][1],
            shape[nextPointIdx][0], shape[nextPointIdx][1]
        ));

        if (accumulatedLength + segmentLength >= targetDistance) {
            // Target is within this segment
            const remainingDistance = targetDistance - accumulatedLength;
            const segmentProgress = segmentLength > 0 ? remainingDistance / segmentLength : 0;

            const lat = shape[currentIdx][0] + (shape[nextPointIdx][0] - shape[currentIdx][0]) * segmentProgress;
            const lon = shape[currentIdx][1] + (shape[nextPointIdx][1] - shape[currentIdx][1]) * segmentProgress;

            // Calculate bearing from current segment
            const bearing = calculateBearing(
                { lat: shape[currentIdx][0], lon: shape[currentIdx][1] },
                { lat: shape[nextPointIdx][0], lon: shape[nextPointIdx][1] }
            );

            return { lat, lon, bearing };
        }

        accumulatedLength += segmentLength;
        currentIdx = nextPointIdx;
    }

    // Fallback: return end point
    return {
        lat: shape[walkEnd][0],
        lon: shape[walkEnd][1],
        bearing: calculateBearing(prevStop, nextStop)
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



export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);
        const vehicles: EstimatedVehicle[] = [];

        // Fetch GTFS-RT data in parallel
        const [rtPositions, rtUpdates] = await Promise.all([
            fetchVehiclePositions(),
            fetchTripUpdates()
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
                delay: rtUpdate?.tripDelay || 0,
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

            // Use shape-following interpolation for accurate positioning on route
            const { lat, lon, bearing } = interpolateAlongShape(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
                segmentProgress,
                staticTrip.direction
            );

            const lastStop = staticTrip.stops[staticTrip.stops.length - 1];
            const lastStopInfo = stopsById.get(lastStop.stopId);
            const firstStop = staticTrip.stops[0];
            const firstStopInfo = stopsById.get(firstStop.stopId);
            const lastRtData = rtUpdate.stopUpdates.get(lastStop.stopId);
            const terminusTime = lastRtData?.predictedTime || secondsToUnix(lastStop.arrivalTime);

            vehicles.push({
                tripId,
                lat,
                lon,
                direction: staticTrip.direction,
                nextStop: nextStop.stopId,
                nextStopName: nextStopInfo.stopName,
                headsign: lastStopInfo?.stopName || staticTrip.headsign,
                bearing,
                delay: rtUpdate.tripDelay,
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

            // Use shape-following interpolation for accurate positioning on route
            const { lat, lon, bearing } = interpolateAlongShape(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
                segmentProgress,
                trip.direction
            );

            const lastStop = trip.stops[trip.stops.length - 1];
            const lastStopInfo = stopsById.get(lastStop.stopId);
            const firstStop = trip.stops[0];
            const firstStopInfo = stopsById.get(firstStop.stopId);

            vehicles.push({
                tripId: trip.tripId,
                lat,
                lon,
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
