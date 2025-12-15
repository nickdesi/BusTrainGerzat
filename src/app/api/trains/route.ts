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

        // Fetch departures from SNCF API
        // Format: /coverage/{region}/stop_areas/{stop_area_id}/departures
        const [departuresRes, arrivalsRes] = await Promise.all([
            fetch(`https://api.sncf.com/v1/coverage/sncf/stop_areas/${GERZAT_STOP_AREA}/departures?count=20`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(SNCF_API_KEY + ':').toString('base64')}`
                },
                cache: 'no-store'
            }),
            fetch(`https://api.sncf.com/v1/coverage/sncf/stop_areas/${GERZAT_STOP_AREA}/arrivals?count=20`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(SNCF_API_KEY + ':').toString('base64')}`
                },
                cache: 'no-store'
            })
        ]);

        // Debug: Log response status
        console.log('SNCF API departures status:', departuresRes.status);
        console.log('SNCF API arrivals status:', arrivalsRes.status);

        const updates: TrainUpdate[] = [];
        const departuresUrl = `https://api.sncf.com/v1/coverage/sncf/stop_areas/${GERZAT_STOP_AREA}/departures?count=20`;
        let debugInfo: any = {
            departuresStatus: departuresRes.status,
            arrivalsStatus: arrivalsRes.status,
            apiKeyConfigured: true,
            requestUrl: departuresUrl
        };

        // If not OK, get the error response body
        if (!departuresRes.ok) {
            try {
                const errorBody = await departuresRes.json();
                debugInfo.errorBody = errorBody;
            } catch {
                debugInfo.errorBody = 'Could not parse error response';
            }
        }

        if (departuresRes.ok) {
            const departuresData = await departuresRes.json();
            debugInfo.departuresCount = departuresData.departures?.length || 0;
            debugInfo.rawError = departuresData.error || null;

            departuresData.departures?.forEach((dep: any) => {
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
                    // Extract origin name from departures data origins array
                    const originData = departuresData.origins?.find((o: any) => o.id === originLink.id);
                    if (originData) {
                        origin = originData.name;
                    }
                }

                // Detect cancellation from display_informations or data_freshness
                const isCancelled = displayInfo.physical_mode === 'Cancelled' ||
                    stopDateTime.data_freshness === 'deleted' ||
                    dep.display_informations?.commercial_mode === 'Supprimé';

                updates.push({
                    tripId: dep.links?.find((l: any) => l.type === 'vehicle_journey')?.id || '',
                    trainNumber: displayInfo.trip_short_name || displayInfo.headsign || 'Inconnu',
                    direction: displayInfo.direction?.replace(/ \([^)]+\)$/, '') || 'Inconnu', // Remove "(City)" suffix
                    origin: origin,
                    arrival: { time: arrivalTime.toString(), delay },
                    departure: { time: departureTime.toString(), delay },
                    delay,
                    isRealtime: stopDateTime.data_freshness === 'realtime',
                    isCancelled
                });
            });
        }

        // Sort by departure time
        updates.sort((a, b) => Number(a.departure.time) - Number(b.departure.time));

        // Filter to only future departures
        const futureUpdates = updates.filter(u => Number(u.departure.time) > now - 60);

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
