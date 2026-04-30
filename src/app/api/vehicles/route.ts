import { NextResponse } from 'next/server';
import { fetchTripUpdates, fetchVehiclePositions } from '@/lib/gtfs-rt';
import { createShapesMap, interpolateAlongShape, type ShapePoint } from '@/lib/vehicle-interpolation';
import { getParisMidnight } from '@/utils/date';
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

function getStopAt(trip: StaticTrip, index: number) {
    return trip.stops.at(index);
}

function getFirstStop(trip: StaticTrip) {
    return trip.stops.at(0);
}

function getLastStop(trip: StaticTrip) {
    return trip.stops.at(-1);
}

// Pre-compute shape arrays for each direction using a Map to avoid object injection warnings
const shapesData = lineE1Data.shapes as unknown as Record<string, ShapePoint[]>;
const shapes = createShapesMap(shapesData);

export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);
        const midnight = getParisMidnight(); // Optimization: Calculate once
        const toUnix = (sec: number) => midnight + sec;

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

            const nextStopInfo = stopsById.get(nextStop.stopId);
            const lastStopInfo = stopsById.get(lastStop.stopId);
            const firstStopInfo = stopsById.get(firstStop.stopId);

            // Get predicted arrival times
            const rtNextStopData = rtUpdate?.stopUpdates.get(nextStop.stopId);
            const nextTime = rtNextStopData?.predictedTime || toUnix(nextStop.arrivalTime);
            const rtLastStopData = rtUpdate?.stopUpdates.get(lastStop.stopId);
            const terminusTime = rtLastStopData?.predictedTime || toUnix(lastStop.arrivalTime);

            let delay = rtUpdate?.tripDelay || 0;
            // Manual delay calculation if API reports 0 but next stop time is shifted
            if (delay === 0 && rtNextStopData?.predictedTime) {
                const calculatedDelay = rtNextStopData.predictedTime - toUnix(nextStop.arrivalTime);
                if (Math.abs(calculatedDelay) >= 60) {
                    delay = calculatedDelay;
                }
            }

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
                isRealtime: true
            });
        }

        // PRIORITY 2: Use RT trip updates for interpolation (no GPS but have delay data)
        for (const [tripId, rtUpdate] of rtUpdates) {
            if (processedTripIds.has(tripId)) continue;

            const staticTrip = staticTripsById.get(tripId);
            if (!staticTrip || staticTrip.stops.length < 2) continue;

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

            const prevStopInfo = stopsById.get(prevStop.stopId);
            const nextStopInfo = stopsById.get(nextStop.stopId);

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

            const lastStopInfo = stopsById.get(lastStopForTrip.stopId);
            const firstStopInfo = stopsById.get(firstStopForTrip.stopId);
            const lastRtData = rtUpdate.stopUpdates.get(lastStopForTrip.stopId);
            const terminusTime = lastRtData?.predictedTime || toUnix(lastStopForTrip.arrivalTime);

            let delay = rtUpdate.tripDelay;
            // Manual delay calculation if API reports 0 but next stop time is shifted
            if (delay === 0 && nextRtData?.predictedTime) {
                const calculatedDelay = nextRtData.predictedTime - toUnix(nextStop.arrivalTime);
                if (Math.abs(calculatedDelay) >= 60) {
                    delay = calculatedDelay;
                }
            }

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
                isRealtime: true // Has RT delay data
            });
        }

        // PRIORITY 3: Fall back to pure static schedule (no RT data at all)
        for (const trip of e1StopTimes as StaticTrip[]) {
            if (processedTripIds.has(trip.tripId)) continue;
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

            const prevStopInfo = stopsById.get(prevStop.stopId);
            const nextStopInfo = stopsById.get(nextStop.stopId);

            if (!prevStopInfo || !nextStopInfo) continue;

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

            const lastStopInfo = stopsById.get(lastStop.stopId);
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
