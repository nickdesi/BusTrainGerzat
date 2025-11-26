import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { NextResponse } from 'next/server';
import staticSchedule from './static_schedule.json';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);

        // 1. Fetch Real-time Data
        let realtimeUpdates: Record<string, any> = {};
        try {
            const response = await fetch('https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update', {
                cache: 'no-store',
            });

            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
                const targetRouteId = '11821953316814877'; // Line 20
                const targetStopId = '3377704015495667'; // Gerzat Champfleuri

                feed.entity.forEach((entity) => {
                    if (entity.tripUpdate) {
                        const tripUpdate = entity.tripUpdate;
                        if (tripUpdate.trip.routeId === targetRouteId) {
                            tripUpdate.stopTimeUpdate.forEach((stopTimeUpdate) => {
                                if (stopTimeUpdate.stopId === targetStopId) {
                                    realtimeUpdates[tripUpdate.trip.tripId as string] = {
                                        arrival: stopTimeUpdate.arrival,
                                        departure: stopTimeUpdate.departure,
                                        delay: stopTimeUpdate.arrival?.delay || stopTimeUpdate.departure?.delay || 0,
                                    };
                                }
                            });
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Failed to fetch real-time data", e);
        }

        // 2. Merge with Static Schedule
        // Filter static schedule for relevant times (e.g. now - 10 min to now + 2 hours)
        // But actually, we want to show the next buses.

        const combinedUpdates = staticSchedule
            .filter((item: any) => item.arrival > now - 600) // Keep recent past to show "just left" if needed, or just future
            .map((item: any) => {
                const rt = realtimeUpdates[item.tripId];
                let arrival = item.arrival;
                let delay = 0;
                let isRealtime = false;

                if (rt) {
                    isRealtime = true;
                    if (rt.arrival?.time) {
                        arrival = Number(rt.arrival.time);
                    } else if (rt.departure?.time) {
                        arrival = Number(rt.departure.time);
                    }
                    delay = rt.delay || 0;
                }

                return {
                    tripId: item.tripId,
                    arrival: arrival,
                    delay: delay,
                    isRealtime: isRealtime,
                    headsign: item.headsign,
                    direction: item.direction
                };
            });

        // Sort by arrival time
        combinedUpdates.sort((a: any, b: any) => a.arrival - b.arrival);

        // Filter to keep only next 20 buses
        const nextBuses = combinedUpdates.filter((u: any) => u.arrival > now - 60).slice(0, 20);

        return NextResponse.json({ updates: nextBuses, timestamp: now });
    } catch (error) {
        console.error('Error in API route:', error);
        return NextResponse.json({ error: 'Failed to process data' }, { status: 500 });
    }
}
