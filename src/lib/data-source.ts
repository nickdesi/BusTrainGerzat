import { fetchTripUpdates } from '@/lib/gtfs-rt';
import staticSchedule from '@/data/static_schedule.json';
import gtfsConfig from '@/data/gtfs_config.json';
import e1StopTimes from '../../public/data/e1_stop_times.json';
import lineE1Data from '../../public/data/lineE1_data.json';

// --- Types ---
export interface BusUpdate {
    tripId: string;
    arrival: number; // Unix timestamp
    departure: number; // Unix timestamp
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
    headsign: string;
    direction: number;
    origin: string; // First stop name (e.g., Ballainvilliers for Express)
}

// --- GTFS Lookups ---
// Create stopId -> stopName lookup from lineE1Data
const stopNameById = new Map<string, string>(
    lineE1Data.stops.map((s: { stopId: string; stopName: string }) => [s.stopId, s.stopName])
);

// Create tripId -> origin (first stop name) lookup from e1_stop_times
interface E1Trip { tripId: string; stops: { stopId: string; sequence: number }[] }
const tripOrigins = new Map<string, string>();
for (const trip of e1StopTimes as E1Trip[]) {
    if (trip.stops && trip.stops.length > 0) {
        const firstStopId = trip.stops[0].stopId;
        const originName = stopNameById.get(firstStopId) || firstStopId;
        tripOrigins.set(trip.tripId, originName);
    }
}

