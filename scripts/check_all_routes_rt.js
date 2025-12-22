const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');

const url = 'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update';

https.get(url, (res) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

        console.log('=== Checking ALL routes for real-time data ===\n');

        const routeStats = {};

        for (const entity of feed.entity) {
            if (!entity.tripUpdate) continue;

            const routeId = entity.tripUpdate.trip.routeId;
            const stops = entity.tripUpdate.stopTimeUpdate || [];

            if (!routeStats[routeId]) {
                routeStats[routeId] = { total: 0, withTime: 0, withNoData: 0 };
            }

            routeStats[routeId].total++;

            // Check if ANY stop has actual time data
            const hasTimeData = stops.some(s => s.arrival?.time || s.departure?.time);
            if (hasTimeData) routeStats[routeId].withTime++;

            // Check if ALL stops are NO_DATA (scheduleRelationship=2)
            const allNoData = stops.every(s => s.scheduleRelationship === 2);
            if (allNoData) routeStats[routeId].withNoData++;
        }

        console.log('Route | Trips | With RT | All NO_DATA');
        console.log('------|-------|---------|------------');

        Object.entries(routeStats)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 15)
            .forEach(([route, stats]) => {
                console.log(`${route.padEnd(5)} | ${String(stats.total).padEnd(5)} | ${String(stats.withTime).padEnd(7)} | ${stats.withNoData}`);
            });

        // Specific check for E1 (route 3)
        console.log('\n=== E1 (Route 3) Details ===');
        const e1 = routeStats['3'];
        if (e1) {
            console.log(`Total trips: ${e1.total}`);
            console.log(`Trips with RT time data: ${e1.withTime}`);
            console.log(`Trips with ALL NO_DATA: ${e1.withNoData}`);
        }
    });
}).on('error', console.error);
