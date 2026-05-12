import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const GTFS_DIR = 'gtfs_data';
const OUTPUT_FILE = path.join('public', 'data', 'e1_stop_times.json');

function readCsv(fileName: string): any[] {
  const filePath = path.join(GTFS_DIR, fileName);
  if (!fs.existsSync(filePath)) return [];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const content = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;
  return parse(content, { columns: true, skip_empty_lines: true });
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function main() {
  const e1RouteIds = new Set<string>();

  for (const row of readCsv('routes.txt')) {
    if (row.route_short_name === 'E1' || row.route_short_name === '20') {
      e1RouteIds.add(row.route_id);
    }
  }

  if (e1RouteIds.size === 0) {
    console.log("❌ Error: Could not find route E1");
    return;
  }

  console.log(`Found E1 route IDs: ${Array.from(e1RouteIds).join(', ')}`);

  const e1TripIds = new Set<string>();
  const e1TripInfo: Record<string, any> = {};

  for (const row of readCsv('trips.txt')) {
    if (e1RouteIds.has(row.route_id)) {
      e1TripIds.add(row.trip_id);
      e1TripInfo[row.trip_id] = {
        headsign: row.trip_headsign || '',
        direction: parseInt(row.direction_id || '0', 10),
      };
    }
  }

  console.log(`Found ${e1TripIds.size} E1 trips`);

  const tripsData: Record<string, any> = {};

  for (const row of readCsv('stop_times.txt')) {
    const tripId = row.trip_id;
    if (!e1TripIds.has(tripId)) continue;

    if (!tripsData[tripId]) {
      tripsData[tripId] = {
        tripId,
        headsign: e1TripInfo[tripId].headsign,
        direction: e1TripInfo[tripId].direction,
        stops: [],
      };
    }

    tripsData[tripId].stops.push({
      stopId: row.stop_id,
      sequence: parseInt(row.stop_sequence, 10),
      arrivalTime: parseTime(row.arrival_time),
      departureTime: parseTime(row.departure_time),
    });
  }

  for (const trip of Object.values(tripsData)) {
    trip.stops.sort((a: any, b: any) => a.sequence - b.sequence);
  }

  const result = Object.values(tripsData);
  console.log(`Processed ${result.length} trips with stop times`);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`✅ Saved to ${OUTPUT_FILE}`);

  if (result.length > 0) {
    const sample = result[0];
    console.log(`\nSample trip: ${sample.tripId}`);
    console.log(`  Direction: ${sample.direction}`);
    console.log(`  Headsign: ${sample.headsign}`);
    console.log(`  Stops: ${sample.stops.length}`);
    for (const stop of sample.stops.slice(0, 3)) {
      const h = Math.floor(stop.arrivalTime / 3600);
      const m = Math.floor((stop.arrivalTime % 3600) / 60);
      console.log(`    ${stop.sequence}: ${stop.stopId} @ ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
}

main();
