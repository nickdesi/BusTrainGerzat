import { TrainUpdate } from '@/types/transport';
import { z } from 'zod';

const SNCF_API_KEY = process.env.SNCF_API_KEY;
const GERZAT_STOP_AREA = 'stop_area:SNCF:87734046';

// --- SNCF API Types with Zod Validation ---

const SncfLinkSchema = z.object({
    type: z.string().optional(),
    rel: z.string().optional(),
    id: z.string().optional()
});

const SncfDepartureSchema = z.object({
    stop_date_time: z.object({
        departure_date_time: z.string(),
        arrival_date_time: z.string(),
        base_departure_date_time: z.string(),
        data_freshness: z.string().optional()
    }),
    display_informations: z.object({
        trip_short_name: z.string().optional(),
        headsign: z.string().optional(),
        direction: z.string().optional(),
        physical_mode: z.string().optional(),
        commercial_mode: z.string().optional(),
        links: z.array(SncfLinkSchema).optional()
    }),
    links: z.array(SncfLinkSchema).optional(),
    stop_point: z.object({
        label: z.string().optional()
    }).optional()
});

const SncfOriginSchema = z.object({
    id: z.string(),
    name: z.string()
});

const SncfApiResponseSchema = z.object({
    departures: z.array(SncfDepartureSchema).optional(),
    origins: z.array(SncfOriginSchema).optional()
});

type SncfLink = z.infer<typeof SncfLinkSchema>;
type SncfDeparture = z.infer<typeof SncfDepartureSchema>;
type SncfOrigin = z.infer<typeof SncfOriginSchema>;
// SncfApiResponse type is inferred directly in safeParse usage

// --- Helpers ---

import { parseParisTime } from '@/utils/date';

import { fetchWithRetry, ApiError } from '@/lib/api-client';

function processSncfDeparture(dep: SncfDeparture, origins: SncfOrigin[] = [], isRealtimeSource: boolean): TrainUpdate {
    const stopDateTime = dep.stop_date_time;
    const displayInfo = dep.display_informations;

    // Parse times
    const departureTime = parseParisTime(stopDateTime.departure_date_time);
    const arrivalTime = parseParisTime(stopDateTime.arrival_date_time);
    const baseDepartureTime = parseParisTime(stopDateTime.base_departure_date_time);

    // Calculate delay (only valid for realtime source, otherwise 0)
    const delay = isRealtimeSource ? departureTime - baseDepartureTime : 0;

    // Find Origin
    let origin = 'Inconnu';
    const originLink = displayInfo.links?.find((l: SncfLink) => l.rel === 'origins');
    if (originLink) {
        const originData = origins.find((o: SncfOrigin) => o.id === originLink.id);
        if (originData) origin = originData.name;
    }

    const vehicleJourneyId = dep.links?.find((l: SncfLink) => l.type === 'vehicle_journey')?.id;

    // Determine Cancellation status
    // For realtime: check explicit status flags
    // For base_schedule: caller logic determines (missing from realtime = cancelled)
    const isCancelledSpecific =
        stopDateTime.data_freshness === 'deleted' ||
        displayInfo.physical_mode === 'Cancelled' ||
        displayInfo.commercial_mode === 'Supprimé';

    return {
        tripId: vehicleJourneyId || '',
        trainNumber: displayInfo.trip_short_name || displayInfo.headsign || 'Inconnu',
        direction: displayInfo.direction?.replace(/ \([^)]+\)$/, '') || 'Inconnu',
        origin: origin,
        arrival: { time: arrivalTime.toString(), delay },
        departure: { time: departureTime.toString(), delay },
        delay,
        isRealtime: isRealtimeSource,
        isCancelled: isCancelledSpecific
    };
}

// --- Cache to avoid SNCF API rate limiting (429) ---
// SNCF API has a 5000 req/day limit. At 2 min cache with 2 calls per refresh:
// (24*60*60)/120 * 2 = 1440 calls/day - safely under the limit
const CACHE_TTL_MS = 120000; // 2 minutes cache
let cachedResponse: { updates: TrainUpdate[], timestamp: number, debug?: Record<string, unknown> } | null = null;
let cacheExpiry = 0;

