import { NextResponse } from 'next/server';
import { protectApiRequest } from '@/lib/api-protection';
import { fetchTripUpdates, fetchVehiclePositions } from '@/lib/gtfs-rt';
import { createShapesMap, interpolateAlongShape, type ShapePoint } from '@/lib/vehicle-interpolation';
import { getParisMidnight, isT2CNoServiceDay } from '@/utils/date';
import {
    extractTripPattern,
    getEffectiveDelay,
    getFirstStop,
    getLastStop,
    getLineE1Shapes,
    getLineE1StaticTrip,
    getLineE1StaticTrips,
    getLineE1Stop,
    getStopAt,
} from '@/services/t2c-line-e1.service';

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
    source: 'gps' | 'realtime_interpolated' | 'static';
}

const SOURCE_PRIORITY: Record<EstimatedVehicle['source'], number> = {
    gps: 3,
    realtime_interpolated: 2,
    static: 1,
};

const LOGICAL_TRIP_WINDOW_SECONDS = 5 * 60;

function getLogicalVehicleKey(vehicle: EstimatedVehicle): string {
    const timeBucket = Math.round(vehicle.estimatedArrival / LOGICAL_TRIP_WINDOW_SECONDS);
    return [
        extractTripPattern(vehicle.tripId).replace(/_\d{6}$/, ''),
        vehicle.direction,
        vehicle.origin,
        vehicle.headsign,
        vehicle.nextStop,
        timeBucket,
    ].join('|');
}

function shouldReplaceVehicle(current: EstimatedVehicle, candidate: EstimatedVehicle): boolean {
    const priorityDiff = SOURCE_PRIORITY[candidate.source] - SOURCE_PRIORITY[current.source];
    if (priorityDiff !== 0) return priorityDiff > 0;

    return candidate.isRealtime && !current.isRealtime;
}

function deduplicateVehicles(vehicles: EstimatedVehicle[]): EstimatedVehicle[] {
    const byLogicalTrip = new Map<string, EstimatedVehicle>();

    for (const vehicle of vehicles) {
        const key = getLogicalVehicleKey(vehicle);
        const current = byLogicalTrip.get(key);

        if (!current || shouldReplaceVehicle(current, vehicle)) {
            byLogicalTrip.set(key, vehicle);
        }
    }

    return Array.from(byLogicalTrip.values());
}

function getStaticPatternForRtTrip(tripId: string): string | undefined {
    const staticTrip = getLineE1StaticTrip(tripId);
    return staticTrip ? extractTripPattern(staticTrip.tripId) : undefined;
}

// Pre-compute shape arrays for each direction using a Map to avoid object injection warnings
const shapesData = getLineE1Shapes() as unknown as Record<string, ShapePoint[]>;
const shapes = createShapesMap(shapesData);

