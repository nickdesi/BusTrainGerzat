import { TrainUpdate } from '@/types/transport';

const SNCF_API_KEY = process.env.SNCF_API_KEY;
const GERZAT_STOP_AREA = 'stop_area:SNCF:87734046';

// --- SNCF API Types ---

interface SncfLink {
    type?: string;
    rel?: string;
    id?: string;
}

interface SncfDeparture {
    stop_date_time: {
        departure_date_time: string;
        arrival_date_time: string;
        base_departure_date_time: string;
        data_freshness?: string;
    };
    display_informations: {
        trip_short_name?: string;
        headsign?: string;
        direction?: string;
        physical_mode?: string;
        commercial_mode?: string;
        links?: SncfLink[];
    };
    links?: SncfLink[];
}

interface SncfOrigin {
    id: string;
    name: string;
}

interface SncfApiResponse {
    departures?: SncfDeparture[];
    origins?: SncfOrigin[];
}

// --- Helpers ---

function parseSncfDateTime(dateTimeStr: string): number {
    const year = parseInt(dateTimeStr.slice(0, 4));
    const month = parseInt(dateTimeStr.slice(4, 6)) - 1;
    const day = parseInt(dateTimeStr.slice(6, 8));
    const hour = parseInt(dateTimeStr.slice(9, 11));
    const minute = parseInt(dateTimeStr.slice(11, 13));
    const second = parseInt(dateTimeStr.slice(13, 15));
    return Math.floor(new Date(year, month, day, hour, minute, second).getTime() / 1000);
}

// --- Service ---

export async function getTrainData(): Promise<{ updates: TrainUpdate[], timestamp: number, error?: string, debug?: Record<string, unknown> }> {
    try {
        const now = Math.floor(Date.now() / 1000);
        if (!SNCF_API_KEY) {
            return { updates: [], timestamp: now, error: 'SNCF_API_KEY_MISSING' };
        }

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
        const debugInfo: Record<string, unknown> = {};

        if (baseScheduleRes.ok) {
            const baseScheduleData = await baseScheduleRes.json();
            const realtimeTrainIds = new Set<string>();

            if (realtimeRes.ok) {
                const realtimeData = await realtimeRes.json() as SncfApiResponse;
                realtimeData.departures?.forEach((dep: SncfDeparture) => {
                    const vehicleJourneyId = dep.links?.find((l: SncfLink) => l.type === 'vehicle_journey')?.id;
                    if (vehicleJourneyId) realtimeTrainIds.add(vehicleJourneyId);
                });
            }

            (baseScheduleData as SncfApiResponse).departures?.forEach((dep: SncfDeparture) => {
                const stopDateTime = dep.stop_date_time;
                const displayInfo = dep.display_informations;
                const departureTime = parseSncfDateTime(stopDateTime.departure_date_time);
                const arrivalTime = parseSncfDateTime(stopDateTime.arrival_date_time);
                const baseDepartureTime = parseSncfDateTime(stopDateTime.base_departure_date_time);
                const delay = departureTime - baseDepartureTime;

                let origin = 'Inconnu';
                const originLink = displayInfo.links?.find((l: SncfLink) => l.rel === 'origins');
                if (originLink) {
                    const originData = (baseScheduleData as SncfApiResponse).origins?.find((o: SncfOrigin) => o.id === originLink.id);
                    if (originData) origin = originData.name;
                }

                const vehicleJourneyId = dep.links?.find((l: SncfLink) => l.type === 'vehicle_journey')?.id;
                const isInRealtime = vehicleJourneyId ? realtimeTrainIds.has(vehicleJourneyId) : true;
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

        const futureUpdates = updates
            .filter(u => Number(u.departure.time) > now - 60)
            .sort((a, b) => Number(a.departure.time) - Number(b.departure.time));

        return { updates: futureUpdates, timestamp: now, debug: debugInfo };
    } catch (e) {
        console.error('getTrainData error:', e);
        return { updates: [], timestamp: Math.floor(Date.now() / 1000), error: 'FETCH_FAILED' };
    }
}
