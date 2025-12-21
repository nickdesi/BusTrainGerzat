#!/usr/bin/env python3
"""
Extract Line E1 data from GTFS files for the live map.
Creates public/data/lineE1_data.json with stops, shapes, and route info.
"""

import csv
import json
import os

GTFS_DIR = 'gtfs_data'
OUTPUT_FILE = 'public/data/lineE1_data.json'
LINE_E1_ROUTE_ID = '3'  # Route ID for Line E1

def main():
    # Read stops
    stops = {}
    with open(f'{GTFS_DIR}/stops.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            stops[row['stop_id']] = {
                'stopId': row['stop_id'],
                'stopName': row['stop_name'],
                'lat': float(row['stop_lat']),
                'lon': float(row['stop_lon'])
            }
    
    print(f"✅ Loaded {len(stops)} stops")
    
    # Read routes to find Line E1
    routes = {}
    with open(f'{GTFS_DIR}/routes.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            routes[row['route_id']] = {
                'routeId': row['route_id'],
                'routeShortName': row['route_short_name'],
                'routeLongName': row['route_long_name'],
                'routeColor': row.get('route_color', 'E1B000')
            }
    
    line_e1 = routes.get(LINE_E1_ROUTE_ID)
    if line_e1:
        print(f"✅ Found Line E1: {line_e1['routeShortName']} - {line_e1['routeLongName']}")
    else:
        print(f"❌ Line E1 (route_id={LINE_E1_ROUTE_ID}) not found!")
        return
    
    # Read trips to find shape_ids for Line E1
    trips_by_shape = {}  # shape_id -> [trip_ids]
    trip_shapes = {}     # trip_id -> shape_id
    trip_directions = {} # trip_id -> direction_id
    
    with open(f'{GTFS_DIR}/trips.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['route_id'] == LINE_E1_ROUTE_ID:
                shape_id = row.get('shape_id', '')
                trip_id = row['trip_id']
                direction_id = row.get('direction_id', '0')
                
                trip_shapes[trip_id] = shape_id
                trip_directions[trip_id] = direction_id
                
                if shape_id:
                    if shape_id not in trips_by_shape:
                        trips_by_shape[shape_id] = []
                    trips_by_shape[shape_id].append(trip_id)
    
    print(f"✅ Found {len(trip_shapes)} trips for Line E1")
    print(f"✅ Found {len(trips_by_shape)} unique shape IDs")
    
    # Read shapes
    shapes_data = {}  # shape_id -> [(lat, lon), ...]
    with open(f'{GTFS_DIR}/shapes.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            shape_id = row['shape_id']
            if shape_id in trips_by_shape:
                if shape_id not in shapes_data:
                    shapes_data[shape_id] = []
                shapes_data[shape_id].append({
                    'seq': int(row['shape_pt_sequence']),
                    'lat': float(row['shape_pt_lat']),
                    'lon': float(row['shape_pt_lon'])
                })
    
    # Sort shape points by sequence and group by direction
    shapes_by_direction = {'0': [], '1': []}
    
    for shape_id, points in shapes_data.items():
        # Sort by sequence
        points.sort(key=lambda x: x['seq'])
        coords = [[p['lat'], p['lon']] for p in points]
        
        # Find direction for this shape
        sample_trip = trips_by_shape[shape_id][0] if trips_by_shape[shape_id] else None
        direction = trip_directions.get(sample_trip, '0')
        
        # Use the longest shape for each direction
        if len(coords) > len(shapes_by_direction.get(direction, [])):
            shapes_by_direction[direction] = coords
    
    print(f"✅ Shape 0: {len(shapes_by_direction['0'])} points")
    print(f"✅ Shape 1: {len(shapes_by_direction['1'])} points")
    
    # Read stop_times to find stops used by Line E1
    line_e1_stops = set()
    stop_sequences = {}  # stop_id -> min sequence
    
    with open(f'{GTFS_DIR}/stop_times.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trip_id = row['trip_id']
            if trip_id in trip_shapes:
                stop_id = row['stop_id']
                line_e1_stops.add(stop_id)
                seq = int(row['stop_sequence'])
                if stop_id not in stop_sequences or seq < stop_sequences[stop_id]:
                    stop_sequences[stop_id] = seq
    
    print(f"✅ Found {len(line_e1_stops)} stops used by Line E1")
    
    # Build stops list with Line E1 stops only
    e1_stops = []
    for stop_id in line_e1_stops:
        if stop_id in stops:
            stop_data = stops[stop_id].copy()
            stop_data['sequence'] = stop_sequences.get(stop_id, 999)
            e1_stops.append(stop_data)
    
    # Sort by sequence
    e1_stops.sort(key=lambda x: x['sequence'])
    
    # Build output
    output = {
        'route': line_e1,
        'stops': e1_stops,
        'shapes': shapes_by_direction
    }
    
    # Write output
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Generated {OUTPUT_FILE}")
    print(f"   - {len(e1_stops)} stops")
    print(f"   - Direction 0: {len(shapes_by_direction['0'])} shape points")
    print(f"   - Direction 1: {len(shapes_by_direction['1'])} shape points")

if __name__ == '__main__':
    main()
