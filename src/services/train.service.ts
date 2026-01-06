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

        // Prioritize realtime data, use base_schedule only for missing trains
        const baseScheduleData = baseScheduleRes.ok ? await baseScheduleRes.json() as SncfApiResponse : null;
        const realtimeData = realtimeRes.ok ? await realtimeRes.json() as SncfApiResponse : null;

        const processedTripIds = new Set<string>();

        // First, process realtime data (these have actual delays/status)
        if (realtimeData?.departures) {
            for (const dep of realtimeData.departures) {
                const stopDateTime = dep.stop_date_time;
                const displayInfo = dep.display_informations;
                const departureTime = parseSncfDateTime(stopDateTime.departure_date_time);
                const arrivalTime = parseSncfDateTime(stopDateTime.arrival_date_time);
                const baseDepartureTime = parseSncfDateTime(stopDateTime.base_departure_date_time);
                const delay = departureTime - baseDepartureTime;

                let origin = 'Inconnu';
                const originLink = displayInfo.links?.find((l: SncfLink) => l.rel === 'origins');
                if (originLink) {
                    const originData = realtimeData.origins?.find((o: SncfOrigin) => o.id === originLink.id);
                    if (originData) origin = originData.name;
                }

                const vehicleJourneyId = dep.links?.find((l: SncfLink) => l.type === 'vehicle_journey')?.id;
                if (vehicleJourneyId) processedTripIds.add(vehicleJourneyId);

                const isCancelled =
                    stopDateTime.data_freshness === 'deleted' ||
                    displayInfo.physical_mode === 'Cancelled' ||
                    dep.display_informations?.commercial_mode === 'Supprimé';

                updates.push({
                    tripId: vehicleJourneyId || '',
                    trainNumber: displayInfo.trip_short_name || displayInfo.headsign || 'Inconnu',
                    direction: displayInfo.direction?.replace(/ \([^)]+\)$/, '') || 'Inconnu',
                    origin: origin,
                    arrival: { time: arrivalTime.toString(), delay },
                    departure: { time: departureTime.toString(), delay },
                    delay,
                    isRealtime: true,
                    isCancelled
                });
            }
        }

        // Then, add trains from base_schedule that are NOT in realtime (likely cancelled)
        if (baseScheduleData?.departures) {
            for (const dep of baseScheduleData.departures) {
                const vehicleJourneyId = dep.links?.find((l: SncfLink) => l.type === 'vehicle_journey')?.id;
                
                // Skip if already processed from realtime
                if (vehicleJourneyId && processedTripIds.has(vehicleJourneyId)) continue;

                const stopDateTime = dep.stop_date_time;
                const displayInfo = dep.display_informations;
                const departureTime = parseSncfDateTime(stopDateTime.departure_date_time);
                const arrivalTime = parseSncfDateTime(stopDateTime.arrival_date_time);

                let origin = 'Inconnu';
                const originLink = displayInfo.links?.find((l: SncfLink) => l.rel === 'origins');
                if (originLink) {
                    const originData = baseScheduleData.origins?.find((o: SncfOrigin) => o.id === originLink.id);
                    if (originData) origin = originData.name;
                }

                // Train in base_schedule but not in realtime = likely cancelled or not confirmed
                const isCancelled = processedTripIds.size > 0; // If we have realtime data, missing trains are cancelled

                updates.push({
                    tripId: vehicleJourneyId || '',
                    trainNumber: displayInfo.trip_short_name || displayInfo.headsign || 'Inconnu',
                    direction: displayInfo.direction?.replace(/ \([^)]+\)$/, '') || 'Inconnu',
                    origin: origin,
                    arrival: { time: arrivalTime.toString(), delay: 0 },
                    departure: { time: departureTime.toString(), delay: 0 },
                    delay: 0,
                    isRealtime: false,
                    isCancelled
                });
            }
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
