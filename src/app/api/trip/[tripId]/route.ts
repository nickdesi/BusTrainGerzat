import { NextResponse } from 'next/server';
import { fetchTripUpdates, LINE_E1_ROUTE_IDS } from '@/lib/gtfs-rt';
import lineE1Data from '../../../../../public/data/lineE1_data.json';
import e1StopTimes from '../../../../../public/data/e1_stop_times.json';

export const dynamic = 'force-dynamic';

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

interface StaticTrip {
    tripId: string;
    headsign: string;
    direction: number;
    stops: { stopId: string; sequence: number; arrivalTime: number; departureTime: number }[];
}



// Create lookup map from static data
const staticTripsById = new Map<string, StaticTrip>(
    (e1StopTimes as StaticTrip[]).map(t => [t.tripId, t])
);

import { getParisMidnight, getNowUnix } from '@/utils/date';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tripId: string }> }
) {
    try {
        const { tripId } = await params;
        const now = getNowUnix();
        const midnight = getParisMidnight();
        const toUnix = (sec: number) => midnight + sec;

        // Create stops lookup map
        const stopsById = new Map(
            lineE1Data.stops.map(s => [s.stopId, s])
        );

        // First, try to get static data for this trip
        const staticTrip = staticTripsById.get(tripId);

        // Fetch GTFS-RT data using centralized service
        const rtTripUpdates = await fetchTripUpdates();
        const tripRtData = rtTripUpdates.get(tripId);
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
            // Find current stop based on PREDICTED time (RT if available, else scheduled)
            // This ensures stops are correctly marked as "passed" when bus is early
            let currentStopIndex = 0;
            for (let i = 0; i < staticTrip.stops.length; i++) {
                const stopId = staticTrip.stops[i].stopId;
                const rtData = rtStopUpdates.get(stopId);
                // Use predicted time if RT available, otherwise scheduled
                const predictedTime = rtData?.predictedTime || toUnix(staticTrip.stops[i].arrivalTime);
                if (predictedTime > now) {
                    currentStopIndex = i;
                    break;
                }
                if (i === staticTrip.stops.length - 1) {
                    currentStopIndex = i; // All passed, last is current
                }
            }

            // Build stops with delay propagation
            // Track last known delay to propagate to stops without RT data
            let lastKnownDelay = 0;
            let lastPredictedArrival = 0;

            const stops: StopTimeDetail[] = staticTrip.stops.map((stop, index) => {
                const stopInfo = stopsById.get(stop.stopId);
                const scheduledArrival = toUnix(stop.arrivalTime);
                const scheduledDeparture = toUnix(stop.departureTime);

                // Check for RT overlay
                const rtData = rtStopUpdates.get(stop.stopId);

                // Use RT delay if available, otherwise propagate last known delay
                const delay = rtData?.delay ?? lastKnownDelay;
                if (rtData?.delay !== undefined) {
                    lastKnownDelay = rtData.delay;
                }

                // Calculate predicted time: use RT time if available, otherwise schedule + propagated delay
                let predictedArrival = rtData?.predictedTime || (scheduledArrival + delay);

                // Ensure chronological consistency: predicted arrival must be >= previous stop
                if (index > 0 && predictedArrival < lastPredictedArrival) {
                    // Add minimum travel time (e.g., 30 seconds between stops)
                    predictedArrival = lastPredictedArrival + 30;
                }
                lastPredictedArrival = predictedArrival;

                const predictedDeparture = rtData ? predictedArrival : (scheduledDeparture + delay);

                // Determine status
                let status: 'passed' | 'current' | 'upcoming';
                if (index < currentStopIndex) {
                    status = 'passed';
                } else if (index === currentStopIndex) {
                    status = 'current';
                } else {
                    status = 'upcoming';
                }

                return {
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
                };
            });

            // Get headsign from last stop
            const lastStop = staticTrip.stops[staticTrip.stops.length - 1];
            const lastStopInfo = stopsById.get(lastStop?.stopId);
            const headsign = lastStopInfo?.stopName || staticTrip.headsign;

            // Get origin from first stop
            const firstStop = staticTrip.stops[0];
            const firstStopInfo = stopsById.get(firstStop?.stopId);
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
            } as TripDetailsResponse);
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
                const stopInfo = stopsById.get(stopUpdate.stopId);
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
            } as TripDetailsResponse);
        }

        // No static data found and no RT data - return 404
        return NextResponse.json(
            { error: 'Trip not found', tripId },
            { status: 404 }
        );

    } catch (error) {
        console.error('Trip details error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trip details' },
            { status: 500 }
        );
    }
}
