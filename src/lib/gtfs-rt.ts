/**
 * Centralized GTFS-RT Service
 * Eliminates duplication across data-source.ts, api/trip, and api/vehicles
 */
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

// --- Constants ---
export const LINE_E1_ROUTE_ID = '3';
const GTFS_RT_TRIP_UPDATE_URL = 'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update';
const GTFS_RT_VEHICLE_POSITION_URL = 'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-vehicle-position';

// --- Types ---
export interface RTStopUpdate {
    stopId: string;
    predictedArrival?: number;
    predictedDeparture?: number;
    /** Convenience getter: predictedArrival || predictedDeparture */
    predictedTime?: number;
    delay: number;
    isSkipped: boolean;
}

export interface RTTripUpdate {
    tripId: string;
    routeId: string;
    directionId: number;
    startDate?: string;
    isCancelled: boolean;
    isAdded: boolean;
    stopUpdates: Map<string, RTStopUpdate>;
    tripDelay: number; // Last known delay for the trip
}

export interface RTVehiclePosition {
    tripId: string;
    routeId: string;
    lat: number;
    lon: number;
    bearing: number;
    timestamp: number;
}

// --- GTFS-RT Schedule Relationship Enum ---
enum ScheduleRelationship {
    SCHEDULED = 0,
    ADDED = 1,
    UNSCHEDULED = 2,
    CANCELED = 3
}

// --- Fetching Functions ---

/**
 * Fetch and decode GTFS-RT Trip Updates for Line E1
 */
export async function fetchTripUpdates(): Promise<Map<string, RTTripUpdate>> {
    const updates = new Map<string, RTTripUpdate>();
    try {
        const response = await fetch(GTFS_RT_TRIP_UPDATE_URL, { cache: 'no-store' });
        if (!response.ok) return updates;

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        // Optional: Check for stale data
        const now = Math.floor(Date.now() / 1000);
        if (feed.header?.timestamp) {
            const age = now - Number(feed.header.timestamp);
            if (age > 300) { // 5 minutes
                console.warn(`[fetchTripUpdates] Stale feed ignored. Age: ${age}s`);
                return updates;
            }
        }

        for (const entity of feed.entity) {
            if (!entity.tripUpdate) continue;
            const tu = entity.tripUpdate;
            if (tu.trip.routeId !== LINE_E1_ROUTE_ID) continue;

            const tripId = tu.trip.tripId as string;
            const scheduleRelationship = tu.trip.scheduleRelationship ?? ScheduleRelationship.SCHEDULED;
            const isAdded = scheduleRelationship === ScheduleRelationship.ADDED || scheduleRelationship === ScheduleRelationship.UNSCHEDULED;
            let isCancelled = scheduleRelationship === ScheduleRelationship.CANCELED;

            // Ghost Cancellation Check: if marked cancelled but has valid stop updates
            if (isCancelled) {
                const stus = tu.stopTimeUpdate || [];
                const hasValidStops = stus.some(s => s.scheduleRelationship !== 1) && stus.length > 5;
                if (hasValidStops) isCancelled = false;
            }

            const stopUpdates = new Map<string, RTStopUpdate>();
            let tripDelay = 0;

            for (const stu of tu.stopTimeUpdate || []) {
                const stopId = stu.stopId as string;
                const predictedArrival = stu.arrival?.time ? Number(stu.arrival.time) : undefined;
                const predictedDeparture = stu.departure?.time ? Number(stu.departure.time) : undefined;
                const delay = Number(stu.arrival?.delay || stu.departure?.delay || 0);
                const isSkipped = stu.scheduleRelationship === 1; // SKIPPED

                if (predictedArrival || predictedDeparture) {
                    const predictedTime = predictedArrival || predictedDeparture;
                    stopUpdates.set(stopId, { stopId, predictedArrival, predictedDeparture, predictedTime, delay, isSkipped });
                    tripDelay = delay; // Update with last known
                }
            }

            updates.set(tripId, {
                tripId,
                routeId: LINE_E1_ROUTE_ID,
                directionId: tu.trip.directionId ?? 0,
                startDate: tu.trip.startDate as string | undefined,
                isCancelled,
                isAdded,
                stopUpdates,
                tripDelay
            });
        }
    } catch (e) {
        console.error('[fetchTripUpdates] Error:', e);
    }
    return updates;
}

/**
 * Fetch and decode GTFS-RT Vehicle Positions for Line E1
 */
export async function fetchVehiclePositions(): Promise<Map<string, RTVehiclePosition>> {
    const positions = new Map<string, RTVehiclePosition>();
    try {
        const response = await fetch(GTFS_RT_VEHICLE_POSITION_URL, { cache: 'no-store' });
        if (!response.ok) return positions;

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        for (const entity of feed.entity) {
            if (!entity.vehicle) continue;
            const v = entity.vehicle;
            if (v.trip?.routeId !== LINE_E1_ROUTE_ID) continue;

            const tripId = v.trip?.tripId;
            if (tripId && v.position) {
                positions.set(tripId, {
                    tripId,
                    routeId: LINE_E1_ROUTE_ID,
                    lat: v.position.latitude,
                    lon: v.position.longitude,
                    bearing: v.position.bearing || 0,
                    timestamp: Number(v.timestamp) || 0
                });
            }
        }
    } catch (e) {
        console.error('[fetchVehiclePositions] Error:', e);
    }
    return positions;
}

// --- Utility: Stop ID Aliasing ---
const STOP_ALIASES: Record<string, string[]> = {
    'GECHR': ['GECH', 'GECHA'],
    'GECHA': ['GECH', 'GECHR'],
    'PATUR': ['PATU', 'PATUA'],
    'PATUA': ['PATU', 'PATUR']
};

/**
 * Find RT stop update using aliases if exact match not found
 */
export function findStopUpdate(stopUpdates: Map<string, RTStopUpdate>, stopId: string): RTStopUpdate | undefined {
    let rtStop = stopUpdates.get(stopId);
    if (rtStop) return rtStop;

    const aliases = STOP_ALIASES[stopId];
    if (aliases) {
        for (const alias of aliases) {
            rtStop = stopUpdates.get(alias);
            if (rtStop) return rtStop;
        }
    }
    return undefined;
}
