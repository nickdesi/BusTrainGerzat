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

// --- BUS LOGIC ---
export async function getBusData(): Promise<{ updates: BusUpdate[], timestamp: number }> {
    try {
        const now = Math.floor(Date.now() / 1000);

        // 1. Fetch Real-time Data
        const realtimeUpdates: Record<string, { arrival?: { time?: number; delay?: number }; departure?: { time?: number; delay?: number }; delay: number; isCancelled: boolean }> = {};
        try {
            const response = await fetch('https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update', {
                cache: 'no-store',
            });

            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
                const targetRouteId = '11821953316814877'; // Line 20
                const targetStopId = '3377704015495667'; // Gerzat Champfleuri

                feed.entity.forEach((entity) => {
                    if (entity.tripUpdate) {
                        const tripUpdate = entity.tripUpdate;
                        if (tripUpdate.trip.routeId === targetRouteId) {
                            const isTripCancelled = tripUpdate.trip.scheduleRelationship === 3; // CANCELED
                            tripUpdate.stopTimeUpdate?.forEach((stopTimeUpdate) => {
                                if (stopTimeUpdate.stopId === targetStopId) {
                                    const isStopCancelled = stopTimeUpdate.scheduleRelationship === 1; // SKIPPED
                                    const arrivalTime = stopTimeUpdate.arrival?.time;
                                    const arrivalDelay = stopTimeUpdate.arrival?.delay;
                                    const departureTime = stopTimeUpdate.departure?.time;
                                    const departureDelay = stopTimeUpdate.departure?.delay;

                                    // Extract start date from trip update if available, or just use tripId
                                    // Ideally we would match on start_date too.

                                    realtimeUpdates[tripUpdate.trip.tripId as string] = {
                                        arrival: arrivalTime != null ? { time: Number(arrivalTime), delay: arrivalDelay ?? 0 } : undefined,
                                        departure: departureTime != null ? { time: Number(departureTime), delay: departureDelay ?? 0 } : undefined,
                                        delay: Number(arrivalDelay || departureDelay || 0),
                                        isCancelled: isTripCancelled || isStopCancelled,
                                        scheduleRelationship: tripUpdate.trip.scheduleRelationship
                                    };
                                }
                            });
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Bus RT fetch error:', e);
        }

        // 2. Merge with Static Schedule
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMidnight = Math.floor(today.getTime() / 1000);

        const scheduleDateStr = (staticSchedule as any[])[0]?.date || "20251126";
        const sYear = parseInt(scheduleDateStr.substring(0, 4));
        const sMonth = parseInt(scheduleDateStr.substring(4, 6)) - 1;
        const sDay = parseInt(scheduleDateStr.substring(6, 8));
        const scheduleDate = new Date(sYear, sMonth, sDay);
        scheduleDate.setHours(0, 0, 0, 0);
        const scheduleMidnight = Math.floor(scheduleDate.getTime() / 1000);

        const timeOffset = todayMidnight - scheduleMidnight;

        const combinedUpdates = staticSchedule
            .map((item: any) => {
                // Calculate static timestamps for this item
                const staticArrival = item.arrival + timeOffset;
                const staticDeparture = item.departure + timeOffset;

                return {
                    ...item,
                    originalArrival: item.arrival, // Keep original for debug/ref
                    arrival: staticArrival,
                    departure: staticDeparture
                };
            })
            .filter((item: any) => item.arrival > now - 600)
            .map((item: any) => {
                const rt = realtimeUpdates[item.tripId];
                let arrival = item.arrival;
                let departure = item.departure;
                let delay = 0;
                let isRealtime = false;
                let isCancelled = rt?.isCancelled || false;

                if (rt) {
                    // CRITICAL FIX: Only apply RT update if the static time is close to the RT time (e.g. within 4 hours)
                    // This prevents applying "Today's" RT update to "Tomorrow's" static schedule entry for the same tripId.
                    const rtTime = rt.arrival?.time || rt.departure?.time || 0;
                    if (rtTime && Math.abs(rtTime - item.arrival) < 14400) { // 4 hours window
                        isRealtime = true;

                        if (rt.arrival?.time) {
                            arrival = Number(rt.arrival.time);
                        } else if (rt.departure?.time) {
                            arrival = Number(rt.departure.time);
                        }

                        // Also update departure!
                        if (rt.departure?.time) {
                            departure = Number(rt.departure.time);
                        } else {
                            // If no specific departure in RT, assume departure = arrival (standard for bus stops)
                            // But better to maintain the original dwell time difference if possible?
                            // For simplicity, sync departure to arrival + original dwell.
                            // Or just set equal if we treat it as a point.
                            // Let's set it to arrival if missing, to ensure sort order is correct.
                            if (rt.arrival?.time) {
                                const dwell = item.departure - item.arrival;
                                departure = Number(rt.arrival.time) + (dwell > 0 ? dwell : 0);
                            }
                        }

                        delay = rt.delay || 0;
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

        combinedUpdates.sort((a: any, b: any) => a.arrival - b.arrival);
        const nextBuses = combinedUpdates.filter((u: any) => u.arrival > now - 60).slice(0, 20);

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

export async function getTrainData(): Promise<{ updates: TrainUpdate[], timestamp: number, error?: string, debug?: any }> {
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
        let debugInfo: any = {};

        if (baseScheduleRes.ok) {
            const baseScheduleData = await baseScheduleRes.json();
            let realtimeTrainIds = new Set<string>();

            if (realtimeRes.ok) {
                const realtimeData = await realtimeRes.json();
                realtimeData.departures?.forEach((dep: any) => {
                    const vehicleJourneyId = dep.links?.find((l: any) => l.type === 'vehicle_journey')?.id;
                    if (vehicleJourneyId) realtimeTrainIds.add(vehicleJourneyId);
                });
            }

            baseScheduleData.departures?.forEach((dep: any) => {
                const stopDateTime = dep.stop_date_time;
                const displayInfo = dep.display_informations;
                const departureTime = parseSncfDateTime(stopDateTime.departure_date_time);
                const arrivalTime = parseSncfDateTime(stopDateTime.arrival_date_time);
                const baseDepartureTime = parseSncfDateTime(stopDateTime.base_departure_date_time);
                const delay = departureTime - baseDepartureTime;

                let origin = 'Inconnu';
                const originLink = displayInfo.links?.find((l: any) => l.rel === 'origins');
                if (originLink) {
                    const originData = baseScheduleData.origins?.find((o: any) => o.id === originLink.id);
                    if (originData) origin = originData.name;
                }

                const vehicleJourneyId = dep.links?.find((l: any) => l.type === 'vehicle_journey')?.id;
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
