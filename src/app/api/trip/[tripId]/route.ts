import { NextResponse } from 'next/server';
import { protectApiRequest } from '@/lib/api-protection';
import { fetchTripUpdates, LINE_E1_ROUTE_IDS } from '@/lib/gtfs-rt';
import { getParisMidnight, getNowUnix } from '@/utils/date';
import {
    getByTripIdOrPattern,
    getEffectiveDelay,
    getLineE1StaticTrip,
    getLineE1Stop,
} from '@/services/t2c-line-e1.service';
import { apiLogger } from '@/lib/logger';

interface StopTimeDetail {
    stopId: string;
    stopName: string;
    sequence: number;
    scheduledArrival: number;
    scheduledDeparture: number;
    predictedArrival: number;
    predictedDeparture: number;
    delay: number;
    status: 'passed' | 'current' | 'upcoming';
    isAccessible: boolean;
}

interface TripDetailsResponse {
    tripId: string;
    routeId: string;
    direction: number;
    headsign: string;
    stops: StopTimeDetail[];
    timestamp: number;
    isRealtime: boolean;
    origin: string;
}

const TRIP_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function isValidTripId(tripId: string): boolean {
    return TRIP_ID_PATTERN.test(tripId) && !tripId.includes('..');
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const blocked = protectApiRequest(request, 'trip');
    if (blocked) return blocked;

    try {
        const { tripId } = await params;

        if (!isValidTripId(tripId)) {
            return NextResponse.json(
                { error: 'Invalid tripId' },
                {
                    status: 400,
                    headers: { 'Cache-Control': 'no-store' },
                }
            );
        }

        const now = getNowUnix();
        const midnight = getParisMidnight();
        const toUnix = (sec: number) => midnight + sec;

        // First, try to get static data for this trip (exact match, then fuzzy pattern match)
        const staticTrip = getLineE1StaticTrip(tripId);

        // Fetch GTFS-RT data using centralized service
        const rtTripUpdates = await fetchTripUpdates();
        const tripRtData = getByTripIdOrPattern(rtTripUpdates, tripId);
        let hasRealTimeData = false;

        const rtStopUpdates: Map<string, { delay: number; predictedTime: number }> = new Map();
        if (tripRtData && LINE_E1_ROUTE_IDS.has(tripRtData.routeId)) {
            hasRealTimeData = tripRtData.stopUpdates.size > 0;
            for (const [stopId, stopData] of tripRtData.stopUpdates) {
                if (stopData.predictedTime) {
                    rtStopUpdates.set(stopId, { delay: stopData.delay, predictedTime: stopData.predictedTime });
                }
            }
        }

        // Build response - prefer static + RT overlay
        if (staticTrip) {
            // Build stops with delay propagation
            // Track last known delay to propagate to stops without RT data
            let lastKnownDelay = 0;
            let lastPredictedArrival = 0;
            const stops: StopTimeDetail[] = [];
            let currentStopFound = false;

            // ⚡ Bolt: Single pass to map stops and determine status without intermediate arrays or multiple iterations
            for (let i = 0; i < staticTrip.stops.length; i++) {
                // eslint-disable-next-line security/detect-object-injection
                const stop = staticTrip.stops[i];
                const stopInfo = getLineE1Stop(stop.stopId);
                const scheduledArrival = toUnix(stop.arrivalTime);
                const scheduledDeparture = toUnix(stop.departureTime);

                // Check for RT overlay
                const rtData = rtStopUpdates.get(stop.stopId);

                // Use RT delay if available, otherwise propagate last known delay
                const delay = rtData ? getEffectiveDelay(rtData.delay, rtData.predictedTime, scheduledArrival) : lastKnownDelay;

                if (rtData) {
                    lastKnownDelay = delay;
                }

                // Calculate predicted time: use RT time if available, otherwise schedule + propagated delay
                let predictedArrival = rtData?.predictedTime || (scheduledArrival + delay);

                // Ensure chronological consistency: predicted arrival must be >= previous stop
                if (i > 0 && predictedArrival < lastPredictedArrival) {
                    // Add minimum travel time (e.g., 30 seconds between stops)
                    predictedArrival = lastPredictedArrival + 30;
                }
                lastPredictedArrival = predictedArrival;

                const predictedDeparture = rtData ? predictedArrival : (scheduledDeparture + delay);

                let status: 'passed' | 'current' | 'upcoming' = 'upcoming';
                if (!currentStopFound) {
                    if (predictedArrival > now) {
                        status = 'current';
                        currentStopFound = true;
                    } else {
                        status = 'passed';
                    }
                } else {
                    status = 'upcoming';
                }

                stops.push({
                    stopId: stop.stopId,
                    stopName: stopInfo?.stopName || stop.stopId,
                    sequence: stop.sequence,
                    scheduledArrival,
                    scheduledDeparture,
                    predictedArrival,
                    predictedDeparture,
                    delay,
                    status,
                    isAccessible: true,
                });
            }

            // Get headsign from last stop
            const lastStop = staticTrip.stops[staticTrip.stops.length - 1];
            const lastStopInfo = lastStop ? getLineE1Stop(lastStop.stopId) : undefined;
            const headsign = lastStopInfo?.stopName || staticTrip.headsign;

            // Get origin from first stop
            const firstStop = staticTrip.stops[0];
            const firstStopInfo = firstStop ? getLineE1Stop(firstStop.stopId) : undefined;
            const origin = firstStopInfo?.stopName || (staticTrip.direction === 0 ? 'GERZAT Champfleuri' : 'AUBIÈRE Pl. des Ramacles');

            return NextResponse.json({
                tripId,
                routeId: Array.from(LINE_E1_ROUTE_IDS)[0],
                direction: staticTrip.direction,
                headsign,
                origin,
                stops,
                timestamp: now,
                isRealtime: hasRealTimeData,
            } as TripDetailsResponse, {
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        // Fallback for added trips (no static data)
        if (tripRtData) {
            const stops: StopTimeDetail[] = [];
            let sequence = 1;

            // Convert Map values to array and sort by time/sequence
            const sortedUpdates = Array.from(tripRtData.stopUpdates.values()).sort((a, b) => {
                const timeA = a.predictedTime || 0;
                const timeB = b.predictedTime || 0;
                return timeA - timeB;
            });

            // Iterate and determine status
            let currentStopFound = false;
            for (const stopUpdate of sortedUpdates) {
                const stopInfo = getLineE1Stop(stopUpdate.stopId);
                const predictedTime = stopUpdate.predictedTime || now;

                let status: 'passed' | 'current' | 'upcoming' = 'upcoming';

                // Simple logic: first future stop is current, everything before is passed
                if (!currentStopFound) {
                    if (predictedTime > now) {
                        status = 'current';
                        currentStopFound = true;
                    } else {
                        status = 'passed';
                    }
                } else {
                    status = 'upcoming';
                }

                stops.push({
                    stopId: stopUpdate.stopId,
                    stopName: stopInfo?.stopName || stopUpdate.stopId,
                    sequence: sequence++,
                    scheduledArrival: predictedTime,
                    scheduledDeparture: predictedTime,
                    predictedArrival: predictedTime,
                    predictedDeparture: predictedTime,
                    delay: stopUpdate.delay,
                    status: status,
                    isAccessible: true,
                });
            }

            // Determine origin/headsign from directionId
            const direction = tripRtData.directionId;
            const headsign = direction === 0 ? 'AUBIÈRE Pl. des Ramacles' : 'GERZAT Champfleuri';
            const origin = direction === 0 ? 'GERZAT Champfleuri' : 'AUBIÈRE Pl. des Ramacles';

            return NextResponse.json({
                tripId,
                routeId: tripRtData.routeId,
                direction,
                headsign,
                origin,
                stops,
                timestamp: now,
                isRealtime: true,
            } as TripDetailsResponse, {
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        // No static data found and no RT data - return 404
        return NextResponse.json(
            { error: 'Trip not found', tripId },
            {
                status: 404,
                headers: { 'Cache-Control': 'no-store' },
            }
        );

    } catch (error) {
        apiLogger.error('Trip details error', undefined, error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to fetch trip details' },
            {
                status: 500,
                headers: { 'Cache-Control': 'no-store' },
            }
        );
    }
}
