import { NextResponse } from 'next/server';
import lineE1Data from '../../../../public/data/lineE1_data.json';
import e1StopTimes from '../../../../public/data/e1_stop_times.json';

export const dynamic = 'force-dynamic';

interface EstimatedVehicle {
    tripId: string;
    lat: number;
    lon: number;
    direction: number;
    nextStop: string;
    nextStopName: string;
    headsign: string;
    bearing: number;
    delay: number;
    progress: number;
    estimatedArrival: number;
    terminusEta: number;
    origin: string;
}

interface StaticTrip {
    tripId: string;
    headsign: string;
    direction: number;
    stops: { stopId: string; sequence: number; arrivalTime: number; departureTime: number }[];
}

const stopsById = new Map(lineE1Data.stops.map(s => [s.stopId, s]));

/**
 * Convert seconds-from-midnight (Paris time) to Unix timestamp for today
 * GTFS times are in local Paris time, server may be in UTC
 */
function secondsToUnix(secondsFromMidnight: number): number {
    const now = new Date();
    const parisDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    const [, month] = parisDateStr.split('-').map(Number);
    const isDST = month >= 4 && month <= 10;
    const offset = isDST ? '+02:00' : '+01:00';
    const correctMidnight = new Date(`${parisDateStr}T00:00:00${offset}`);
    return Math.floor(correctMidnight.getTime() / 1000) + secondsFromMidnight;
}

/**
 * Interpolate position between two stops based on progress
 */
function interpolatePosition(
    prevStop: { lat: number; lon: number },
    nextStop: { lat: number; lon: number },
    progress: number  // 0 = at prev, 1 = at next
): { lat: number; lon: number } {
    return {
        lat: prevStop.lat + (nextStop.lat - prevStop.lat) * progress,
        lon: prevStop.lon + (nextStop.lon - prevStop.lon) * progress
    };
}

/**
 * Calculate bearing between two points
 */
function calculateBearing(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
    const toRad = Math.PI / 180;
    const dLon = (to.lon - from.lon) * toRad;
    const lat1 = from.lat * toRad;
    const lat2 = to.lat * toRad;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

export async function GET() {
    try {
        const now = Math.floor(Date.now() / 1000);
        const vehicles: EstimatedVehicle[] = [];

        // Find trips that are currently in progress based on static schedule
        for (const trip of e1StopTimes as StaticTrip[]) {
            if (!trip.stops || trip.stops.length < 2) continue;

            // Convert all stop times to Unix timestamps
            const firstStopTime = secondsToUnix(trip.stops[0].arrivalTime);
            const lastStopTime = secondsToUnix(trip.stops[trip.stops.length - 1].arrivalTime);

            // Trip is in progress if: first stop time <= now <= last stop time + 5 min buffer
            if (now < firstStopTime - 120 || now > lastStopTime + 300) {
                continue; // Not in progress
            }

            // Find current position: between which two stops?
            let prevStopIdx = 0;
            let nextStopIdx = 1;

            for (let i = 0; i < trip.stops.length; i++) {
                const stopTime = secondsToUnix(trip.stops[i].arrivalTime);
                if (stopTime > now) {
                    nextStopIdx = i;
                    prevStopIdx = Math.max(0, i - 1);
                    break;
                }
                // If we're past all stops
                if (i === trip.stops.length - 1) {
                    prevStopIdx = i - 1;
                    nextStopIdx = i;
                }
            }

            const prevStop = trip.stops[prevStopIdx];
            const nextStop = trip.stops[nextStopIdx];

            const prevStopInfo = stopsById.get(prevStop.stopId);
            const nextStopInfo = stopsById.get(nextStop.stopId);

            if (!prevStopInfo || !nextStopInfo) continue;

            // Calculate progress between stops
            const prevTime = secondsToUnix(prevStop.arrivalTime);
            const nextTime = secondsToUnix(nextStop.arrivalTime);
            const timeDiff = nextTime - prevTime;
            const elapsed = now - prevTime;
            const segmentProgress = timeDiff > 0 ? Math.min(1, Math.max(0, elapsed / timeDiff)) : 0;

            // Interpolate position
            const position = interpolatePosition(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon },
                segmentProgress
            );

            // Calculate bearing
            const bearing = calculateBearing(
                { lat: prevStopInfo.lat, lon: prevStopInfo.lon },
                { lat: nextStopInfo.lat, lon: nextStopInfo.lon }
            );

            const lastStop = trip.stops[trip.stops.length - 1];
            const lastStopInfo = stopsById.get(lastStop.stopId);
            const headsign = lastStopInfo?.stopName || trip.headsign;

            // Get origin from first stop
            const firstStop = trip.stops[0];
            const firstStopInfo = stopsById.get(firstStop.stopId);
            const origin = firstStopInfo?.stopName || 'Inconnu';

            // Overall progress
            const overallProgress = nextStopIdx / trip.stops.length;

            vehicles.push({
                tripId: trip.tripId,
                lat: position.lat,
                lon: position.lon,
                direction: trip.direction,
                nextStop: nextStop.stopId,
                nextStopName: nextStopInfo.stopName,
                headsign,
                bearing,
                delay: 0, // No RT data = theoretical
                progress: overallProgress,
                estimatedArrival: nextTime,
                terminusEta: lastStopTime,
                origin
            });
        }

        return NextResponse.json({
            vehicles,
            timestamp: now,
            count: vehicles.length,
            isEstimated: true, // Mark as estimated since RT is unavailable
            source: 'static_schedule'
        });

    } catch (error) {
        console.error('Vehicles API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vehicles', vehicles: [], count: 0 },
            { status: 500 }
        );
    }
}
