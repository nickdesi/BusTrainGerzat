const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');

const url = 'https://proxy.transport.data.gouv.fr/resource/t2c-clermont-gtfs-rt-trip-update';

https.get(url, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        console.log('Searching for trips around 12:05 (TripId usually contains 120500)...');

        feed.entity.forEach((entity) => {
            if (entity.tripUpdate) {
                const tripId = entity.tripUpdate.trip.tripId;
                // Look for the specific trip found in static schedule: 1132_1000001_03GC.AR_120500
                if (tripId.includes('120500') || tripId.includes('121000')) {
                    console.log('\n------------------------------------------------');
                    console.log(`FOUND TRIPP ID: ${tripId}`);
                    console.log(`Route: ${entity.tripUpdate.trip.routeId}`);
                    console.log('Stop Updates:');
                    entity.tripUpdate.stopTimeUpdate.forEach(stu => {
                        const arrTime = stu.arrival ? stu.arrival.time : 'N/A';
                        const depTime = stu.departure ? stu.departure.time : 'N/A';
                        const arrDelay = stu.arrival ? stu.arrival.delay : 'N/A';

                        // Convert timestamp to HH:MM:SS
                        let readableTime = 'N/A';
                        if (arrTime !== 'N/A') {
                            const date = new Date(arrTime * 1000);
                            // Adjust to CET roughly for display
                            readableTime = date.toISOString().substr(11, 8);
                        }

                        console.log(`  StopID: ${stu.stopId} | Time: ${arrTime} (${readableTime}) | Delay: ${arrDelay}`);
                    });
                }
            }
        });
    });
});
