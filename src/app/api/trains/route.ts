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
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];
        const staticFilePath = path.join(process.cwd(), 'static_train_schedule.json');
        let staticSchedule: any[] = [];

        if (fs.existsSync(staticFilePath)) {
            const fileContent = fs.readFileSync(staticFilePath, 'utf-8');
            const allSchedules = JSON.parse(fileContent);
            staticSchedule = allSchedules[dateKey] || [];
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
        const now = Math.floor(Date.now() / 1000);

        // Map real-time updates by tripId (or trainNumber if tripId varies slightly)
        const realtimeMap = new Map();
        realtimeUpdates.forEach(u => realtimeMap.set(u.tripId, u));

        // Process static trips
        staticSchedule.forEach(staticTrip => {
            // Try to find matching real-time update
            // SNCF GTFS-RT tripIds usually match static tripIds
            let rtUpdate = realtimeMap.get(staticTrip.tripId);

            // If not found by exact ID, try by train number (heuristic)
            if (!rtUpdate) {
                rtUpdate = realtimeUpdates.find(u => u.trainNumber === staticTrip.trainNumber);
            }

            let arrivalTime = 0;
            let departureTime = 0;
            let delay = 0;
            let isRealtime = false;

            // Parse static time (HH:MM:SS) to timestamp
            const [h, m, s] = staticTrip.arrivalTime.split(':').map(Number);
            const tripDate = new Date(today);
            tripDate.setHours(h, m, s, 0);
            const staticTimestamp = Math.floor(tripDate.getTime() / 1000);

            if (rtUpdate) {
                isRealtime = true;
                arrivalTime = rtUpdate.arrival?.time ? Number(rtUpdate.arrival.time) : staticTimestamp;
                departureTime = rtUpdate.departure?.time ? Number(rtUpdate.departure.time) : staticTimestamp;
                delay = rtUpdate.delay;
            } else {
                arrivalTime = staticTimestamp;
                departureTime = staticTimestamp; // Approximation
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

