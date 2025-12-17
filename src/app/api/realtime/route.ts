import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { NextResponse } from 'next/server';
import staticSchedule from './static_schedule.json';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);

        // 1. Fetch Real-time Data
        const realtimeUpdates: Record<string, { arrival?: { time?: number; delay?: number }; departure?: { time?: number; delay?: number }; delay: number; isCancelled: boolean }> = {};
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
                            // Check for trip-level cancellation (GTFS-RT schedule_relationship)
                            const isTripCancelled = tripUpdate.trip.scheduleRelationship === 3; // CANCELED = 3

                            tripUpdate.stopTimeUpdate?.forEach((stopTimeUpdate) => {
                                if (stopTimeUpdate.stopId === targetStopId) {
                                    // Check for stop-level cancellation
                                    const isStopCancelled = stopTimeUpdate.scheduleRelationship === 1; // SKIPPED = 1

                                    realtimeUpdates[tripUpdate.trip.tripId as string] = {
                                        arrival: stopTimeUpdate.arrival ?? undefined,
                                        departure: stopTimeUpdate.departure ?? undefined,
                                        delay: stopTimeUpdate.arrival?.delay || stopTimeUpdate.departure?.delay || 0,
                                        isCancelled: isTripCancelled || isStopCancelled
                                    };
                                }
                            });
                        }
                    }
                });
            }
        } catch {
            // Real-time data fetch failed - will fallback to static schedule
        }

        // 2. Merge with Static Schedule
        // The static schedule is for a specific date (e.g., 20251126). 
        // We need to shift it to the current date to make it relevant.

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMidnight = Math.floor(today.getTime() / 1000);

        // Get the date from the first item in the schedule
        const scheduleDateStr = (staticSchedule as any[])[0]?.date || "20251126";
        const sYear = parseInt(scheduleDateStr.substring(0, 4));
        const sMonth = parseInt(scheduleDateStr.substring(4, 6)) - 1;
        const sDay = parseInt(scheduleDateStr.substring(6, 8));
        const scheduleDate = new Date(sYear, sMonth, sDay);
        scheduleDate.setHours(0, 0, 0, 0);
        const scheduleMidnight = Math.floor(scheduleDate.getTime() / 1000);

        const timeOffset = todayMidnight - scheduleMidnight;

        const combinedUpdates = staticSchedule
            .map((item: any) => ({
                ...item,
                arrival: item.arrival + timeOffset,
                departure: item.departure + timeOffset
            }))
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
                    departure: item.departure + timeOffset,
                    delay: delay,
                    isRealtime: isRealtime,
                    isCancelled: rt?.isCancelled || false,
                    headsign: item.headsign,
                    direction: item.direction
                };
            });

        // Sort by arrival time
        combinedUpdates.sort((a: any, b: any) => a.arrival - b.arrival);

        // Filter to keep only next 20 buses
        const nextBuses = combinedUpdates.filter((u: any) => u.arrival > now - 60).slice(0, 20);

        return NextResponse.json({ updates: nextBuses, timestamp: now });
    } catch {
        return NextResponse.json({ error: 'Failed to process data' }, { status: 500 });
    }
}
