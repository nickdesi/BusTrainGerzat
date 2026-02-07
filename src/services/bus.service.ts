import { fetchTripUpdates } from '@/lib/gtfs-rt';
import { BusUpdate } from '@/types/transport';

// --- Internal Types ---

interface StaticScheduleItem {
    tripId: string;
    arrival: number;
    departure: number;
    headsign: string;
    direction: number;
    date: string;
    stopId?: string; // Added for precise matching
}

// --- Lazy-loaded Data (reduces cold start time) ---

// Cache for lazy-loaded modules
let _staticSchedule: StaticScheduleItem[] | null = null;
let _gtfsConfig: {
    stopIds: {
        all: string[];
        champfleuri: string[];
        patural: string[]
    }
} | null = null;
let _stopNameById: Map<string, string> | null = null;
let _tripOrigins: Map<string, string> | null = null;

async function getStaticSchedule(): Promise<StaticScheduleItem[]> {
    if (!_staticSchedule) {
        _staticSchedule = (await import('@/data/static_schedule.json')).default;
    }
    return _staticSchedule;
}

async function getGtfsConfig(): Promise<{ stopIds: { all: string[]; champfleuri: string[]; patural: string[] } }> {
    if (!_gtfsConfig) {
        _gtfsConfig = (await import('@/data/gtfs_config.json')).default;
    }
    return _gtfsConfig!;
}

async function getStopNameById(): Promise<Map<string, string>> {
    if (!_stopNameById) {
        const lineE1Data = (await import('../../public/data/lineE1_data.json')).default;
        _stopNameById = new Map<string, string>(
            lineE1Data.stops.map((s: { stopId: string; stopName: string }) => [s.stopId, s.stopName])
        );
    }
    return _stopNameById;
}

async function getTripOrigins(): Promise<Map<string, string>> {
    if (!_tripOrigins) {
        const e1StopTimes = (await import('../../public/data/e1_stop_times.json')).default;
        const stopNameById = await getStopNameById();
        _tripOrigins = new Map<string, string>();
        interface E1Trip { tripId: string; stops: { stopId: string; sequence: number }[] }
        for (const trip of e1StopTimes as E1Trip[]) {
            if (trip.stops && trip.stops.length > 0) {
                const firstStopId = trip.stops[0].stopId;
                const originName = stopNameById.get(firstStopId) || firstStopId;
                _tripOrigins.set(trip.tripId, originName);
            }
        }
    }
    return _tripOrigins;
}

// --- Service ---

export async function getBusData(): Promise<{ updates: BusUpdate[], timestamp: number }> {
    try {
        const now = Math.floor(Date.now() / 1000);

        // Lazy load data on first use (reduces cold start time)
        const [staticSchedule, gtfsConfig, tripOrigins] = await Promise.all([
            getStaticSchedule(),
            getGtfsConfig(),
            getTripOrigins()
        ]);

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
        // Filter based on timestamp only (not date) to show upcoming buses including tomorrow
        // Build fuzzy tripId lookup: T2C's static GTFS and GTFS-RT use different service_ids
        // Static: 1132_1000001_03GC.AR_183100, RT: 1132_1000005_03GC.AR_183100
        // We match on the pattern after the service_id: "03GC.AR_183100"
        const extractTripPattern = (tripId: string) => tripId.split('_').slice(2).join('_');
        const rtByPattern = new Map<string, typeof realtimeUpdates extends Map<string, infer V> ? V : never>();
        for (const [tripId, update] of realtimeUpdates) {
            const pattern = extractTripPattern(tripId);
            if (!rtByPattern.has(pattern)) {
                rtByPattern.set(pattern, update);
            }
        }

        // Filter: show buses arriving in the future (or departed less than 10 min ago)
        const upcomingSchedule = (staticSchedule as StaticScheduleItem[])
            .filter((item: StaticScheduleItem) => item.arrival > now - 600);

        const combinedUpdates = upcomingSchedule
            .map((item: StaticScheduleItem) => {
                // Try exact match first, then fuzzy pattern match
                let rtTrip = realtimeUpdates.get(item.tripId);
                if (!rtTrip) {
                    const pattern = extractTripPattern(item.tripId);
                    rtTrip = rtByPattern.get(pattern);
                }

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
