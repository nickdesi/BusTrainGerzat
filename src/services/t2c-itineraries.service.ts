import { apiLogger } from '@/lib/logger';
import { BusUpdate } from '@/types/transport';
import { getNowUnix, parseParisTime } from '@/utils/date';

const T2C_ITINERARIES_URL = 'https://api.t2c.fr/siv/itineraries';
const GERZAT_CHAMPFLEURI_XY = '3.147658,45.835345';
const ESPLANADE_XY = '3.095336,45.777557';
const MAX_MATCHES = '5';

const PARIS_MINUTE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    hour12: false,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

type ItineraryTransportStep = {
    type: 'transport';
    departure_time?: string;
    arrival_time?: string;
    line_name?: string;
    line_short_name?: string;
    line_direction?: string;
    departure_stop_name?: string;
};

type ItineraryStep = {
    type: string;
    departure_time?: string;
    arrival_time?: string;
    line_name?: string;
    line_short_name?: string;
    line_direction?: string;
    departure_stop_name?: string;
};

type T2CItinerary = {
    id: string;
    departure_time?: string;
    arrival_time?: string;
    departure_place_name?: string;
    steps?: ItineraryStep[];
};

type ParisDateParts = {
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
};

function getParisDateParts(date = new Date()): ParisDateParts {
    const parts = PARIS_MINUTE_FORMATTER.formatToParts(date);
    let year = '1970';
    let month = '01';
    let day = '01';
    let hour = '00';
    let minute = '00';

    for (const part of parts) {
        if (part.type === 'year') year = part.value;
        else if (part.type === 'month') month = part.value;
        else if (part.type === 'day') day = part.value;
        else if (part.type === 'hour') hour = part.value;
        else if (part.type === 'minute') minute = part.value;
    }

    return { year, month, day, hour, minute };
}

function getDepartureTimeParam(date = new Date()): string {
    const { year, month, day, hour, minute } = getParisDateParts(date);
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getParisDateToken(date = new Date()): string {
    const { year, month, day } = getParisDateParts(date);
    return `${year}${month}${day}`;
}

function parseClockToUnix(dateToken: string, clock: string | undefined): number {
    if (!clock) return 0;

    const [hourRaw, minuteRaw] = clock.split(':');
    if (!hourRaw || !minuteRaw) return 0;

    const hour = hourRaw.padStart(2, '0');
    const minute = minuteRaw.padStart(2, '0');
    return parseParisTime(`${dateToken}T${hour}${minute}00`);
}

function inferDirection(headsign: string): number {
    return headsign.toUpperCase().includes('GERZAT') ? 1 : 0;
}

function isE1TransportStep(step: ItineraryStep): step is ItineraryTransportStep {
    if (step.type !== 'transport') return false;
    const line = (step.line_short_name || step.line_name || '').trim().toUpperCase();
    return line === 'E1';
}

export function mapT2CItinerariesToBusUpdates(itineraries: T2CItinerary[], dateToken: string): BusUpdate[] {
    const updates: BusUpdate[] = [];

    for (const itinerary of itineraries) {
        if (!Array.isArray(itinerary.steps)) continue;

        for (let stepIndex = 0; stepIndex < itinerary.steps.length; stepIndex++) {
            const step = itinerary.steps[stepIndex];
            if (!isE1TransportStep(step)) continue;

            const departure = parseClockToUnix(dateToken, step.departure_time || itinerary.departure_time);
            let arrival = parseClockToUnix(dateToken, step.arrival_time || itinerary.arrival_time);

            if (departure <= 0 || arrival <= 0) continue;
            if (arrival < departure) arrival += 24 * 60 * 60;

            const headsign = step.line_direction || 'AUBIÈRE Pl. des Ramacles';
            const origin = step.departure_stop_name || itinerary.departure_place_name || 'GERZAT Champfleuri';

            updates.push({
                tripId: `t2c-itinerary-${itinerary.id}-${stepIndex}`,
                arrival,
                departure,
                delay: 0,
                isRealtime: true,
                isCancelled: false,
                headsign,
                direction: inferDirection(headsign),
                origin,
                stopId: 'GERZAT_CHAMPFLEURI',
            });
        }
    }

    return updates;
}

export async function getT2CItinerariesRealtime(): Promise<{ updates: BusUpdate[]; timestamp: number; rtAvailable: boolean }> {
    const timestamp = getNowUnix();

    try {
        const query = new URLSearchParams({
            departure_xy: GERZAT_CHAMPFLEURI_XY,
            arrival_xy: ESPLANADE_XY,
            departure_time: getDepartureTimeParam(),
            max_matches: MAX_MATCHES,
        });

        const response = await fetch(`${T2C_ITINERARIES_URL}?${query.toString()}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            apiLogger.warn('T2C itineraries fallback request failed', { status: response.status });
            return { updates: [], timestamp, rtAvailable: false };
        }

        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) {
            return { updates: [], timestamp, rtAvailable: false };
        }

        const updates = mapT2CItinerariesToBusUpdates(payload as T2CItinerary[], getParisDateToken())
            .sort((a, b) => a.arrival - b.arrival)
            .slice(0, 20);

        return { updates, timestamp, rtAvailable: true };
    } catch (error) {
        apiLogger.warn('T2C itineraries fallback error', undefined);
        return { updates: [], timestamp, rtAvailable: false };
    }
}
