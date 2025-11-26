import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import fs from 'fs';
import https from 'https';

const url = 'https://proxy.transport.data.gouv.fr/resource/sncf-gtfs-rt-trip-updates';
const file = fs.createWriteStream("sncf_realtime.pb");

https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close(parseFeed);
    });
});

function parseFeed() {
    const content = fs.readFileSync("sncf_realtime.pb");
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(content);

    const gerzatCode = '87734046';
    const clermontCode = '87734004';

    let found = 0;

    feed.entity.forEach((entity) => {
        if (entity.tripUpdate) {
            entity.tripUpdate.stopTimeUpdate.forEach((update) => {
                if (update.stopId && (update.stopId.includes(gerzatCode) || update.stopId.includes(clermontCode))) {
                    console.log(`Found update for stop ${update.stopId} on trip ${entity.tripUpdate.trip.tripId}`);
                    found++;
                }
            });
        }
    });

    console.log(`Total relevant updates found: ${found}`);
}
