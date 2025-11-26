import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import fs from 'fs';
import https from 'https';

const url = 'https://proxy.transport.data.gouv.fr/resource/sncf-gtfs-rt-trip-updates';
const file = fs.createWriteStream("sncf_debug.pb");

console.log("Downloading feed...");
https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close(parseFeed);
    });
});

function parseFeed() {
    console.log("Parsing feed...");
    const content = fs.readFileSync("sncf_debug.pb");
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(content);

    const gerzatCode = '87734046';

    let count = 0;

    feed.entity.forEach((entity) => {
        if (entity.tripUpdate) {
            const tripUpdate = entity.tripUpdate;
            const tripId = tripUpdate.trip.tripId || '';

            // Check if this trip stops at Gerzat
            let stopsAtGerzat = false;
            let arrivalTime = 0;

            if (tripUpdate.stopTimeUpdate) {
                tripUpdate.stopTimeUpdate.forEach((update) => {
                    if (update.stopId && update.stopId.includes(gerzatCode)) {
                        stopsAtGerzat = true;
                        if (update.arrival && update.arrival.time) {
                            arrivalTime = Number(update.arrival.time);
                        } else if (update.departure && update.departure.time) {
                            arrivalTime = Number(update.departure.time);
                        }
                    }
                });
            }

            if (stopsAtGerzat) {
                count++;
                const match = tripId.match(/OCESN(\d+)/);
                let trainNumber = match ? match[1] : 'Inconnu';
                let direction = 'unknown';
                if (trainNumber !== 'Inconnu') {
                    const num = parseInt(trainNumber, 10);
                    direction = num % 2 !== 0 ? 'To Clermont (Odd)' : 'From Clermont (Even)';
                }

                const date = new Date(arrivalTime * 1000);
                console.log(`Train ${trainNumber} (${direction}) - Arrival: ${date.toLocaleTimeString()} - TripId: ${tripId}`);
            }
        }
    });

    console.log(`Total trains found for Gerzat: ${count}`);
}
