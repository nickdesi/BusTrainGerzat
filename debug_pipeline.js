
const fs = require('fs');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

async function main() {
    // 1. Load Static Data
    console.log("Loading static schedule...");
    const staticData = JSON.parse(fs.readFileSync('src/data/static_schedule.json', 'utf8'));

    // Simulate Timezone Date
    const formatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const todayDateStr = `${year}${month}${day}`;
    console.log(`Date used: ${todayDateStr}`);

    const todaySchedule = staticData.filter(item => item.date === todayDateStr);
    console.log(`Static entries for today: ${todaySchedule.length}`);

    // 2. Fetch Realtime
    console.log("Fetching GTFS-RT...");
    const response = await fetch('https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update');
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    const TARGET_ROUTE_ID = '3'; // Line E1

    // 3. Process Logic (Simplified from data-source.ts)
    const updates = [];
    const addedTrips = [];

    feed.entity.forEach((entity) => {
        if (entity.tripUpdate) {
            const tripUpdate = entity.tripUpdate;
            if (tripUpdate.trip.routeId === TARGET_ROUTE_ID) {
                const scheduleRelationship = tripUpdate.trip.scheduleRelationship;
                // 0=SCHEDULED, 1=ADDED, 2=UNSCHEDULED, 3=CANCELED

                // ... extraction logic ...
                let arrivalTime = 0;
                if (tripUpdate.stopTimeUpdate && tripUpdate.stopTimeUpdate.length > 0) {
                    // Find first relevant stop for Gerzat Champfleuri (simplified)
                    const stop = tripUpdate.stopTimeUpdate.find(s => s.arrival);
                    if (stop) arrivalTime = Number(stop.arrival.time);
                }

                updates.push({
                    tripId: tripUpdate.trip.tripId,
                    status: scheduleRelationship, // 3 is CANCELED
                    arrivalTime: arrivalTime,
                    direction: tripUpdate.trip.directionId || 0,
                    startDate: tripUpdate.trip.startDate
                });
            }
        }
    });

    console.log(`Total RT updates for E1: ${updates.length}`);
    const canceled = updates.filter(u => u.status === 3);
    const added = updates.filter(u => u.status === 1);
    console.log(`Cancelled: ${canceled.length}, Added: ${added.length}`);

    // 4. Mimic Deduplication Logic
    // This is the critical part to test
    const finalDisplay = [];

    // Merge static (simplified)
    const updatesWithStatic = todaySchedule.map(staticTrip => {
        // Find matching RT
        const rt = updates.find(u => u.tripId === staticTrip.tripId);
        let status = 'SCHEDULED';
        if (rt && rt.status === 3) status = 'CANCELED';

        return {
            ...staticTrip,
            status,
            rt
        };
    });

    // Add ADDED trips
    added.forEach(a => {
        updatesWithStatic.push({
            tripId: a.tripId,
            status: 'ADDED',
            arrival: a.arrivalTime,
            direction: a.direction,
            rt: a
        });
    });

    console.log(`Total potential items before dedupe: ${updatesWithStatic.length}`);

    // APPLY DEDUPE LOGIC FROM SOURCE
    const cleanedUpdates = updatesWithStatic.filter(trip => {
        if (trip.status !== 'CANCELED') return true;

        // If cancelled, check for replacement
        const cancelledTime = trip.arrival; // Static arrival time

        const hasReplacement = updatesWithStatic.some(candidate => {
            if (candidate.status !== 'ADDED' && candidate.status !== 'SCHEDULED') return false;
            // Must be same direction
            if (candidate.direction !== trip.direction) return false;

            // Time window +/- 20 mins
            const candidateTime = candidate.arrival; // simplified
            const timeDiff = Math.abs(candidateTime - cancelledTime);

            return timeDiff <= 20 * 60; // 20 mins
        });

        if (hasReplacement) {
            // console.log(`Hiding cancelled trip ${trip.tripId} because replacement found`);
            return false;
        }
        return true;
    });

    console.log(`Final Items after dedupe: ${cleanedUpdates.length}`);

    if (cleanedUpdates.length === 0) {
        console.error("CRITICAL: Result is EMPTY!");
    } else {
        console.log("Success! Items found:");
        console.log(cleanedUpdates.slice(0, 5).map(u => `${u.tripId} (${u.status})`));
    }
}

main().catch(console.error);
