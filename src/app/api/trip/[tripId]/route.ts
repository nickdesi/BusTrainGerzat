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

/**
 * Convert seconds-from-midnight (Paris time) to Unix timestamp for today
 * GTFS times are in local Paris time, server may be in UTC
 */
function secondsToUnix(secondsFromMidnight: number): number {
    // Get current time in Paris
    const now = new Date();
    // Create today's date string in Paris timezone
    const parisDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }); // YYYY-MM-DD
    // Parse as Paris midnight (the string is date-only, so we need to create midnight in Paris)
    // Parse as Paris midnight (the string is date-only, so we need to create midnight in Paris)
    const [, month] = parisDateStr.split('-').map(Number);
    // Create a Date at midnight Paris time
    // Paris is UTC+1 in winter, UTC+2 in summer
    // We use a trick: create a date string with explicit timezone
    // Winter time
    // Check if we're in DST (rough check: April to October)
    const isDST = month >= 4 && month <= 10;
    const offset = isDST ? '+02:00' : '+01:00';
    const correctMidnight = new Date(`${parisDateStr}T00:00:00${offset}`);

    return Math.floor(correctMidnight.getTime() / 1000) + secondsFromMidnight;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tripId: string }> }
) {
    try {
        const { tripId } = await params;
        const now = Math.floor(Date.now() / 1000);

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
                const predictedTime = rtData?.predictedTime || secondsToUnix(staticTrip.stops[i].arrivalTime);
                if (predictedTime > now) {
                    currentStopIndex = i;
                    break;
                }
                if (i === staticTrip.stops.length - 1) {
                    currentStopIndex = i; // All passed, last is current
                }
            }

            const stops: StopTimeDetail[] = staticTrip.stops.map((stop, index) => {
                const stopInfo = stopsById.get(stop.stopId);
                const scheduledArrival = secondsToUnix(stop.arrivalTime);
                const scheduledDeparture = secondsToUnix(stop.departureTime);

                // Check for RT overlay
                const rtData = rtStopUpdates.get(stop.stopId);
                const delay = rtData?.delay || 0;
                const predictedArrival = rtData?.predictedTime || scheduledArrival;
                const predictedDeparture = rtData ? predictedArrival : scheduledDeparture;

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
            const origin = firstStopInfo?.stopName || 'Inconnu';

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

        // No static data found - return 404
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
