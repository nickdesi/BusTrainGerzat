import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface TrainUpdate {
    tripId: string;
    trainNumber: string;
    direction: string;
    arrival: { time: string; delay: number };
    departure: { time: string; delay: number };
    delay: number;
    isRealtime: boolean;
}

export async function GET() {
    try {
        // 1. Load Static Schedule
        const now = Math.floor(Date.now() / 1000);
        const staticFilePath = path.join(process.cwd(), 'public', 'static_train_schedule.json');
        let staticSchedule: any[] = [];

        if (fs.existsSync(staticFilePath)) {
            const fileContent = fs.readFileSync(staticFilePath, 'utf-8');
            const allSchedules = JSON.parse(fileContent);
            // The new format is a flat array, so we just need to filter by time
            staticSchedule = allSchedules.filter((item: any) => item.arrival > now - 600);
        }

        // 2. Fetch Real-time Data
        let realtimeUpdates: any[] = [];
        try {
            const response = await fetch('https://proxy.transport.data.gouv.fr/resource/sncf-gtfs-rt-trip-updates', {
                cache: 'no-store',
            });

            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
                const gerzatCode = '87734046';

                feed.entity.forEach((entity) => {
                    if (entity.tripUpdate) {
                        const tripUpdate = entity.tripUpdate;
                        if (tripUpdate.stopTimeUpdate) {
                            tripUpdate.stopTimeUpdate.forEach((stopTimeUpdate) => {
                                if (stopTimeUpdate.stopId && stopTimeUpdate.stopId.includes(gerzatCode)) {
                                    const tripId = tripUpdate.trip.tripId || '';
                                    const match = tripId.match(/OCESN(\d+)/);
                                    let trainNumber = match ? match[1] : 'Inconnu';
                                    let direction = 'unknown';

                                    if (trainNumber !== 'Inconnu') {
                                        const num = parseInt(trainNumber, 10);
                                        direction = num % 2 !== 0 ? 'To Clermont' : 'From Clermont';
                                    }

                                    realtimeUpdates.push({
                                        tripId: tripUpdate.trip.tripId,
                                        trainNumber: trainNumber,
                                        direction: direction,
                                        arrival: stopTimeUpdate.arrival,
                                        departure: stopTimeUpdate.departure,
                                        delay: stopTimeUpdate.arrival?.delay || stopTimeUpdate.departure?.delay || 0,
                                    });
                                }
                            });
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Failed to fetch real-time data", e);
        }

        // 3. Merge Data
        const mergedUpdates: TrainUpdate[] = [];

        // Map real-time updates by tripId
        const realtimeMap = new Map();
        realtimeUpdates.forEach(u => realtimeMap.set(u.tripId, u));

        // Process static trips
        staticSchedule.forEach(staticTrip => {
            const rtUpdate = realtimeMap.get(staticTrip.tripId);

            let arrivalTime = staticTrip.arrival;
            let departureTime = staticTrip.departure;
            let delay = 0;
            let isRealtime = false;

            if (rtUpdate) {
                isRealtime = true;
                arrivalTime = rtUpdate.arrival?.time ? Number(rtUpdate.arrival.time) : arrivalTime;
                departureTime = rtUpdate.departure?.time ? Number(rtUpdate.departure.time) : departureTime;
                delay = rtUpdate.delay;
            }

            // Only add if in future (or recent past)
            if (arrivalTime > now - 300) {
                mergedUpdates.push({
                    tripId: staticTrip.tripId,
                    trainNumber: staticTrip.trainNumber,
                    direction: staticTrip.direction,
                    arrival: { time: arrivalTime.toString(), delay: delay },
                    departure: { time: departureTime.toString(), delay: delay },
                    delay: delay,
                    isRealtime: isRealtime
                });
            }
        });

        // Add any real-time updates that weren't in static (unlikely but possible)
        realtimeUpdates.forEach(rt => {
            if (!mergedUpdates.find(m => m.tripId === rt.tripId || m.trainNumber === rt.trainNumber)) {
                // Only add if in future
                const arrivalTime = rt.arrival?.time || rt.departure?.time || 0;
                if (Number(arrivalTime) > now - 300) {
                    mergedUpdates.push({
                        tripId: rt.tripId,
                        trainNumber: rt.trainNumber,
                        direction: rt.direction,
                        arrival: { time: arrivalTime.toString(), delay: rt.delay },
                        departure: { time: (rt.departure?.time || arrivalTime).toString(), delay: rt.delay },
                        delay: rt.delay,
                        isRealtime: true
                    });
                }
            }
        });

        // Sort by time
        mergedUpdates.sort((a, b) => Number(a.arrival.time) - Number(b.arrival.time));

        return NextResponse.json({ updates: mergedUpdates, timestamp: now });
    } catch (error) {
        console.error('Error fetching SNCF data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

