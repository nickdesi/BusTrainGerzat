import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import staticSchedule from '@/data/static_schedule.json';

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
// GTFS-RT Schedule Relationship enum values
enum ScheduleRelationship {
    SCHEDULED = 0,
    ADDED = 1,        // Extra trip added (replacement)
    UNSCHEDULED = 2,  // Trip running without schedule / DUPLICATED in newer specs
    CANCELED = 3      // Trip canceled
}

export async function getBusData(): Promise<{ updates: BusUpdate[], timestamp: number }> {
    try {
        const now = Math.floor(Date.now() / 1000);

        // 1. Fetch Real-time Data
        // Map<tripId, { tripCancelled: boolean, startDate?: string, stops: Map<stopId, UpdateData> }>
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

        // Store ADDED/DUPLICATED trips as replacement trips (not in static schedule)
        const addedTrips: BusUpdate[] = [];

        try {
            const response = await fetch('https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update', {
                cache: 'no-store',
            });

            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
                const targetRouteId = '3'; // Line E1 (formerly Line 20)
                // Add Patural IDs (PATUR, PATUA, PATU) to capture RT data for express trips
                const targetStopIds = new Set(['GECHR', 'GECHA', 'GECH', 'PATUR', 'PATUA', 'PATU']);

                feed.entity.forEach((entity) => {
                    if (entity.tripUpdate) {
                        const tripUpdate = entity.tripUpdate;
                        if (tripUpdate.trip.routeId === targetRouteId) {
                            const tripId = tripUpdate.trip.tripId as string;
                            const scheduleRelationship = tripUpdate.trip.scheduleRelationship ?? ScheduleRelationship.SCHEDULED;
                            const startDate = tripUpdate.trip.startDate as string | undefined;
                            const directionId = tripUpdate.trip.directionId ?? 0;

                            // 1. Get Stops
                            const stops = tripUpdate.stopTimeUpdate || [];

                            // 2. Define isTripAdded
                            const isTripAdded = scheduleRelationship === ScheduleRelationship.ADDED ||
                                scheduleRelationship === ScheduleRelationship.UNSCHEDULED;

                            // 3. Check for Ghost Cancellation (Cancel + Valid Stops)
                            let isTripCancelled = scheduleRelationship === ScheduleRelationship.CANCELED;
                            if (isTripCancelled) {
                                const hasValidStopUpdates = stops.some(s => s.scheduleRelationship !== 1);
                                if (hasValidStopUpdates && stops.length > 5) {
                                    isTripCancelled = false;
                                }
                            }

                            if (isTripAdded && stops.length > 0) {
                                // For ADDED trips: T2C uses different stop_ids, so we take first/last stop
                                // based on direction to get Gerzat departure/arrival times
                                // Direction 0 = leaving Gerzat (first stop is Gerzat)
                                // Direction 1 = arriving at Gerzat (last stop is Gerzat)
                                const gerzatStop = directionId === 0 ? stops[0] : stops[stops.length - 1];
                                const arrivalTime = gerzatStop.arrival?.time || gerzatStop.departure?.time;
                                const arrivalDelay = gerzatStop.arrival?.delay || gerzatStop.departure?.delay;

                                if (arrivalTime) {
                                    addedTrips.push({
                                        tripId: tripId,
                                        arrival: Number(arrivalTime),
                                        departure: Number(arrivalTime),
                                        delay: Number(arrivalDelay || 0),
                                        isRealtime: true,
                                        isCancelled: false,
                                        headsign: directionId === 0 ? 'AUBIÈRE Pl. des Ramacles' : 'GERZAT Champfleuri',
                                        direction: directionId
                                    });
                                }
                            } else {
                                // For SCHEDULED or CANCELED trips: filter by known Gerzat stop_ids
                                // Store updates per stopId to avoid overwriting Champfleuri with Patural data
                                if (!realtimeUpdates.has(tripId)) {
                                    realtimeUpdates.set(tripId, {
                                        tripCancelled: isTripCancelled,
                                        startDate: startDate,
                                        stops: new Map()
                                    });
                                }
                                const tripEntry = realtimeUpdates.get(tripId)!;

                                stops.forEach((stopTimeUpdate) => {
                                    if (stopTimeUpdate.stopId && targetStopIds.has(stopTimeUpdate.stopId)) {
                                        tripEntry.stops.set(stopTimeUpdate.stopId, {
                                            arrival: stopTimeUpdate.arrival ? {
                                                time: Number(stopTimeUpdate.arrival.time),
                                                delay: stopTimeUpdate.arrival.delay
                                            } : undefined,
                                            departure: stopTimeUpdate.departure ? {
                                                time: Number(stopTimeUpdate.departure.time),
                                                delay: stopTimeUpdate.departure.delay
                                            } : undefined,
                                            delay: Number(stopTimeUpdate.arrival?.delay || stopTimeUpdate.departure?.delay || 0),
                                            isSkipped: stopTimeUpdate.scheduleRelationship === 1
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Bus RT fetch error:', e);
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
                        // Strict Matching: ONLY apply update if we have data for THIS exact stopId
                        const rtStop = stopId ? rtTrip.stops.get(stopId) : undefined;

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
                            if (rtStop.isSkipped) isCancelled = true;

                        } else {
                            // Trip exists in RT but no update for this stop.
                            // If the global trip is NOT cancelled, it means the bus missed/passed this stop 
                            // or the feed doesn't have it.
                            // We do NOT set isRealtime=true to indicate we are falling back to static time.
                        }
                    }
                }

                return {
                    tripId: item.tripId,
                    arrival: arrival,
                    departure: departure,
                    delay: delay,
                    isRealtime: isRealtime,
                    isCancelled: isCancelled,
                    headsign: item.headsign,
                    direction: item.direction
                };
            });

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
