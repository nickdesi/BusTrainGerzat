import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { NextResponse } from 'next/server';
import lineE1Data from '../../../../../public/data/lineE1_data.json';

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
}

const LINE_E1_ROUTE_ID = '3';

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

        // Fetch GTFS-RT data
        const response = await fetch(
            'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update',
            { cache: 'no-store' }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch realtime data' },
                { status: 502 }
            );
        }

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );

        // Find the specific trip
        let tripData: TripDetailsResponse | null = null;

        for (const entity of feed.entity) {
            if (entity.tripUpdate && entity.tripUpdate.trip.tripId === tripId) {
                const tripUpdate = entity.tripUpdate;

                // Must be Line E1
                if (tripUpdate.trip.routeId !== LINE_E1_ROUTE_ID) {
                    continue;
                }

                const stopTimeUpdates = tripUpdate.stopTimeUpdate || [];
                if (stopTimeUpdates.length === 0) continue;

                // Determine direction from trip update (reliable)
                const direction = tripUpdate.trip.directionId ?? 0;

                // Build headsign based on direction
                let headsign = direction === 0
                    ? "AUBIÈRE Pl. des Ramacles"
                    : "GERZAT Champfleuri";

                // Use actual last stop name if available
                const lastStopId = stopTimeUpdates[stopTimeUpdates.length - 1]?.stopId as string;
                if (lastStopId) {
                    const lastStopInfo = stopsById.get(lastStopId);
                    if (lastStopInfo?.stopName) {
                        headsign = lastStopInfo.stopName;
                    }
                }

                // Find current stop (first stop with arrival > now)
                let currentStopIndex = -1;
                for (let i = 0; i < stopTimeUpdates.length; i++) {
                    const arrivalTime = Number(
                        stopTimeUpdates[i].arrival?.time ||
                        stopTimeUpdates[i].departure?.time ||
                        0
                    );
                    if (arrivalTime > now) {
                        currentStopIndex = i;
                        break;
                    }
                }

                // If all stops passed, mark last as current
                if (currentStopIndex === -1) {
                    currentStopIndex = stopTimeUpdates.length - 1;
                }

                // Build stop details
                const stops: StopTimeDetail[] = stopTimeUpdates.map((stu, index) => {
                    const stopId = stu.stopId as string;
                    const stopInfo = stopsById.get(stopId);

                    // RT provides PREDICTED times (arrival.time / departure.time) and delay
                    // Scheduled = Predicted - Delay
                    const delay = Number(stu.arrival?.delay || stu.departure?.delay || 0);
                    const predictedArrival = Number(stu.arrival?.time || stu.departure?.time || 0);
                    const predictedDeparture = Number(stu.departure?.time || stu.arrival?.time || 0);

                    // Calculate scheduled time by subtracting delay from predicted
                    const scheduledArrival = predictedArrival > 0 ? predictedArrival - delay : 0;
                    const scheduledDeparture = predictedDeparture > 0 ? predictedDeparture - delay : 0;

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
                        stopId,
                        stopName: stopInfo?.stopName || stopId,
                        sequence: stu.stopSequence || index + 1,
                        scheduledArrival,
                        scheduledDeparture,
                        predictedArrival,
                        predictedDeparture,
                        delay,
                        status,
                        isAccessible: true, // Default to true, could be enhanced with actual data
                    };
                });

                tripData = {
                    tripId,
                    routeId: LINE_E1_ROUTE_ID,
                    direction,
                    headsign,
                    stops,
                    timestamp: now,
                    isRealtime: true,
                };

                break;
            }
        }

        if (!tripData) {
            return NextResponse.json(
                { error: 'Trip not found', tripId },
                { status: 404 }
            );
        }

        return NextResponse.json(tripData);
    } catch (error) {
        console.error('Trip details error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trip details' },
            { status: 500 }
        );
    }
}
