const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');

const url = 'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update';

https.get(url, (res) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

        console.log('=== GTFS-RT Feed Analysis ===');
        console.log(`Header timestamp: ${feed.header.timestamp}`);
        console.log(`Total entities: ${feed.entity.length}`);

        // Find Line E1 (Route 3) trips
        const e1Trips = feed.entity.filter(e =>
            e.tripUpdate && e.tripUpdate.trip.routeId === '3'
        );

        console.log(`\nLine E1 trips: ${e1Trips.length}`);

        if (e1Trips.length > 0) {
            // Show first 3 trips in detail
            e1Trips.slice(0, 3).forEach((e, i) => {
                const tu = e.tripUpdate;
                console.log(`\n=== Trip ${i + 1}: ${tu.trip.tripId} ===`);
                console.log(`Direction: ${tu.trip.directionId}`);
                console.log(`Schedule Relationship: ${tu.trip.scheduleRelationship}`);
                console.log(`Stop Updates: ${tu.stopTimeUpdate?.length || 0}`);

                // Show first 5 stops
                (tu.stopTimeUpdate || []).slice(0, 5).forEach((stu, j) => {
                    console.log(`\n  Stop ${j + 1}: ${stu.stopId}`);
                    console.log(`    Sequence: ${stu.stopSequence}`);
                    console.log(`    Arrival.time: ${stu.arrival?.time} (type: ${typeof stu.arrival?.time})`);
                    console.log(`    Arrival.delay: ${stu.arrival?.delay}`);
                    console.log(`    Departure.time: ${stu.departure?.time}`);
                    console.log(`    Departure.delay: ${stu.departure?.delay}`);
                    console.log(`    Schedule Rel: ${stu.scheduleRelationship}`);
                });
            });
        }
    });
}).on('error', console.error);
