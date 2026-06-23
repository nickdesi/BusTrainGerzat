import { fetchTripUpdatesWithStatus } from '@/lib/gtfs-rt';
import { BusUpdate } from '@/types/transport';
import { getNowUnix, isT2CNoServiceDay } from '@/utils/date';
import { extractTripPattern, getEffectiveDelay } from '@/services/t2c-line-e1.service';
import { apiLogger } from '@/lib/logger';

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

type LegacyRtStop = {
    arrival?: { time?: number; delay?: number };
    departure?: { time?: number; delay?: number };
    delay: number;
    isSkipped: boolean;
};

import { RTStopUpdate } from '@/lib/gtfs-rt';

type AddedTripStop = RTStopUpdate;

const RT_FALLBACK_MATCH_WINDOW_SECONDS = 3 * 60 * 60;

function isValidUnixTimestamp(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
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
        // ⚡ Bolt: Populate Map using for loop to avoid intermediate array allocations
        _stopNameById = new Map<string, string>();
        for (const s of lineE1Data.stops) {
            _stopNameById.set(s.stopId, s.stopName);
        }
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

let TARGET_STOP_IDS_SET_CACHE: Set<string> | null = null;
let CHAMPFLEURI_IDS_SET_CACHE: Set<string> | null = null;
let PATURAL_IDS_SET_CACHE: Set<string> | null = null;

export function findRelevantStopUpdate(
    stops: Map<string, LegacyRtStop>,
    stopId: string | undefined,
    champfleuriIds: Set<string>,
    paturalIds: Set<string>
): LegacyRtStop | undefined {
    if (!stopId) return undefined;

    const exact = stops.get(stopId);
    if (exact) return exact;

    if (champfleuriIds.has(stopId)) {
        for (const id of champfleuriIds) {
            const update = stops.get(id);
            if (update) return update;
        }
    } else if (paturalIds.has(stopId)) {
        for (const id of paturalIds) {
            const update = stops.get(id);
            if (update) return update;
        }
    }

    return undefined;
}

export function shouldKeepPaturalTrip(item: Pick<StaticScheduleItem, 'stopId' | 'direction' | 'headsign'>, paturalStopIds: Set<string>): boolean {
    const stopIdUpper = item.stopId?.toUpperCase() || '';
    if (!paturalStopIds.has(stopIdUpper)) return true;
    if (item.direction !== 1) return true;
    return item.headsign.toUpperCase().includes('PATURAL');
}

// ⚡ Bolt: Fast binary search to find if there is an arrival within the target window
// Uses lower_bound to find the insertion point, then checks the two neighbors.
function hasArrivalWithinWindow(arr: number[], target: number, window: number): boolean {
    if (arr.length === 0) return false;
    // Lower bound: first index where arr[i] >= target
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        // eslint-disable-next-line security/detect-object-injection
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    // Check the element at the insertion point and the one before it
    if (lo < arr.length && Math.abs(arr[lo] - target) < window) return true;
    if (lo > 0 && Math.abs(arr[lo - 1] - target) < window) return true;
    return false;
}

export function removeCancelledTripsWithReplacement(updates: BusUpdate[]): BusUpdate[] {
    // Single-pass optimization: Pre-group non-cancelled trips by direction
    const nonCancelledArrivals = { 0: [] as number[], 1: [] as number[] };
    for (const u of updates) {
        if (!u.isCancelled && (u.direction === 0 || u.direction === 1)) {
            nonCancelledArrivals[u.direction as 0 | 1].push(u.arrival);
        }
    }

    // ⚡ Bolt: Sort arrivals to enable O(log N) binary search lookups later
    nonCancelledArrivals[0].sort((a, b) => a - b);
    nonCancelledArrivals[1].sort((a, b) => a - b);

    const cleanedUpdates: BusUpdate[] = [];
    for (const u of updates) {
        if (u.isCancelled && (u.direction === 0 || u.direction === 1)) {
            // Check only against non-cancelled trips in the same direction
            // ⚡ Bolt: Replace O(M) Array.prototype.some() with O(log M) binary search
            // to fix the O(N*M) performance bottleneck when iterating through updates.
            const hasReplacement = hasArrivalWithinWindow(
                nonCancelledArrivals[u.direction as 0 | 1],
                u.arrival,
                20 * 60
            );
            if (!hasReplacement) cleanedUpdates.push(u);
        } else {
            cleanedUpdates.push(u);
        }
    }

    return cleanedUpdates;
}

export function shouldApplyRealtimeUpdate(rtStartDate: string | undefined, staticDate: string, rtTime: number, scheduledArrival: number): boolean {
    if (rtStartDate) return rtStartDate === staticDate;
    if (!isValidUnixTimestamp(rtTime) || !isValidUnixTimestamp(scheduledArrival)) return false;
    return Math.abs(rtTime - scheduledArrival) <= RT_FALLBACK_MATCH_WINDOW_SECONDS;
}

export function findGerzatStopForAddedTrip(
    stops: Iterable<AddedTripStop>,
    directionId: number,
    stopGroups: { champfleuri: string[]; patural: string[] }
): AddedTripStop | undefined {
    // ⚡ Bolt: Use a local Set instead of a global cache.
    // The previous implementation used a global cache that was vulnerable to being stale
    // if the passed stopGroups parameter ever changed between calls.
    // We maintain the performance improvement by keeping the O(N) single-pass loop.
    const targetStopIds = new Set([...stopGroups.champfleuri, ...stopGroups.patural]);

    let firstMatch: AddedTripStop | undefined;
    let lastMatch: AddedTripStop | undefined;

    // ⚡ Bolt: Single pass O(N) loop without intermediate array allocation (.filter())
    for (const stop of stops) {
        if (targetStopIds.has(stop.stopId)) {
            if (!firstMatch) firstMatch = stop;
            lastMatch = stop;
        }
    }

    return directionId === 0 ? firstMatch : lastMatch;
}

export async function getBusData(): Promise<{ updates: BusUpdate[], timestamp: number, rtAvailable: boolean }> {
    try {
        const now = getNowUnix();

        if (isT2CNoServiceDay()) {
            return { updates: [], timestamp: now, rtAvailable: true };
        }

        // Lazy load data on first use (reduces cold start time)
        const [staticSchedule, gtfsConfig, tripOrigins] = await Promise.all([
            getStaticSchedule(),
            getGtfsConfig(),
            getTripOrigins()
        ]);

        // 1. Fetch Real-time Data using shared service
        // Map<tripId, RTTripUpdate>
        const { updates: rtUpdates, rtAvailable } = await fetchTripUpdatesWithStatus();
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

        // ⚡ Bolt: Use a lazy-loaded cache for Set instances to avoid O(N) recreations on every API call
        // while preserving the lazy-loading pattern of the module.
        if (!TARGET_STOP_IDS_SET_CACHE) {
            TARGET_STOP_IDS_SET_CACHE = new Set([...gtfsConfig.stopIds.champfleuri, ...gtfsConfig.stopIds.patural]);
        }
        if (!CHAMPFLEURI_IDS_SET_CACHE) {
            CHAMPFLEURI_IDS_SET_CACHE = new Set(gtfsConfig.stopIds.champfleuri);
        }
        if (!PATURAL_IDS_SET_CACHE) {
            PATURAL_IDS_SET_CACHE = new Set(gtfsConfig.stopIds.patural);
        }

        for (const [tripId, update] of rtUpdates) {
            // 1. Handle Added Trips
            if (update.isAdded) {
                // ⚡ Bolt: Pass Iterable directly to avoid O(N) Array.from allocation
                const gerzatStop = findGerzatStopForAddedTrip(update.stopUpdates.values(), update.directionId, gtfsConfig.stopIds);

                if (gerzatStop) {
                    const arrivalTime = gerzatStop.predictedTime;
                    const arrivalDelay = gerzatStop.delay;

                    if (isValidUnixTimestamp(arrivalTime)) {
                        addedTrips.push({
                            tripId: tripId,
                            arrival: arrivalTime,
                            departure: arrivalTime,
                            delay: arrivalDelay || 0,
                            isRealtime: true,
                            isCancelled: false,
                            headsign: update.directionId === 0 ? 'AUBIÈRE Pl. des Ramacles' : 'GERZAT Champfleuri',
                            direction: update.directionId,
                            origin: tripOrigins.get(tripId) || (update.directionId === 0 ? 'GERZAT Champfleuri' : 'AUBIÈRE Pl. des Ramacles'),
                            stopId: gerzatStop.stopId,
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
                    if (TARGET_STOP_IDS_SET_CACHE!.has(stopId)) {
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
        const rtByPattern = new Map<string, typeof realtimeUpdates extends Map<string, infer V> ? V : never>();

        for (const [tripId, update] of realtimeUpdates) {
            const pattern = extractTripPattern(tripId);
            if (!rtByPattern.has(pattern)) {
                rtByPattern.set(pattern, update);
            }
        }

        // Single-pass filtering and mapping to prevent multiple O(N) array allocations
        const combinedUpdates: BusUpdate[] = [];

        for (const item of (staticSchedule as StaticScheduleItem[])) {
            // Filter: show buses arriving in the future (or departed less than 10 min ago)
            if (item.arrival <= now - 600) continue;

            // STRICT RULE: For "Le Patural", ONLY keep trips towards Ballainvilliers (Direction 0)
            if (!shouldKeepPaturalTrip(item, PATURAL_IDS_SET_CACHE!)) continue;

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
                    shouldApplyRT = shouldApplyRealtimeUpdate(rtStartDate, staticDate, 0, item.arrival);
                } else {
                    // Fallback: check timestamp of ANY available stop update for this trip
                    const firstStopUpdate = rtTrip.stops.values().next().value;
                    const rtTime = firstStopUpdate?.arrival?.time ?? firstStopUpdate?.departure?.time ?? 0;
                    shouldApplyRT = shouldApplyRealtimeUpdate(rtStartDate, staticDate, rtTime, item.arrival);
                }

                if (shouldApplyRT) {
                    const stopId = item.stopId;
                    const rtStop = findRelevantStopUpdate(rtTrip.stops, stopId, CHAMPFLEURI_IDS_SET_CACHE!, PATURAL_IDS_SET_CACHE!);

                    if (rtStop) {
                        isRealtime = true;

                        const rtArrivalTime = rtStop.arrival?.time;
                        const rtDepartureTime = rtStop.departure?.time;

                        if (isValidUnixTimestamp(rtArrivalTime)) {
                            arrival = rtArrivalTime;
                        } else if (isValidUnixTimestamp(rtDepartureTime)) {
                            arrival = rtDepartureTime;
                        }

                        if (isValidUnixTimestamp(rtDepartureTime)) {
                            departure = rtDepartureTime;
                        } else if (isValidUnixTimestamp(rtArrivalTime)) {
                            const dwell = item.departure - item.arrival;
                            departure = rtArrivalTime + (dwell > 0 ? dwell : 0);
                        }

                        delay = getEffectiveDelay(rtStop.delay, arrival, item.arrival);

                        if (rtStop.isSkipped) isCancelled = true;

                    }
                }
            }

            combinedUpdates.push({
                tripId: item.tripId,
                arrival: arrival,
                departure: departure,
                delay: delay,
                isRealtime: isRealtime,
                isCancelled: isCancelled,
                headsign: item.headsign,
                direction: item.direction,
                origin: tripOrigins.get(item.tripId) || (item.direction === 0 ? 'GERZAT Champfleuri' : 'AUBIÈRE Pl. des Ramacles'),
                stopId: item.stopId,
            });
        }

        // Add ADDED trips (replacement trips from GTFS-RT)
        combinedUpdates.push(...addedTrips);

        const cleanedUpdates = removeCancelledTripsWithReplacement(combinedUpdates);

        cleanedUpdates.sort((a: BusUpdate, b: BusUpdate) => a.arrival - b.arrival);

        // Single-pass early-exit loop to prevent array allocation
        const nextBuses: BusUpdate[] = [];
        for (const u of cleanedUpdates) {
            if (u.arrival > now - 60) {
                nextBuses.push(u);
                if (nextBuses.length >= 20) break;
            }
        }

        return { updates: nextBuses, timestamp: now, rtAvailable };
    } catch (error) {
        apiLogger.error('getBusData error', undefined, error instanceof Error ? error : new Error(String(error)));
        return { updates: [], timestamp: Math.floor(Date.now() / 1000), rtAvailable: false };
    }
}
