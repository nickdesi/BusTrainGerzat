import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const GTFS_DIR = 'gtfs_data';
const OUTPUT_FILE = path.join('public', 'data', 'lineE1_data.json');
const TARGET_ROUTE_NAMES = new Set(['E1', '20']);

function readCsv(fileName: string): any[] {
  const filePath = path.join(GTFS_DIR, fileName);
  if (!fs.existsSync(filePath)) return [];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const content = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;
  return parse(content, { columns: true, skip_empty_lines: true });
}

function main() {
  const routes: Record<string, any> = {};
  const targetRouteIds = new Set<string>();

  for (const row of readCsv('routes.txt')) {
    const route = {
      routeId: row.route_id,
      routeShortName: row.route_short_name,
      routeLongName: row.route_long_name || '',
      routeColor: row.route_color || 'fdc300',
    };
    routes[row.route_id] = route;
    if (TARGET_ROUTE_NAMES.has(row.route_short_name)) {
      targetRouteIds.add(row.route_id);
    }
  }

  if (targetRouteIds.size === 0) {
    throw new Error(`Could not find route names: ${Array.from(TARGET_ROUTE_NAMES).join(', ')}`);
  }

  const routeId = Array.from(targetRouteIds).sort()[0];
  const route = routes[routeId];

  const stops: Record<string, any> = {};
  for (const row of readCsv('stops.txt')) {
    stops[row.stop_id] = {
      stopId: row.stop_id,
      stopName: row.stop_name,
      lat: parseFloat(row.stop_lat),
      lon: parseFloat(row.stop_lon),
    };
  }

  const trips: Record<string, any> = {};
  const tripsByShape: Record<string, string[]> = {};

  for (const row of readCsv('trips.txt')) {
    if (!targetRouteIds.has(row.route_id)) continue;

    const tripId = row.trip_id;
    const shapeId = row.shape_id || '';
    const directionId = row.direction_id || '0';
    trips[tripId] = { shapeId, directionId };

    if (shapeId) {
      if (!tripsByShape[shapeId]) tripsByShape[shapeId] = [];
      tripsByShape[shapeId].push(tripId);
    }
  }

  if (Object.keys(trips).length === 0) {
    throw new Error(`No trips found for route IDs: ${Array.from(targetRouteIds).join(', ')}`);
  }

  const shapePoints: Record<string, any[]> = {};
  for (const shapeId of Object.keys(tripsByShape)) {
    shapePoints[shapeId] = [];
  }

  for (const row of readCsv('shapes.txt')) {
    const shapeId = row.shape_id;
    if (!shapePoints[shapeId]) continue;

    shapePoints[shapeId].push({
      seq: parseInt(row.shape_pt_sequence, 10),
      lat: parseFloat(row.shape_pt_lat),
      lon: parseFloat(row.shape_pt_lon),
    });
  }

  const shapesByDirection: Record<string, number[][]> = { '0': [], '1': [] };
  for (const [shapeId, points] of Object.entries(shapePoints)) {
    points.sort((a, b) => a.seq - b.seq);
    const coords = points.map(p => [p.lat, p.lon]);
    const sampleTripId = tripsByShape[shapeId][0];
    const directionId = trips[sampleTripId].directionId;

    if (coords.length > (shapesByDirection[directionId]?.length || 0)) {
      shapesByDirection[directionId] = coords;
    }
  }

  const usedStopIds = new Set<string>();
  const stopSequences: Record<string, number> = {};

  for (const row of readCsv('stop_times.txt')) {
    const tripId = row.trip_id;
    if (!trips[tripId]) continue;

    const stopId = row.stop_id;
    const sequence = parseInt(row.stop_sequence, 10);
    usedStopIds.add(stopId);
    stopSequences[stopId] = Math.min(sequence, stopSequences[stopId] ?? sequence);
  }

  const lineStops = [];
  for (const stopId of usedStopIds) {
    const stop = stops[stopId];
    if (!stop) continue;
    lineStops.push({ ...stop, sequence: stopSequences[stopId] ?? 999 });
  }

  lineStops.sort((a, b) => {
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    if (a.stopName !== b.stopName) return a.stopName.localeCompare(b.stopName);
    return a.stopId.localeCompare(b.stopId);
  });

  const output = {
    route,
    stops: lineStops,
    shapes: shapesByDirection,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf-8');

  console.log(`✅ Generated ${OUTPUT_FILE}`);
  console.log(`   - route: ${route.routeShortName} (${routeId})`);
  console.log(`   - stops: ${lineStops.length}`);
  console.log(`   - direction 0 shape points: ${shapesByDirection['0'].length}`);
  console.log(`   - direction 1 shape points: ${shapesByDirection['1'].length}`);
}

main();