export async function getTrainData(): Promise<{ updates: TrainUpdate[], timestamp: number, error?: string, debug?: Record<string, unknown> }> {
    try {
        const now = Math.floor(Date.now() / 1000);
        const nowMs = Date.now();

        // Return cached response if still valid
        if (cachedResponse && nowMs < cacheExpiry) {
            return { ...cachedResponse, debug: { ...cachedResponse.debug, cached: true } };
        }

        if (!SNCF_API_KEY) {
            return { updates: [], timestamp: now, error: 'SNCF_API_KEY_MISSING' };
        }

        const authHeader = `Basic ${Buffer.from(SNCF_API_KEY + ':').toString('base64')}`;
        const fetchOptions = {
            headers: { 'Authorization': authHeader },
            cache: 'no-store' as RequestCache
        };

        // 1. Fetch BOTH Base Schedule (Theory) and Realtime Data
        // Sequential calls via fetchWithRetry (handles 429 internally with backoff)
        // If it still fails with 429 after retries, it throws ApiError
        let realtimeDataRaw: any = null;
        let baseDataRaw: any = null;

        try {
            realtimeDataRaw = await fetchWithRetry(`https://api.sncf.com/v1/coverage/sncf/stop_areas/${GERZAT_STOP_AREA}/departures?count=30&data_freshness=realtime`, fetchOptions);
            await new Promise(r => setTimeout(r, 300)); // Rate limit spacing
            baseDataRaw = await fetchWithRetry(`https://api.sncf.com/v1/coverage/sncf/stop_areas/${GERZAT_STOP_AREA}/departures?count=30&data_freshness=base_schedule`, fetchOptions);
        } catch (err) {
            if (err instanceof ApiError && err.status === 429) {
                if (cachedResponse) {
                    return { ...cachedResponse, debug: { ...cachedResponse.debug, cached: true, rateLimited: true } };
                }
                return { updates: [], timestamp: now, error: 'RATE_LIMITED', debug: { error: err.message } };
            }
            throw err; // Re-throw other errors to outer catch
        }

        // Parse and validate API responses with Zod
        // fetchWithRetry returns parsed JSON, so we check existence
        const baseResult = baseDataRaw ? SncfApiResponseSchema.safeParse(baseDataRaw) : null;
        const realtimeResult = realtimeDataRaw ? SncfApiResponseSchema.safeParse(realtimeDataRaw) : null;

        const baseData = baseResult?.success ? baseResult.data : null;
        const realtimeData = realtimeResult?.success ? realtimeResult.data : null;


        const debugInfo: Record<string, unknown> = {
            baseCount: baseData?.departures?.length ?? 0,
            realtimeCount: realtimeData?.departures?.length ?? 0
        };

        // 2. Index Realtime Data for Fast Lookup and Window Calculation
        const realtimeMap = new Map<string, SncfDeparture>();
        let minRealtimeTime = Infinity;
        let maxRealtimeTime = -Infinity;

        if (realtimeData?.departures) {
            for (const dep of realtimeData.departures) {
                const depTime = parseParisTime(dep.stop_date_time.departure_date_time);

                // Track time window of realtime data
                if (depTime < minRealtimeTime) minRealtimeTime = depTime;
                if (depTime > maxRealtimeTime) maxRealtimeTime = depTime;

                // Index by vehicle_journey_id
                const journeyId = dep.links?.find((l: SncfLink) => l.type === 'vehicle_journey')?.id;
                if (journeyId) {
                    realtimeMap.set(journeyId, dep);
                }
            }
        }

        const updates: TrainUpdate[] = [];
        const processedTripIds = new Set<string>();

        // 3. Reconcile: Iterate over Base Schedule (The Truth of what SHOULD exist)
        if (baseData?.departures) {
            for (const baseDep of baseData.departures) {
                const journeyId = baseDep.links?.find((l: SncfLink) => l.type === 'vehicle_journey')?.id;
                if (!journeyId) continue;

                // Processed ID tracking
                processedTripIds.add(journeyId);

                const realtimeDep = realtimeMap.get(journeyId);
                const baseTime = parseParisTime(baseDep.stop_date_time.base_departure_date_time); // Use base time for comparison

                let finalDep = baseDep;
                let isRealtime = false;
                let isCancelled = false;
                let delay = 0;

                // Scenario A: Train exists in Realtime -> Use Realtime data
                if (realtimeDep) {
                    finalDep = realtimeDep;
                    isRealtime = true;
                    // Check explicit cancellation in realtime data
                    isCancelled =
                        realtimeDep.stop_date_time.data_freshness === 'deleted' ||
                        realtimeDep.display_informations.commercial_mode === 'Supprimé' ||
                        realtimeDep.display_informations.physical_mode === 'Cancelled';

                    const time = parseParisTime(realtimeDep.stop_date_time.departure_date_time);
                    const base = parseParisTime(realtimeDep.stop_date_time.base_departure_date_time);
                    delay = time - base;
                }
                // Scenario B: Train MISSING from Realtime -> Infer Status
                else {
                    // Check if explicit cancellation in Base (rare but possible)
                    if (baseDep.stop_date_time.data_freshness === 'deleted' || baseDep.display_informations.commercial_mode === 'Supprimé') {
                        isCancelled = true;
                    }
                    // INFERENCE LOGIC:
                    // If we have a valid realtime window, and this train enters that window but is missing -> It's likely cancelled.
                    // If it's outside the window (e.g. earlier morning trains that scroll off, or later trains not yet loaded) -> It's likely just "No Data" / Theoretical.
                    else if (minRealtimeTime !== Infinity && maxRealtimeTime !== -Infinity) {
                        if (baseTime >= minRealtimeTime && baseTime <= maxRealtimeTime) {
                            isCancelled = true; // Was supposed to be here, but is gone. Deleted.
                        } else {
                            // Outside window (e.g. 07:36 train when Realtime starts at 08:30)
                            // Treat as valid theoretical train
                            isCancelled = false;
                        }
                    } else {
                        // No realtime data at all? Default to theoretical.
                        isCancelled = false;
                    }
                }

                const processed = processSncfDeparture(finalDep, baseData.origins, isRealtime);
                processed.isCancelled = isCancelled;
                processed.delay = delay;

                // If theoretical (no realtime match and not cancelled), explicitly mark as not realtime
                // This will show the "offline" or "theoretical" icon in UI
                if (!isRealtime && !isCancelled) {
                    processed.isRealtime = false;
                }

                updates.push(processed);
            }
        }

        // 4. Add any "extra" trains from Realtime that weren't in Base Schedule (e.g. added trains)
        if (realtimeData?.departures) {
            for (const rtDep of realtimeData.departures) {
                const journeyId = rtDep.links?.find((l: SncfLink) => l.type === 'vehicle_journey')?.id;
                if (journeyId && !processedTripIds.has(journeyId)) {
                    // This is an unexpected extra train
                    const processed = processSncfDeparture(rtDep, realtimeData.origins, true);
                    // Check explicit cancellation
                    processed.isCancelled =
                        rtDep.stop_date_time.data_freshness === 'deleted' ||
                        rtDep.display_informations.commercial_mode === 'Supprimé' ||
                        rtDep.display_informations.physical_mode === 'Cancelled';

                    updates.push(processed);
                }
            }
        }

        // Filter past trains (keep recent past 60s)
        const futureUpdates = updates
            .filter(u => Number(u.departure.time) > now - 60)
            .sort((a, b) => Number(a.departure.time) - Number(b.departure.time));

        // Update cache
        const result = { updates: futureUpdates, timestamp: now, debug: debugInfo };
        cachedResponse = result;
        cacheExpiry = Date.now() + CACHE_TTL_MS;

        return result;
    } catch (e) {
        console.error('getTrainData error:', e);
        return { updates: [], timestamp: Math.floor(Date.now() / 1000), error: 'FETCH_FAILED' };
    }
}
