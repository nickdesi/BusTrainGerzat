#!/usr/bin/env python3
"""
Extract Line E1 data from GTFS files.
Outputs a JSON file with stops and shapes for use in the map.
"""

import csv
import json
import sys
from pathlib import Path

GTFS_DIR = Path("gtfs_data")
OUTPUT_FILE = Path("public/data/lineE1_data.json")

# Target route names (E1 is the new name, 20 is the old one)
TARGET_ROUTE_NAMES = ['E1', '20']

def read_csv(filename):
    """Read a CSV file and return list of dicts."""
    filepath = GTFS_DIR / filename
    if not filepath.exists():
        print(f"Warning: {filepath} not found")
        return []
    
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        return list(reader)

def main():
    print("Extracting Line E1 data from GTFS...")
    
    # 1. Find Line E1 route
    routes = read_csv("routes.txt")
    target_route = None
    
    for route in routes:
        if route.get('route_short_name') in TARGET_ROUTE_NAMES:
            target_route = route
            break
    
    if not target_route:
        print(f"Error: Route E1/20 not found in routes.txt files")
        return

    target_route_id = target_route.get('route_id')
    print(f"Found route: {target_route.get('route_short_name')} (ID: {target_route_id}) - {target_route.get('route_long_name')}")
    
    # 2. Find all trips for Line E1
    trips = read_csv("trips.txt")
    line_e1_trips = [t for t in trips if t.get('route_id') == target_route_id]
    print(f"Found {len(line_e1_trips)} trips for Line E1")
    
    if not line_e1_trips:
        return
    
    # Get ALL unique shape IDs
    # Count how many trips use each shape
    shape_trip_counts = {}
    for trip in line_e1_trips:
        shape_id = trip.get('shape_id')
        if shape_id:
            shape_trip_counts[shape_id] = shape_trip_counts.get(shape_id, 0) + 1
    
    # Filter out shapes with very few trips (likely errors or special services)
    MIN_TRIPS = 10
    all_shape_ids = {s for s, count in shape_trip_counts.items() if count >= MIN_TRIPS}
    
    print(f"Found {len(all_shape_ids)} shapes with >= {MIN_TRIPS} trips")
    for shape_id, count in sorted(shape_trip_counts.items(), key=lambda x: -x[1]):
        status = "✅" if count >= MIN_TRIPS else "❌ (filtered)"
        print(f"  {shape_id}: {count} trips {status}")
    
    # 3. Extract shapes - group by shape_id
    shapes_data = read_csv("shapes.txt")
    all_shapes = {}
    
    for shape_id in all_shape_ids:
        shape_points = [(s.get('shape_pt_lat'), s.get('shape_pt_lon'), int(s.get('shape_pt_sequence', 0)))
                       for s in shapes_data if s.get('shape_id') == shape_id]
        shape_points.sort(key=lambda x: x[2])
        all_shapes[shape_id] = [[float(p[0]), float(p[1])] for p in shape_points]
        print(f"  Shape {shape_id}: {len(all_shapes[shape_id])} points")
    
    # Combine shapes by direction
    shapes = {"0": [], "1": []}
    
    # We take the most frequent shape for each direction as the "main" shape
    # This helps filter out variants like the Aulnat branch if E1 has any (though E1 shouldn't)
    main_shapes_by_dir = {} # direction -> (shape_id, count)
    
    for trip in line_e1_trips:
        direction = trip.get('direction_id', '0')
        shape_id = trip.get('shape_id')
        if shape_id and shape_id in all_shape_ids:
            count = shape_trip_counts[shape_id]
            if direction not in main_shapes_by_dir or count > main_shapes_by_dir[direction][1]:
                main_shapes_by_dir[direction] = (shape_id, count)

    for direction, (shape_id, count) in main_shapes_by_dir.items():
        if shape_id in all_shapes:
            shapes[direction] = all_shapes[shape_id]
            print(f"Selected main shape for direction {direction}: {shape_id} ({count} trips)")

    # 4. Find all stops for Line E1
    # First get all stop_ids from stop_times for Line E1 trips
    trip_ids = {t.get('trip_id') for t in line_e1_trips}
    stop_times = read_csv("stop_times.txt")
    
    # Get unique stops with their sequence in each direction
    stops_by_direction = {"0": {}, "1": {}}
    
    for st in stop_times:
        if st.get('trip_id') in trip_ids:
            # Find the direction for this trip
            trip = next((t for t in line_e1_trips if t.get('trip_id') == st.get('trip_id')), None)
            if trip:
                direction = trip.get('direction_id', '0')
                stop_id = st.get('stop_id')
                sequence = int(st.get('stop_sequence', 0))
                
                if stop_id not in stops_by_direction[direction] or sequence < stops_by_direction[direction][stop_id]:
                    stops_by_direction[direction][stop_id] = sequence
    
    # 5. Get stop details
    stops_data = read_csv("stops.txt")
    stops_dict = {s.get('stop_id'): s for s in stops_data}
    
    stops_list = []
    seen_stops = set()
    
    # Process direction 0 first
    for direction in ["0", "1"]:
        sorted_stops = sorted(stops_by_direction[direction].items(), key=lambda x: x[1])
        for stop_id, sequence in sorted_stops:
            if stop_id in stops_dict and stop_id not in seen_stops:
                stop = stops_dict[stop_id]
                stops_list.append({
                    "stopId": stop_id,
                    "name": stop.get('stop_name', 'Unknown'),
                    "lat": float(stop.get('stop_lat', 0)),
                    "lon": float(stop.get('stop_lon', 0)),
                    "sequence": sequence,
                    "direction": int(direction)
                })
                seen_stops.add(stop_id)
    
    print(f"Found {len(stops_list)} unique stops")
    
    # 6. Create output
    output = {
        "routeId": target_route_id,
        "routeName": target_route.get('route_short_name', 'E1'),
        "routeLongName": target_route.get('route_long_name', 'Ligne E1'),
        "routeColor": target_route.get('route_color', 'fdc300'), # Default to E1 yellow if missing
        "stops": stops_list,
        "shapes": {
            "direction0": shapes.get("0", []),
            "direction1": shapes.get("1", []),
            "branches": [] # No branches for E1 main line display
        }
    }
    
    # Ensure output directory exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"Output written to {OUTPUT_FILE}")
    print(f"  - {len(stops_list)} stops")
    print(f"  - {len(shapes.get('0', []))} shape points (direction 0)")
    print(f"  - {len(shapes.get('1', []))} shape points (direction 1)")

if __name__ == "__main__":
    main()