export async function GET(request: Request) {
    const blocked = protectApiRequest(request, 'vehicles');
    if (blocked) return blocked;

    try {
        const now = Math.floor(Date.now() / 1000);

        if (isT2CNoServiceDay()) {
            return NextResponse.json({
                vehicles: [],
                timestamp: now,
                count: 0,
                hasRealtime: false,
                hasGps: false
            }, {
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const midnight = getParisMidnight(); // Optimization: Calculate once
        const toUnix = (sec: number) => midnight + sec;

        const vehicles: EstimatedVehicle[] = [];

        // Fetch GTFS-RT data in parallel
        const [rtPositions, rtUpdates] = await Promise.all([
            fetchVehiclePositions(),
            fetchTripUpdates()
        ]);

        const processedTripIds = new Set<string>();
        // Deduplicate across service_id variants of the same scheduled trip
        const processedPatterns = new Set<string>();
        const cancelledPatterns = new Set<string>();

        for (const [tripId, rtUpdate] of rtUpdates) {
            if (!rtUpdate.isCancelled) continue;

            const pattern = getStaticPatternForRtTrip(tripId);
            if (pattern) {
                processedPatterns.add(pattern);
                cancelledPatterns.add(pattern);
            }
            processedTripIds.add(tripId);
        }

        // PRIORITY 1: Use actual GPS positions from GTFS-RT
        for (const [tripId, rtPos] of rtPositions) {
            const staticTrip = getLineE1StaticTrip(tripId);
            if (!staticTrip) continue;
            if (cancelledPatterns.has(extractTripPattern(staticTrip.tripId))) continue;

            processedTripIds.add(tripId);
            processedPatterns.add(extractTripPattern(staticTrip.tripId));
            const rtUpdate = rtUpdates.get(tripId);

            // Find next stop based on predicted times
            let nextStopIdx = 0;
            for (const [index, stop] of staticTrip.stops.entries()) {
                const rtStopData = rtUpdate?.stopUpdates.get(stop.stopId);
                const predictedTime = rtStopData?.predictedTime || toUnix(stop.arrivalTime);
                if (predictedTime > now) {
                    nextStopIdx = index;
                    break;
                }
                if (index === staticTrip.stops.length - 1) {
                    nextStopIdx = index;
                }
            }

            const nextStop = getStopAt(staticTrip, nextStopIdx);
            const lastStop = getLastStop(staticTrip);
            const firstStop = getFirstStop(staticTrip);
            if (!nextStop || !lastStop || !firstStop) continue;

            const nextStopInfo = getLineE1Stop(nextStop.stopId);
            const lastStopInfo = getLineE1Stop(lastStop.stopId);
            const firstStopInfo = getLineE1Stop(firstStop.stopId);

            // Get predicted arrival times
            const rtNextStopData = rtUpdate?.stopUpdates.get(nextStop.stopId);
            const nextTime = rtNextStopData?.predictedTime || toUnix(nextStop.arrivalTime);
            const rtLastStopData = rtUpdate?.stopUpdates.get(lastStop.stopId);
            const terminusTime = rtLastStopData?.predictedTime || toUnix(lastStop.arrivalTime);

            const scheduledNextTime = toUnix(nextStop.arrivalTime);
            const delay = getEffectiveDelay(rtUpdate?.tripDelay || 0, rtNextStopData?.predictedTime, scheduledNextTime);

            vehicles.push({
                tripId,
                lat: rtPos.lat,
                lon: rtPos.lon,
                direction: staticTrip.direction,
                nextStop: nextStop.stopId,
                nextStopName: nextStopInfo?.stopName || nextStop.stopId,
                headsign: lastStopInfo?.stopName || staticTrip.headsign,
                bearing: rtPos.bearing,
                delay: delay,
                progress: nextStopIdx / staticTrip.stops.length,
                estimatedArrival: nextTime,
                terminusEta: terminusTime,
                origin: firstStopInfo?.stopName || 'Inconnu',
                isRealtime: true,
                source: 'gps'
            });
        }

        // PRIORITY 2: Use RT trip updates for interpolation (no GPS but have delay data)
        for (const [tripId, rtUpdate] of rtUpdates) {
            if (processedTripIds.has(tripId)) continue;

            const staticTrip = getLineE1StaticTrip(tripId);
            if (!staticTrip || staticTrip.stops.length < 2) {
                if (!rtUpdate.isAdded || rtUpdate.stopUpdates.size < 2) continue;

                const orderedStops = Array.from(rtUpdate.stopUpdates.values())
                    .filter((stop) => stop.predictedTime && getLineE1Stop(stop.stopId))
                    .sort((a, b) => (a.predictedTime || 0) - (b.predictedTime || 0));

                const firstRtStop = orderedStops.at(0);
                const lastRtStop = orderedStops.at(-1);
                if (!firstRtStop?.predictedTime || !lastRtStop?.predictedTime) continue;
                if (now < firstRtStop.predictedTime - 120 || now > lastRtStop.predictedTime + 300) continue;

                let prevStopIdx = 0;
                let nextStopIdx = 1;
                for (const [index, stop] of orderedStops.entries()) {
                    if ((stop.predictedTime || 0) > now) {
                        nextStopIdx = index;
                        prevStopIdx = Math.max(0, index - 1);
                        break;
                    }
                    if (index === orderedStops.length - 1) {
                        prevStopIdx = index - 1;
                        nextStopIdx = index;
                    }
                }

                const prevStop = orderedStops.at(prevStopIdx);
                const nextStop = orderedStops.at(nextStopIdx);
                if (!prevStop || !nextStop) continue;
                const prevStopInfo = getLineE1Stop(prevStop.stopId);
                const nextStopInfo = getLineE1Stop(nextStop.stopId);
                const firstStopInfo = getLineE1Stop(firstRtStop.stopId);
                const lastStopInfo = getLineE1Stop(lastRtStop.stopId);
                if (!prevStopInfo || !nextStopInfo || !firstStopInfo || !lastStopInfo) continue;

                const prevTime = prevStop.predictedTime || firstRtStop.predictedTime;
                const nextTime = nextStop.predictedTime || lastRtStop.predictedTime;
                const timeDiff = nextTime - prevTime;
                const elapsed = now - prevTime;
                const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

                const { lat, lon, bearing } = interpolateAlongShape(
                    { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                    { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
                    segmentProgress,
                    rtUpdate.directionId,
                    shapes
                );

                processedTripIds.add(tripId);
                vehicles.push({
                    tripId,
                    lat,
                    lon,
                    direction: rtUpdate.directionId,
                    nextStop: nextStop.stopId,
                    nextStopName: nextStopInfo.stopName,
                    headsign: lastStopInfo.stopName,
                    bearing,
                    delay: nextStop.delay,
                    progress: nextStopIdx / orderedStops.length,
                    estimatedArrival: nextTime,
                    terminusEta: lastRtStop.predictedTime,
                    origin: firstStopInfo.stopName,
                    isRealtime: true,
                    source: 'realtime_interpolated'
                });
                continue;
            }

            if (cancelledPatterns.has(extractTripPattern(staticTrip.tripId))) continue;

            // Check if trip is currently active based on predicted times
            const firstStop = getFirstStop(staticTrip);
            const lastStop = getLastStop(staticTrip);
            if (!firstStop || !lastStop) continue;

            const firstStopData = rtUpdate.stopUpdates.get(firstStop.stopId);
            const lastStopData = rtUpdate.stopUpdates.get(lastStop.stopId);
            const firstPredicted = firstStopData?.predictedTime || toUnix(firstStop.arrivalTime);
            const lastPredicted = lastStopData?.predictedTime || toUnix(lastStop.arrivalTime);

            if (now < firstPredicted - 120 || now > lastPredicted + 300) continue;

            processedTripIds.add(tripId);
            processedPatterns.add(extractTripPattern(staticTrip.tripId));

            // Find position based on PREDICTED times
            let prevStopIdx = 0;
            let nextStopIdx = 1;

            for (const [index, stop] of staticTrip.stops.entries()) {
                const rtStopData = rtUpdate.stopUpdates.get(stop.stopId);
                const predictedTime = rtStopData?.predictedTime || toUnix(stop.arrivalTime);
                if (predictedTime > now) {
                    nextStopIdx = index;
                    prevStopIdx = Math.max(0, index - 1);
                    break;
                }
                if (index === staticTrip.stops.length - 1) {
                    prevStopIdx = index - 1;
                    nextStopIdx = index;
                }
            }

            const prevStop = getStopAt(staticTrip, prevStopIdx);
            const nextStop = getStopAt(staticTrip, nextStopIdx);
            if (!prevStop || !nextStop) continue;

            const prevStopInfo = getLineE1Stop(prevStop.stopId);
            const nextStopInfo = getLineE1Stop(nextStop.stopId);

            if (!prevStopInfo || !nextStopInfo) continue;

            // Calculate progress using PREDICTED times
            const prevRtData = rtUpdate.stopUpdates.get(prevStop.stopId);
            const nextRtData = rtUpdate.stopUpdates.get(nextStop.stopId);
            const prevTime = prevRtData?.predictedTime || toUnix(prevStop.arrivalTime);
            const nextTime = nextRtData?.predictedTime || toUnix(nextStop.arrivalTime);
            const timeDiff = nextTime - prevTime;
            const elapsed = now - prevTime;
            const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

            // Use shape-following interpolation for accurate positioning on route
            const { lat, lon, bearing } = interpolateAlongShape(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
                segmentProgress,
                staticTrip.direction,
                shapes
            );

            const lastStopForTrip = getLastStop(staticTrip);
            const firstStopForTrip = getFirstStop(staticTrip);
            if (!lastStopForTrip || !firstStopForTrip) continue;

            const lastStopInfo = getLineE1Stop(lastStopForTrip.stopId);
            const firstStopInfo = getLineE1Stop(firstStopForTrip.stopId);
            const lastRtData = rtUpdate.stopUpdates.get(lastStopForTrip.stopId);
            const terminusTime = lastRtData?.predictedTime || toUnix(lastStopForTrip.arrivalTime);

            const delay = getEffectiveDelay(rtUpdate.tripDelay, nextRtData?.predictedTime, toUnix(nextStop.arrivalTime));

            vehicles.push({
                tripId,
                lat,
                lon,
                direction: staticTrip.direction,
                nextStop: nextStop.stopId,
                nextStopName: nextStopInfo.stopName,
                headsign: lastStopInfo?.stopName || staticTrip.headsign,
                bearing,
                delay: delay,
                progress: nextStopIdx / staticTrip.stops.length,
                estimatedArrival: nextTime,
                terminusEta: terminusTime,
                origin: firstStopInfo?.stopName || 'Inconnu',
                isRealtime: true, // Has RT delay data
                source: 'realtime_interpolated'
            });
        }

        // PRIORITY 3: Fall back to pure static schedule (no RT data at all)
        // e1_stop_times.json has multiple service_id variants of the same trip;
        // deduplicate by pattern so only one phantom bus appears per schedule slot.
        for (const trip of getLineE1StaticTrips()) {
            if (processedTripIds.has(trip.tripId)) continue;
            const tripPattern = extractTripPattern(trip.tripId);
            if (processedPatterns.has(tripPattern)) continue;
            if (!trip.stops || trip.stops.length < 2) continue;

            const firstStop = getFirstStop(trip);
            const lastStop = getLastStop(trip);
            if (!firstStop || !lastStop) continue;

            const firstStopTime = toUnix(firstStop.arrivalTime);
            const lastStopTime = toUnix(lastStop.arrivalTime);

            if (now < firstStopTime - 120 || now > lastStopTime + 300) continue;

            // Find position using scheduled times (fallback)
            let prevStopIdx = 0;
            let nextStopIdx = 1;

            for (const [index, stop] of trip.stops.entries()) {
                const stopTime = toUnix(stop.arrivalTime);
                if (stopTime > now) {
                    nextStopIdx = index;
                    prevStopIdx = Math.max(0, index - 1);
                    break;
                }
                if (index === trip.stops.length - 1) {
                    prevStopIdx = index - 1;
                    nextStopIdx = index;
                }
            }

            const prevStop = getStopAt(trip, prevStopIdx);
            const nextStop = getStopAt(trip, nextStopIdx);
            if (!prevStop || !nextStop) continue;

            const prevStopInfo = getLineE1Stop(prevStop.stopId);
            const nextStopInfo = getLineE1Stop(nextStop.stopId);

            if (!prevStopInfo || !nextStopInfo) continue;

            processedPatterns.add(tripPattern);

            const prevTime = toUnix(prevStop.arrivalTime);
            const nextTime = toUnix(nextStop.arrivalTime);
            const timeDiff = nextTime - prevTime;
            const elapsed = now - prevTime;
            const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

            // Use shape-following interpolation for accurate positioning on route
            const { lat, lon, bearing } = interpolateAlongShape(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
                segmentProgress,
                trip.direction,
                shapes
            );

            const lastStopInfo = getLineE1Stop(lastStop.stopId);
            const firstStopInfo = getLineE1Stop(firstStop.stopId);

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
                isRealtime: false,
                source: 'static'
            });
        }

        const visibleVehicles = deduplicateVehicles(vehicles);

        // ⚡ Bolt: Replace 3 O(N) array allocations (.filter) with a single pass O(N) loop
        // to reduce GC pressure and CPU cycles on every API request.
        let gpsCount = 0;
        let realtimeInterpolatedCount = 0;
        let staticCount = 0;

        for (const vehicle of visibleVehicles) {
            if (vehicle.source === 'gps') gpsCount++;
            else if (vehicle.source === 'realtime_interpolated') realtimeInterpolatedCount++;
            else if (vehicle.source === 'static') staticCount++;
        }

        return NextResponse.json({
            vehicles: visibleVehicles,
            timestamp: now,
            count: visibleVehicles.length,
            hasRealtime: realtimeInterpolatedCount > 0 || gpsCount > 0,
            hasGps: gpsCount > 0,
            sources: {
                gps: gpsCount,
                realtimeInterpolated: realtimeInterpolatedCount,
                static: staticCount
            }
        }, {
            headers: { 'Cache-Control': 'no-store' },
        });

    } catch (error) {
        console.error('Vehicles API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vehicles', vehicles: [], count: 0 },
            {
                status: 500,
                headers: { 'Cache-Control': 'no-store' },
            }
        );
    }
}
