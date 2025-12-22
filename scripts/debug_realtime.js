
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');

const API_URL = 'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update';
const TARGET_ROUTE_ID = '3'; // E1

console.log(`Connecting to ${API_URL}...`);

https.get(API_URL, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Error: Status Code ${res.statusCode}`);
        return;
    }

    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));

    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        try {
            const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
            console.log(`✅ Feed decoded successfully.`);
            console.log(`Timestamp: ${new Date(feed.header.timestamp * 1000).toLocaleString()}`);

            const routeStats = {}; // routeId -> { total: 0, canceled: 0, added: 0, scheduled: 0 }

            feed.entity.forEach((entity) => {
                if (entity.tripUpdate) {
                    const rid = entity.tripUpdate.trip.routeId;
                    if (!routeStats[rid]) {
                        routeStats[rid] = { total: 0, canceled: 0, added: 0, scheduled: 0 };
                    }
                    routeStats[rid].total++;

                    const rel = entity.tripUpdate.trip.scheduleRelationship;
                    if (rel === 3) {
                        routeStats[rid].canceled++;
                        if (rid === TARGET_ROUTE_ID && routeStats[rid].canceled === 1) {
                            console.log(`\n🕵️ DETAILED INSPECTION OF CANCELED TRIP ${entity.tripUpdate.trip.tripId}:`);
                            if (entity.tripUpdate.stopTimeUpdate) {
                                entity.tripUpdate.stopTimeUpdate.slice(0, 3).forEach((stu) => {
                                    console.log(`   Stop Seq ${stu.stopSequence} (ID: ${stu.stopId}):`);
                                    if (stu.arrival) console.log(`      Arr: ${stu.arrival.time} (Delay: ${stu.arrival.delay})`);
                                    if (stu.departure) console.log(`      Dep: ${stu.departure.time} (Delay: ${stu.departure.delay})`);
                                });
                            }
                        }
                    }
                    else if (rel === 1 || rel === 2) routeStats[rid].added++;
                    else routeStats[rid].scheduled++;
                }
            });

            console.log("\n📊 Global Feed Stats (By Route ID):");
            console.log("RouteID | Total | Sched | Added | Cncl");
            console.log("--------|-------|-------|-------|-----");
            for (const [rid, stats] of Object.entries(routeStats)) {
                console.log(`${rid.padEnd(7)} | ${String(stats.total).padEnd(5)} | ${String(stats.scheduled).padEnd(5)} | ${String(stats.added).padEnd(5)} | ${String(stats.canceled).padEnd(5)}`);
            }

            const e1Stats = routeStats[TARGET_ROUTE_ID];
            if (e1Stats) {
                console.log(`\n✅ Line E1 (Route ${TARGET_ROUTE_ID}) is present.`);
                if (e1Stats.canceled === e1Stats.total) {
                    console.log("⚠️  WARNING: ALL trips for Line E1 are marked CANCELED.");
                }
            } else {
                console.log(`\n❌ Line E1 (Route ${TARGET_ROUTE_ID}) NOT found in feed.`);
            }

        } catch (e) {
            console.error("Error decoding proto:", e);
        }
    });

}).on('error', (e) => {
    console.error(`Error fetching feed: ${e.message}`);
});
