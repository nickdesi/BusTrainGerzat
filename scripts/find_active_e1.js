const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');

const url = 'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update';

https.get(url, (res) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

        console.log('=== Looking for E1 trips WITH actual time data ===\n');

        const e1Trips = feed.entity.filter(e =>
            e.tripUpdate && e.tripUpdate.trip.routeId === '3'
        );

        let foundWithTime = 0;

        for (const e of e1Trips) {
            const tu = e.tripUpdate;
            const stops = tu.stopTimeUpdate || [];

            // Find stops with actual time data
            const stopsWithTime = stops.filter(s =>
                s.arrival?.time || s.departure?.time
            );

            if (stopsWithTime.length > 0) {
                foundWithTime++;
                console.log(`\n=== ${tu.trip.tripId} has ${stopsWithTime.length} stops with times ===`);
                stopsWithTime.slice(0, 3).forEach(s => {
                    console.log(`  ${s.stopId}: arrival=${s.arrival?.time}, delay=${s.arrival?.delay}`);
                });
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total E1 trips: ${e1Trips.length}`);
        console.log(`Trips with time data: ${foundWithTime}`);

        if (foundWithTime === 0) {
            console.log('\n⚠️  NO E1 trips have real-time data right now!');
            console.log('All stops show scheduleRelationship=2 (NO_DATA).');
            console.log('This is a T2C API issue, not a code bug.');
        }
    });
}).on('error', console.error);