export interface TrainUpdate {
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

// Internal types for static schedule
interface StaticScheduleItem {
    tripId: string;
    arrival: number;
    departure: number;
    headsign: string;
    direction: number;
    date: string;
    stopId?: string; // Added for precise matching
}


// SNCF API types
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

// --- BUS LOGIC ---

export async function getBusData(): Promise<{ updates: BusUpdate[], timestamp: number }> {
    try {
        const now = Math.floor(Date.now() / 1000);

        // 1. Fetch Real-time Data using shared service
        // Map<tripId, RTTripUpdate>
        const rtUpdates = await fetchTripUpdates();
        const realtimeUpdates = new Map<string, {
            tripCancelled: boolean;
            startDate?: string;
            stops: Map<string, {
                arrival?: { time?: number; delay?: number };
                departure?: { time?: number; delay?: number };
                delay: number;
                isSkipped: boolean;
            }>
        }>();

        const addedTrips: BusUpdate[] = [];

        // Dynamic Route Route IDs already handled by gtfs-rt.ts
        // Stop IDs used here for filtering legacy updates
        const targetStopIds = new Set([...gtfsConfig.stopIds.champfleuri, ...gtfsConfig.stopIds.patural]);

        for (const [tripId, update] of rtUpdates) {
            // 1. Handle Added Trips
            if (update.isAdded) {
                const stops = Array.from(update.stopUpdates.values());
                if (stops.length > 0) {
                    // Direction 0 = leaving Gerzat (first stop is Gerzat estimate)
                    // Direction 1 = arriving at Gerzat (last stop is Gerzat estimate)
                    const gerzatStop = update.directionId === 0 ? stops[0] : stops[stops.length - 1];

                    // Convert to milliseconds-based structure if needed, or keeping it as unix timestamp (seconds)
                    // BusUpdate expects simple numbers. 'arrival' in BusUpdate is unix timestamp.
                    // RTStopUpdate.predictedTime is unix timestamp (seconds).
                    const arrivalTime = gerzatStop.predictedTime;
                    const arrivalDelay = gerzatStop.delay;

                    if (arrivalTime) {
                        addedTrips.push({
                            tripId: tripId,
                            arrival: arrivalTime,
                            departure: arrivalTime,
                            delay: arrivalDelay || 0,
                            isRealtime: true,
                            isCancelled: false,
                            headsign: update.directionId === 0 ? 'AUBIÈRE Pl. des Ramacles' : 'GERZAT Champfleuri',
                            direction: update.directionId,
                            origin: tripOrigins.get(tripId) || 'Inconnu'
                        });
                    }
                }
            } else {
                // 2. Handle Scheduled/Cancelled Trips
                // Convert RTTripUpdate to local legacy structure for "Merge with Static" phase

                // We need to convert checks to the structure expected by Step 2.
                // Step 2 expects: Map<tripId, { tripCancelled, startDate, stops: Map<stopId, {arrival, departure, delay, isSkipped}> }>

                const stopsMap = new Map<string, {
                    arrival?: { time?: number; delay?: number };
                    departure?: { time?: number; delay?: number };
                    delay: number;
                    isSkipped: boolean;
                }>();

                for (const [stopId, stopUpd] of update.stopUpdates) {
                    if (targetStopIds.has(stopId)) {
                        stopsMap.set(stopId, {
                            arrival: stopUpd.predictedArrival ? { time: stopUpd.predictedArrival, delay: stopUpd.delay } : undefined,
                            departure: stopUpd.predictedDeparture ? { time: stopUpd.predictedDeparture, delay: stopUpd.delay } : undefined,
                            delay: stopUpd.delay,
                            isSkipped: stopUpd.isSkipped
                        });
                    }
                }

                realtimeUpdates.set(tripId, {
                    tripCancelled: update.isCancelled,
                    startDate: update.startDate,
                    stops: stopsMap
                });
            }
        }

        // 2. Merge with Static Schedule
        // Get today's date in YYYYMMDD format to filter schedules
        // FIX: Force Europe/Paris timezone to avoid server time issues (e.g. UTC shifting date)
        let todayDateStr = '';
        try {
            const formatter = new Intl.DateTimeFormat('fr-FR', {
                timeZone: 'Europe/Paris',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            // Format: "DD/MM/YYYY" -> "YYYYMMDD"
            const parts = formatter.formatToParts(new Date());
            const year = parts.find(p => p.type === 'year')?.value;
            const month = parts.find(p => p.type === 'month')?.value;
            const day = parts.find(p => p.type === 'day')?.value;

            todayDateStr = `${year}${month}${day}`;
        } catch (e) {
            console.error('Date formatting error (fallback to system time):', e);
            // Fallback to system time (safer than crashing)
            const today = new Date();
            todayDateStr = today.getFullYear().toString() +
                (today.getMonth() + 1).toString().padStart(2, '0') +
                today.getDate().toString().padStart(2, '0');
        }

        // Filter static schedule to only include today's entries
        const todaySchedule = (staticSchedule as StaticScheduleItem[])
            .filter((item: StaticScheduleItem) => item.date === todayDateStr);

        const combinedUpdates = todaySchedule
            .filter((item: StaticScheduleItem) => item.arrival > now - 600)
            .map((item: StaticScheduleItem) => {
                const rtTrip = realtimeUpdates.get(item.tripId);
                let arrival = item.arrival;
                let departure = item.departure;
                let delay = 0;
                let isRealtime = false;

                // Trip-level cancellation status
                let isCancelled = rtTrip?.tripCancelled || false;

                if (rtTrip) {
                    // Validate RT data matches this static entry
                    const rtStartDate = rtTrip.startDate;
                    const staticDate = item.date;
                    let shouldApplyRT = false;

                    if (rtStartDate && staticDate) {
                        shouldApplyRT = rtStartDate === staticDate;
                    } else {
                        // Fallback: check timestamp of ANY available stop update for this trip
                        // to ensure it's not a stale or future false match (e.g. next day same tripId?)
                        const firstStopUpdate = rtTrip.stops.values().next().value;
                        const rtTime = firstStopUpdate?.arrival?.time || firstStopUpdate?.departure?.time || 0;
                        shouldApplyRT = rtTime > 0 && Math.abs(rtTime - item.arrival) < 43200; // 12h window (relaxed)
                    }

                    if (shouldApplyRT) {
                        const stopId = item.stopId;
                        // Strict -> Fuzzy Matching: Check exact ID, then aliases
                        // RT feed might send GECH instead of GECHR
                        let rtStop = stopId ? rtTrip.stops.get(stopId) : undefined;

                        if (!rtStop && stopId) {
                            // Use shared utility for robust alias/group matching
                            // We need to convert our local legacy map-of-stops back to Map<string, RTStopUpdate> 
                            // This is silly. We should have used the original RTTripUpdate structure if possible.
                            // But for now, to minimize refactor risk:
                            // We don't have the original RTStopUpdate objects here, we have the simplified Objects.
                            // The shared `findStopUpdate` expects Map<string, RTStopUpdate>.
                            // Re-implementing simplified logic here is safer than converting types back and forth.

                            // 2. Group match (Champfleuri or Patural)
                            const isChampfleuri = gtfsConfig.stopIds.champfleuri.includes(stopId);
                            const isPatural = gtfsConfig.stopIds.patural.includes(stopId);

                            if (isChampfleuri) {
                                for (const id of gtfsConfig.stopIds.champfleuri) {
                                    rtStop = rtTrip.stops.get(id);
                                    if (rtStop) break;
                                }
                            } else if (isPatural) {
                                for (const id of gtfsConfig.stopIds.patural) {
                                    rtStop = rtTrip.stops.get(id);
                                    if (rtStop) break;
                                }
                            }
                        }

                        if (rtStop) {
                            isRealtime = true;

                            if (rtStop.arrival?.time) {
                                arrival = Number(rtStop.arrival.time);
                            } else if (rtStop.departure?.time) {
                                arrival = Number(rtStop.departure.time);
                            }

                            if (rtStop.departure?.time) {
                                departure = Number(rtStop.departure.time);
                            } else if (rtStop.arrival?.time) {
                                const dwell = item.departure - item.arrival;
                                departure = Number(rtStop.arrival.time) + (dwell > 0 ? dwell : 0);
                            }

                            delay = rtStop.delay;

                            // FIX: If API reports 0 delay but time matches shifted schedule (e.g. 12:05 -> 12:10),
                            // manually calculate delay to alert user (show "RETARD 5 min" instead of "A L'HEURE")
                            if (delay === 0) {
                                const calculatedDelay = arrival - item.arrival;
                                if (Math.abs(calculatedDelay) >= 60) {
                                    delay = calculatedDelay;
                                }
                            }

                            if (rtStop.isSkipped) isCancelled = true;

                        } else {
                            // Trip exists in RT but no update for this stop.
                            // If the global trip is NOT cancelled, it means the bus missed/passed this stop 
                            // or the feed doesn't have it.
                            // We do NOT set isRealtime=true to indicate we are falling back to static time.
                        }
                    }
                }

                // STRICT RULE: For "Le Patural", ONLY keep trips towards Ballainvilliers (Direction 0)
                // "L'arrêt 'Le Patural' (uniquement pour les bus express en direction de Ballainvilliers)"
                const paturalIds = new Set(gtfsConfig.stopIds.patural);
                const stopIdUpper = item.stopId?.toUpperCase() || '';

                if (paturalIds.has(stopIdUpper)) {
                    // If direction is NOT 0 (0 = usually Outbound/South towards Aubière/Ballainvilliers), skip
                    // Also ideally check headsign, but direction is a strong proxy.
                    if (item.direction === 1) { // Inbound
                        const headsignUpper = item.headsign.toUpperCase();
                        if (!headsignUpper.includes('PATURAL')) {
                            return null; // Not Express Inbound, skip
                        }
                    }
                    // Optional: Check headsign if known to be unrelated to Ballainvilliers? 
                    // For now, Direction 0 at Patural implies leaving Gerzat, which matches the criteria.
                }

                return {
                    tripId: item.tripId,
                    arrival: arrival,
                    departure: departure,
                    delay: delay,
                    isRealtime: isRealtime,
                    isCancelled: isCancelled,
                    headsign: item.headsign,
                    direction: item.direction,
                    origin: tripOrigins.get(item.tripId) || 'Inconnu'
                };
            })
            .filter((item): item is BusUpdate => item !== null); // Filter out nulls

        // Add ADDED trips (replacement trips from GTFS-RT)
        combinedUpdates.push(...addedTrips);

        // Deduplicate: Remove CANCELLED trips if there is an ADDED/Realtime trip 
        // in the same direction within a short time window (e.g., 20 mins).
        // This prevents showing "Annulé" + "En temps réel" for the same actual service.
        const cleanedUpdates: BusUpdate[] = [];
        const nonCancelled = combinedUpdates.filter(u => !u.isCancelled);

        combinedUpdates.forEach(u => {
            if (u.isCancelled) {
                // Check for replacement
                const replacement = nonCancelled.find(nc =>
                    nc.direction === u.direction &&
                    Math.abs(nc.arrival - u.arrival) < 20 * 60 // 20 min window
                );
                // Only keep cancelled if NO replacement found
                if (!replacement) {
                    cleanedUpdates.push(u);
                }
            } else {
                cleanedUpdates.push(u);
            }
        });

        cleanedUpdates.sort((a: BusUpdate, b: BusUpdate) => a.arrival - b.arrival);
        const nextBuses = cleanedUpdates.filter((u: BusUpdate) => u.arrival > now - 60).slice(0, 20);

        return { updates: nextBuses, timestamp: now };
    } catch (error) {
        console.error('getBusData error:', error);
        return { updates: [], timestamp: Math.floor(Date.now() / 1000) };
    }
}

// --- TRAIN LOGIC ---
const SNCF_API_KEY = process.env.SNCF_API_KEY;
const GERZAT_STOP_AREA = 'stop_area:SNCF:87734046';

function parseSncfDateTime(dateTimeStr: string): number {
    const year = parseInt(dateTimeStr.slice(0, 4));
    const month = parseInt(dateTimeStr.slice(4, 6)) - 1;
    const day = parseInt(dateTimeStr.slice(6, 8));
    const hour = parseInt(dateTimeStr.slice(9, 11));
    const minute = parseInt(dateTimeStr.slice(11, 13));
    const second = parseInt(dateTimeStr.slice(13, 15));
    return Math.floor(new Date(year, month, day, hour, minute, second).getTime() / 1000);
}

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
