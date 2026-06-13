import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { format, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const GTFS_DIR = 'gtfs_data';
const PARIS_TZ = 'Europe/Paris';

const TARGET_ROUTE_NAMES = new Set(['E1', '20']); // Support 20 as fallback
const TARGET_STOP_NAMES = ['GERZAT Champfleuri', 'Patural'];
const TARGET_MAIN_STOP = 'GERZAT Champfleuri';

function readCsv(fileName: string): any[] {
  const filePath = path.join(GTFS_DIR, fileName);
  if (!fs.existsSync(filePath)) return [];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const content = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;
  return parse(content, { columns: true, skip_empty_lines: true });
}

function main() {
  const now = new Date();
  const dates = Array.from({ length: 8 }).map((_, i) => format(addDays(now, i), 'yyyyMMdd'));

  const targetRouteIds = new Set<string>();
  for (const row of readCsv('routes.txt')) {
    if (TARGET_ROUTE_NAMES.has(row.route_short_name)) {
      targetRouteIds.add(row.route_id);
      console.log(`✅ Found route: ${row.route_short_name} -> route_id=${row.route_id}`);
    }
  }

  if (targetRouteIds.size === 0) {
    console.log(`❌ Error: Could not find route with names ${Array.from(TARGET_ROUTE_NAMES).join(', ')}`);
    process.exit(1);
  }

  const gtfsConfig: Record<string, any> = {
    routeIds: Array.from(targetRouteIds),
    routeNames: Array.from(TARGET_ROUTE_NAMES),
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync('src/data', { recursive: true });
  fs.writeFileSync('src/data/gtfs_config.json', JSON.stringify(gtfsConfig, null, 2));
  console.log(`✅ Exported gtfs_config.json with route IDs: ${Array.from(targetRouteIds).join(', ')}`);

  const targetStopIds = new Set<string>();
  const mainStopIds = new Set<string>();
  const paturalStopIds = new Set<string>();

  for (const row of readCsv('stops.txt')) {
    const stopNameLower = row.stop_name.toLowerCase();
    for (const targetName of TARGET_STOP_NAMES) {
      if (stopNameLower.includes(targetName.toLowerCase())) {
        targetStopIds.add(row.stop_id);
        if (stopNameLower.includes(TARGET_MAIN_STOP.toLowerCase())) {
          mainStopIds.add(row.stop_id);
        }
        if (stopNameLower.includes('patural')) {
          paturalStopIds.add(row.stop_id);
        }
        console.log(`✅ Found stop: ${row.stop_name} -> stop_id=${row.stop_id}`);
      }
    }
  }

  if (targetStopIds.size === 0) {
    console.log(`❌ Error: Could not find any target stops`);
    process.exit(1);
  }

  gtfsConfig.stopIds = {
    all: Array.from(targetStopIds),
    champfleuri: Array.from(mainStopIds),
    patural: Array.from(paturalStopIds),
  };
  fs.writeFileSync('src/data/gtfs_config.json', JSON.stringify(gtfsConfig, null, 2));
  console.log(`✅ Updated gtfs_config.json with Stop IDs`);

  const services: Record<string, any> = {};
  for (const row of readCsv('calendar.txt')) {
    services[row.service_id] = row;
  }

  const exceptions: Record<string, any[]> = {};
  for (const row of readCsv('calendar_dates.txt')) {
    if (!exceptions[row.date]) exceptions[row.date] = [];
    exceptions[row.date].push(row);
  }

  const trips: Record<string, any> = {};
  for (const row of readCsv('trips.txt')) {
    if (targetRouteIds.has(row.route_id)) {
      trips[row.trip_id] = row;
    }
  }
  console.log(`📋 Found ${Object.keys(trips).length} trips for target routes`);

  const tripStops = [];
  for (const row of readCsv('stop_times.txt')) {
    if (trips[row.trip_id] && targetStopIds.has(row.stop_id)) {
      tripStops.push(row);
    }
  }
  console.log(`📋 Found ${tripStops.length} stop times at target stops`);

  const finalSchedule: any[] = [];
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (const dateStr of dates) {
    if (dateStr.endsWith('0501')) continue;

    // Build noon time in UTC to avoid DST edge cases when computing day of week
    const dtUtc = new Date(Date.UTC(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(4, 6)) - 1,
      parseInt(dateStr.slice(6, 8)),
      12, 0, 0
    ));
    const dayOfWeek = dtUtc.getUTCDay();
    const daysKey = DAYS[dayOfWeek];

    const activeServices = new Set<string>();

    for (const [serviceId, service] of Object.entries(services)) {
      if (service.start_date <= dateStr && dateStr <= service.end_date) {
        if (service[daysKey] === '1') {
          activeServices.add(serviceId);
        }
      }
    }

    if (exceptions[dateStr]) {
      for (const exc of exceptions[dateStr]) {
        if (exc.exception_type === '1') {
          activeServices.add(exc.service_id);
        } else if (exc.exception_type === '2') {
          activeServices.delete(exc.service_id);
        }
      }
    }

    const tripEvents: Record<string, any> = {};

    for (const stopTime of tripStops) {
      const tripId = stopTime.trip_id;
      const stopId = stopTime.stop_id;

      if (tripEvents[tripId]) {
        const existingStop = tripEvents[tripId].stop_id;
        if (mainStopIds.has(stopId) && !mainStopIds.has(existingStop)) {
          tripEvents[tripId] = stopTime;
        }
      } else {
        if (!mainStopIds.has(stopId)) {
          const tripHeadsign = trips[tripId].trip_headsign.toUpperCase();
          if (!tripHeadsign.includes('BALLAINVILLIERS') && !tripHeadsign.includes('PATURAL')) {
            continue;
          }
        }
        tripEvents[tripId] = stopTime;
      }
    }

    for (const [tripId, stopTime] of Object.entries(tripEvents)) {
      const trip = trips[tripId];
      if (activeServices.has(trip.service_id)) {
        const parts = stopTime.arrival_time.split(':').map(Number);

        // Base date in Paris timezone for start of day
        const tzDateStr = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}T00:00:00`;
        const startOfDay = toZonedTime(tzDateStr, PARIS_TZ);

        // Add time
        const tripDt = new Date(startOfDay.getTime() + (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
        const timestamp = Math.floor(tripDt.getTime() / 1000);

        finalSchedule.push({
          tripId,
          arrival: timestamp,
          departure: timestamp,
          headsign: trip.trip_headsign,
          direction: parseInt(trip.direction_id),
          date: dateStr,
          stopId: stopTime.stop_id
        });
      }
    }
  }

  finalSchedule.sort((a, b) => a.arrival - b.arrival);

  fs.writeFileSync('src/data/static_schedule.json', JSON.stringify(finalSchedule, null, 2));
  console.log(`✅ Generated ${finalSchedule.length} scheduled stops`);
}

main();
