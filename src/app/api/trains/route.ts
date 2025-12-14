import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SNCF_API_KEY = process.env.SNCF_API_KEY || 'ade4c333-d247-48cd-bb87-3ca56f059a94';
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

        // Fetch departures from SNCF API
        const [departuresRes, arrivalsRes] = await Promise.all([
            fetch(`https://api.sncf.com/v1/coverage/sncf/${GERZAT_STOP_AREA}/departures?count=20`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(SNCF_API_KEY + ':').toString('base64')}`
                },
                cache: 'no-store'
            }),
            fetch(`https://api.sncf.com/v1/coverage/sncf/${GERZAT_STOP_AREA}/arrivals?count=20`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(SNCF_API_KEY + ':').toString('base64')}`
                },
                cache: 'no-store'
            })
        ]);

        const updates: TrainUpdate[] = [];

        if (departuresRes.ok) {
            const departuresData = await departuresRes.json();

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

                updates.push({
                    tripId: dep.links?.find((l: any) => l.type === 'vehicle_journey')?.id || '',
                    trainNumber: displayInfo.trip_short_name || displayInfo.headsign || 'Inconnu',
                    direction: displayInfo.direction?.replace(/ \([^)]+\)$/, '') || 'Inconnu', // Remove "(City)" suffix
                    origin: origin,
                    arrival: { time: arrivalTime.toString(), delay },
                    departure: { time: departureTime.toString(), delay },
                    delay,
                    isRealtime: stopDateTime.data_freshness === 'realtime'
                });
            });
        }

        // Sort by departure time
        updates.sort((a, b) => Number(a.departure.time) - Number(b.departure.time));

        // Filter to only future departures
        const futureUpdates = updates.filter(u => Number(u.departure.time) > now - 60);

        return NextResponse.json({ updates: futureUpdates, timestamp: now });
    } catch (error) {
        console.error('Error fetching SNCF data:', error);
        return NextResponse.json({ error: 'Failed to fetch data', updates: [] }, { status: 500 });
    }
}
