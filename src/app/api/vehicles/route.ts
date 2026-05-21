import { NextResponse } from 'next/server';
import { protectApiRequest } from '@/lib/api-protection';
import { fetchTripUpdates, fetchVehiclePositions, type RTTripUpdate } from '@/lib/gtfs-rt';
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
import { apiLogger } from '@/lib/logger';
import type { LineE1StaticTrip } from '@/services/t2c-line-e1.service';

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

interface ProcessContext {
    now: number;
    midnight: number;
    shapes: Map<string, ShapePoint[]>;
    rtUpdates: Map<string, RTTripUpdate>;
    rtPositions: Map<string, { lat: number; lon: number; bearing: number }>;
    processedTripIds: Set<string>;
    processedPatterns: Set<string>;
    cancelledPatterns: Set<string>;
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

function findNextStopIndex(stops: { arrivalTime: number }[], now: number, midnight: number): number {
    for (let i = 0; i < stops.length; i++) {
        if (midnight + stops[i].arrivalTime > now) return i;
    }
    return stops.length - 1;
}

function findNextStopIndexWithPredictions(
    stops: { stopId: string; arrivalTime: number }[],
    rtUpdate: RTTripUpdate | undefined,
    now: number,
    midnight: number
): number {
    for (let i = 0; i < stops.length; i++) {
        const rtStopData = rtUpdate?.stopUpdates.get(stops[i].stopId);
        const predictedTime = rtStopData?.predictedTime || midnight + stops[i].arrivalTime;
        if (predictedTime > now) return i;
    }
    return stops.length - 1;
}

function buildVehicle(
    tripId: string,
    lat: number,
    lon: number,
    bearing: number,
    staticTrip: LineE1StaticTrip,
    nextStopIdx: number,
    delay: number,
    estimatedArrival: number,
    terminusEta: number,
    isRealtime: boolean,
    source: EstimatedVehicle['source']
): EstimatedVehicle | null {
    const nextStop = getStopAt(staticTrip, nextStopIdx);
    const firstStop = getFirstStop(staticTrip);
    const lastStop = getLastStop(staticTrip);
    if (!nextStop || !firstStop || !lastStop) return null;

    const nextStopInfo = getLineE1Stop(nextStop.stopId);
    const lastStopInfo = getLineE1Stop(lastStop.stopId);
    const firstStopInfo = getLineE1Stop(firstStop.stopId);

    return {
        tripId,
        lat,
        lon,
        direction: staticTrip.direction,
        nextStop: nextStop.stopId,
        nextStopName: nextStopInfo?.stopName || nextStop.stopId,
        headsign: lastStopInfo?.stopName || staticTrip.headsign,
        bearing,
        delay,
        progress: nextStopIdx / staticTrip.stops.length,
        estimatedArrival,
        terminusEta,
        origin: firstStopInfo?.stopName || 'Inconnu',
        isRealtime,
        source,
    };
}

function processGpsPositions(ctx: ProcessContext, vehicles: EstimatedVehicle[]): void {
    for (const [tripId, rtPos] of ctx.rtPositions) {
        const staticTrip = getLineE1StaticTrip(tripId);
        if (!staticTrip) continue;
        if (ctx.cancelledPatterns.has(extractTripPattern(staticTrip.tripId))) continue;

        ctx.processedTripIds.add(tripId);
        ctx.processedPatterns.add(extractTripPattern(staticTrip.tripId));

        const rtUpdate = ctx.rtUpdates.get(tripId);
        const nextStopIdx = findNextStopIndexWithPredictions(staticTrip.stops, rtUpdate, ctx.now, ctx.midnight);
        const nextStop = getStopAt(staticTrip, nextStopIdx);
        const lastStop = getLastStop(staticTrip);
        const firstStop = getFirstStop(staticTrip);
        if (!nextStop || !lastStop || !firstStop) continue;

        const rtNextStopData = rtUpdate?.stopUpdates.get(nextStop.stopId);
        const nextTime = rtNextStopData?.predictedTime || ctx.midnight + nextStop.arrivalTime;
        const rtLastStopData = rtUpdate?.stopUpdates.get(lastStop.stopId);
        const terminusTime = rtLastStopData?.predictedTime || ctx.midnight + lastStop.arrivalTime;

        const scheduledNextTime = ctx.midnight + nextStop.arrivalTime;
        const delay = getEffectiveDelay(rtUpdate?.tripDelay || 0, rtNextStopData?.predictedTime, scheduledNextTime);

        const vehicle = buildVehicle(
            tripId, rtPos.lat, rtPos.lon, rtPos.bearing,
            staticTrip, nextStopIdx, delay, nextTime, terminusTime,
            true, 'gps'
        );
        if (vehicle) vehicles.push(vehicle);
    }
}

function processRealtimeInterpolated(ctx: ProcessContext, vehicles: EstimatedVehicle[]): void {
    for (const [tripId, rtUpdate] of ctx.rtUpdates) {
        if (ctx.processedTripIds.has(tripId)) continue;

        const staticTrip = getLineE1StaticTrip(tripId);
        if (!staticTrip || staticTrip.stops.length < 2) {
            processAddedTrip(tripId, rtUpdate, ctx, vehicles);
            continue;
        }

        if (ctx.cancelledPatterns.has(extractTripPattern(staticTrip.tripId))) continue;

        const firstStop = getFirstStop(staticTrip);
        const lastStop = getLastStop(staticTrip);
        if (!firstStop || !lastStop) continue;

        const firstStopData = rtUpdate.stopUpdates.get(firstStop.stopId);
        const lastStopData = rtUpdate.stopUpdates.get(lastStop.stopId);
        const firstPredicted = firstStopData?.predictedTime || ctx.midnight + firstStop.arrivalTime;
        const lastPredicted = lastStopData?.predictedTime || ctx.midnight + lastStop.arrivalTime;

        if (ctx.now < firstPredicted - 120 || ctx.now > lastPredicted + 300) continue;

        ctx.processedTripIds.add(tripId);
        ctx.processedPatterns.add(extractTripPattern(staticTrip.tripId));

        const { prevStopIdx, nextStopIdx } = findSegmentIndices(staticTrip.stops, rtUpdate, ctx.now, ctx.midnight);
        const prevStop = getStopAt(staticTrip, prevStopIdx);
        const nextStop = getStopAt(staticTrip, nextStopIdx);
        if (!prevStop || !nextStop) continue;

        const prevStopInfo = getLineE1Stop(prevStop.stopId);
        const nextStopInfo = getLineE1Stop(nextStop.stopId);
        if (!prevStopInfo || !nextStopInfo) continue;

        const prevRtData = rtUpdate.stopUpdates.get(prevStop.stopId);
        const nextRtData = rtUpdate.stopUpdates.get(nextStop.stopId);
        const prevTime = prevRtData?.predictedTime || ctx.midnight + prevStop.arrivalTime;
        const nextTime = nextRtData?.predictedTime || ctx.midnight + nextStop.arrivalTime;
        const timeDiff = nextTime - prevTime;
        const elapsed = ctx.now - prevTime;
        const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

        const { lat, lon, bearing } = interpolateAlongShape(
            { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
            { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
            segmentProgress,
            staticTrip.direction,
            ctx.shapes
        );

        const lastStopForTrip = getLastStop(staticTrip);
        const firstStopForTrip = getFirstStop(staticTrip);
        if (!lastStopForTrip || !firstStopForTrip) continue;

        const lastRtData = rtUpdate.stopUpdates.get(lastStopForTrip.stopId);
        const terminusTime = lastRtData?.predictedTime || ctx.midnight + lastStopForTrip.arrivalTime;
        const delay = getEffectiveDelay(rtUpdate.tripDelay, nextRtData?.predictedTime, ctx.midnight + nextStop.arrivalTime);
        const finalBearing = rtUpdate.directionId !== undefined ? bearing : bearing;

        const vehicle = buildVehicle(
            tripId, lat, lon, finalBearing,
            staticTrip, nextStopIdx, delay, nextTime, terminusTime,
            true, 'realtime_interpolated'
        );
        if (vehicle) vehicles.push(vehicle);
    }
}

function processAddedTrip(
    tripId: string,
    rtUpdate: RTTripUpdate,
    ctx: ProcessContext,
    vehicles: EstimatedVehicle[]
): void {
    if (!rtUpdate.isAdded || rtUpdate.stopUpdates.size < 2) return;

    const orderedStops = Array.from(rtUpdate.stopUpdates.values())
        .filter((stop) => stop.predictedTime && getLineE1Stop(stop.stopId))
        .sort((a, b) => (a.predictedTime || 0) - (b.predictedTime || 0));

    const firstRtStop = orderedStops.at(0);
    const lastRtStop = orderedStops.at(-1);
    if (!firstRtStop?.predictedTime || !lastRtStop?.predictedTime) return;
    if (ctx.now < firstRtStop.predictedTime - 120 || ctx.now > lastRtStop.predictedTime + 300) return;

    let prevStopIdx = 0;
    let nextStopIdx = 1;
    for (const [index, stop] of orderedStops.entries()) {
        if ((stop.predictedTime || 0) > ctx.now) {
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
    if (!prevStop || !nextStop) return;

    const prevStopInfo = getLineE1Stop(prevStop.stopId);
    const nextStopInfo = getLineE1Stop(nextStop.stopId);
    const firstStopInfo = getLineE1Stop(firstRtStop.stopId);
    const lastStopInfo = getLineE1Stop(lastRtStop.stopId);
    if (!prevStopInfo || !nextStopInfo || !firstStopInfo || !lastStopInfo) return;

    const prevTime = prevStop.predictedTime || firstRtStop.predictedTime;
    const nextTime = nextStop.predictedTime || lastRtStop.predictedTime;
    const timeDiff = nextTime - prevTime;
    const elapsed = ctx.now - prevTime;
    const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

    const { lat, lon, bearing } = interpolateAlongShape(
        { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
        { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
        segmentProgress,
        rtUpdate.directionId,
        ctx.shapes
    );

    ctx.processedTripIds.add(tripId);
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
        source: 'realtime_interpolated',
    });
}

function findSegmentIndices(
    stops: { stopId: string; arrivalTime: number }[],
    rtUpdate: RTTripUpdate,
    now: number,
    midnight: number
): { prevStopIdx: number; nextStopIdx: number } {
    let prevStopIdx = 0;
    let nextStopIdx = 1;

    for (const [index, stop] of stops.entries()) {
        const rtStopData = rtUpdate.stopUpdates.get(stop.stopId);
        const predictedTime = rtStopData?.predictedTime || midnight + stop.arrivalTime;
        if (predictedTime > now) {
            nextStopIdx = index;
            prevStopIdx = Math.max(0, index - 1);
            return { prevStopIdx, nextStopIdx };
        }
        if (index === stops.length - 1) {
            prevStopIdx = index - 1;
            nextStopIdx = index;
        }
    }
    return { prevStopIdx, nextStopIdx };
}

function processStaticFallback(ctx: ProcessContext, vehicles: EstimatedVehicle[]): void {
    for (const trip of getLineE1StaticTrips()) {
        if (ctx.processedTripIds.has(trip.tripId)) continue;

        const tripPattern = extractTripPattern(trip.tripId);
        if (ctx.processedPatterns.has(tripPattern)) continue;
        if (!trip.stops || trip.stops.length < 2) continue;

        const firstStop = getFirstStop(trip);
        const lastStop = getLastStop(trip);
        if (!firstStop || !lastStop) continue;

        const firstStopTime = ctx.midnight + firstStop.arrivalTime;
        const lastStopTime = ctx.midnight + lastStop.arrivalTime;

        if (ctx.now < firstStopTime - 120 || ctx.now > lastStopTime + 300) continue;

        const nextStopIdx = findNextStopIndex(trip.stops, ctx.now, ctx.midnight);
        const prevStopIdx = Math.max(0, nextStopIdx - 1);
        const prevStop = getStopAt(trip, prevStopIdx);
        const nextStop = getStopAt(trip, nextStopIdx);
        if (!prevStop || !nextStop) continue;

        const prevStopInfo = getLineE1Stop(prevStop.stopId);
        const nextStopInfo = getLineE1Stop(nextStop.stopId);
        if (!prevStopInfo || !nextStopInfo) continue;

        ctx.processedPatterns.add(tripPattern);

        const prevTime = ctx.midnight + prevStop.arrivalTime;
        const nextTime = ctx.midnight + nextStop.arrivalTime;
        const timeDiff = nextTime - prevTime;
        const elapsed = ctx.now - prevTime;
        const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

        const { lat, lon, bearing } = interpolateAlongShape(
            { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
            { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
            segmentProgress,
            trip.direction,
            ctx.shapes
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
            source: 'static',
        });
    }
}

function computeSourceCounts(vehicles: EstimatedVehicle[]): { gps: number; realtimeInterpolated: number; static: number } {
    let gpsCount = 0;
    let realtimeInterpolatedCount = 0;
    let staticCount = 0;
    for (const vehicle of vehicles) {
        if (vehicle.source === 'gps') gpsCount++;
        else if (vehicle.source === 'realtime_interpolated') realtimeInterpolatedCount++;
        else if (vehicle.source === 'static') staticCount++;
    }
    return { gps: gpsCount, realtimeInterpolated: realtimeInterpolatedCount, static: staticCount };
}

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
                hasGps: false,
            }, {
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const midnight = getParisMidnight();
        const [rtPositions, rtUpdates] = await Promise.all([
            fetchVehiclePositions(),
            fetchTripUpdates(),
        ]);

        const ctx: ProcessContext = {
            now,
            midnight,
            shapes,
            rtUpdates,
            rtPositions,
            processedTripIds: new Set(),
            processedPatterns: new Set(),
            cancelledPatterns: new Set(),
        };

        for (const [tripId, rtUpdate] of rtUpdates) {
            if (!rtUpdate.isCancelled) continue;
            const pattern = getStaticPatternForRtTrip(tripId);
            if (pattern) {
                ctx.processedPatterns.add(pattern);
                ctx.cancelledPatterns.add(pattern);
            }
            ctx.processedTripIds.add(tripId);
        }

        const vehicles: EstimatedVehicle[] = [];
        processGpsPositions(ctx, vehicles);
        processRealtimeInterpolated(ctx, vehicles);
        processStaticFallback(ctx, vehicles);

        const visibleVehicles = deduplicateVehicles(vehicles);
        const sourceCounts = computeSourceCounts(visibleVehicles);

        return NextResponse.json({
            vehicles: visibleVehicles,
            timestamp: now,
            count: visibleVehicles.length,
            hasRealtime: sourceCounts.realtimeInterpolated > 0 || sourceCounts.gps > 0,
            hasGps: sourceCounts.gps > 0,
            sources: sourceCounts,
        }, {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        apiLogger.error('Vehicles API error', undefined, error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to fetch vehicles', vehicles: [], count: 0 },
            {
                status: 500,
                headers: { 'Cache-Control': 'no-store' },
            }
        );
    }
}
