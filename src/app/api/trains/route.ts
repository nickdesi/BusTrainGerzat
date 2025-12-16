import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SNCF_API_KEY = process.env.SNCF_API_KEY;
const GERZAT_STOP_AREA = 'stop_area:SNCF:87734046';

interface TrainUpdate {
    tripId: string;
    trainNumber: string;
    direction: string;
    origin: string;
    arrival: { time: string; delay: number };
    departure: { time: string; delay: number };
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
}

function parseSncfDateTime(dateTimeStr: string): number {
    // Format: "20251214T165500"
    const year = parseInt(dateTimeStr.slice(0, 4));
    const month = parseInt(dateTimeStr.slice(4, 6)) - 1;
    const day = parseInt(dateTimeStr.slice(6, 8));
    const hour = parseInt(dateTimeStr.slice(9, 11));
    const minute = parseInt(dateTimeStr.slice(11, 13));
    const second = parseInt(dateTimeStr.slice(13, 15));
    return Math.floor(new Date(year, month, day, hour, minute, second).getTime() / 1000);
}

export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);

        // Debug: Check if API key is configured
        if (!SNCF_API_KEY) {
            console.error('SNCF_API_KEY is not configured');
            return NextResponse.json({
                error: 'SNCF_API_KEY not configured',
                updates: [],
                debug: { apiKeyConfigured: false }
            }, { status: 500 });
        }

        // Strategy: Fetch both base_schedule and realtime data
        // Trains in base_schedule but NOT in realtime are cancelled
        const authHeader = `Basic ${Buffer.from(SNCF_API_KEY + ':').toString('base64')}`;

        const [baseScheduleRes, realtimeRes] = await Promise.all([
            fetch(`https://api.sncf.com/v1/coverage/sncf/stop_areas/${GERZAT_STOP_AREA}/departures?count=30&data_freshness=base_schedule`, {
                headers: { 'Authorization': authHeader },
                cache: 'no-store'
            }),
            fetch(`https://api.sncf.com/v1/coverage/sncf/stop_areas/${GERZAT_STOP_AREA}/departures?count=30&data_freshness=realtime`, {
                headers: { 'Authorization': authHeader },
                cache: 'no-store'
            })
        ]);



        const updates: TrainUpdate[] = [];
        let debugInfo: any = {
            baseScheduleStatus: baseScheduleRes.status,
            realtimeStatus: realtimeRes.status,
            apiKeyConfigured: true,
        };

        // If not OK, get the error response body
        if (!baseScheduleRes.ok) {
            try {
                const errorBody = await baseScheduleRes.json();
                debugInfo.errorBody = errorBody;
            } catch {
                debugInfo.errorBody = 'Could not parse error response';
            }
        }

        if (baseScheduleRes.ok) {
            const baseScheduleData = await baseScheduleRes.json();

            // Get realtime train IDs to check which ones are cancelled
            let realtimeTrainIds = new Set<string>();
            if (realtimeRes.ok) {
                const realtimeData = await realtimeRes.json();
                realtimeData.departures?.forEach((dep: any) => {
                    const vehicleJourneyId = dep.links?.find((l: any) => l.type === 'vehicle_journey')?.id;
                    if (vehicleJourneyId) {
                        realtimeTrainIds.add(vehicleJourneyId);
                    }
                });
                debugInfo.realtimeCount = realtimeData.departures?.length || 0;
            }

            debugInfo.baseScheduleCount = baseScheduleData.departures?.length || 0;
            debugInfo.rawError = baseScheduleData.error || null;

            baseScheduleData.departures?.forEach((dep: any) => {
                const stopDateTime = dep.stop_date_time;
                const displayInfo = dep.display_informations;

                const departureTime = parseSncfDateTime(stopDateTime.departure_date_time);
                const arrivalTime = parseSncfDateTime(stopDateTime.arrival_date_time);
                const baseDepartureTime = parseSncfDateTime(stopDateTime.base_departure_date_time);

                // Calculate delay in seconds
                const delay = departureTime - baseDepartureTime;

                // Get origin from links
                let origin = 'Inconnu';
                const originLink = displayInfo.links?.find((l: any) => l.rel === 'origins');
                if (originLink) {
                    const originData = baseScheduleData.origins?.find((o: any) => o.id === originLink.id);
                    if (originData) {
                        origin = originData.name;
                    }
                }

                // Get vehicle journey ID to check if train is in realtime list
                const vehicleJourneyId = dep.links?.find((l: any) => l.type === 'vehicle_journey')?.id;

                // Train is cancelled if:
                // 1. data_freshness is 'deleted' OR
                // 2. It's in base_schedule but NOT in realtime (meaning it was removed)
                const isInRealtime = vehicleJourneyId ? realtimeTrainIds.has(vehicleJourneyId) : true;
                // Train is cancelled if deleted, physical mode is Cancelled, or not present in realtime data
                const isCancelled =
                    stopDateTime.data_freshness === 'deleted' ||
                    displayInfo.physical_mode === 'Cancelled' ||
                    dep.display_informations?.commercial_mode === 'Supprimé' ||
                    (!isInRealtime && realtimeTrainIds.size > 0);

                updates.push({
                    tripId: vehicleJourneyId || '',
                    trainNumber: displayInfo.trip_short_name || displayInfo.headsign || 'Inconnu',
                    direction: displayInfo.direction?.replace(/ \([^)]+\)$/, '') || 'Inconnu',
                    origin: origin,
                    arrival: { time: arrivalTime.toString(), delay },
                    departure: { time: departureTime.toString(), delay },
                    delay,
                    isRealtime: isInRealtime && stopDateTime.data_freshness === 'realtime',
                    isCancelled
                });
            });
        }

        // Filter to only future departures first (Efficiency: Reduce arrays size before sorting)
        const futureUpdates = updates.filter(u => Number(u.departure.time) > now - 60);

        // Sort by departure time
        futureUpdates.sort((a, b) => Number(a.departure.time) - Number(b.departure.time));

        // Include debug info if no updates found
        if (futureUpdates.length === 0) {
            return NextResponse.json({
                updates: futureUpdates,
                timestamp: now,
                debug: debugInfo
            });
        }

        return NextResponse.json({ updates: futureUpdates, timestamp: now });
    } catch (error) {
        console.error('Error fetching SNCF data:', error);
        return NextResponse.json({ error: 'Failed to fetch data', updates: [], debug: { error: String(error) } }, { status: 500 });
    }
}
