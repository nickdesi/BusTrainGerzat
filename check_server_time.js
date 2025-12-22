const staticSchedule = require('./src/data/static_schedule.json');

const now = Math.floor(Date.now() / 1000);
console.log('Current Server Time (s):', now);
console.log('Current Server Date:', new Date().toISOString());
console.log('Current Server Local:', new Date().toString());

// Check filtering logic
const trip1058 = staticSchedule.find(t => t.tripId === '1132_1000001_03GC.AR_105800' && t.date === '20251222');
if (trip1058) {
    console.log('\nTrip 10:58 Data:');
    console.log('  Arrival:', trip1058.arrival);
    console.log('  Diff (Arrival - Now):', trip1058.arrival - now);
    console.log('  Filter (Arrival > Now - 600):', trip1058.arrival > now - 600);
} else {
    console.log('Trip 10:58 not found in schedule.');
}

// Check Stop IDs
console.log('\nStop IDs in Static Schedule:');
const stopIds = new Set(staticSchedule.map(s => s.stopId).filter(Boolean));
console.log([...stopIds]);
