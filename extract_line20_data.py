#!/usr/bin/env python3
"""
Extract Line 20 data from GTFS files.
Outputs a JSON file with stops and shapes for use in the map.
"""

import csv
import json
from pathlib import Path

GTFS_DIR = Path("gtfs_data")
OUTPUT_FILE = Path("public/data/line20_data.json")

# Line 20 route ID from the existing code
LINE_20_ROUTE_ID = "11821953316814877"

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
    print("Extracting Line 20 data from GTFS...")
    
    # 1. Find Line 20 route
    routes = read_csv("routes.txt")
    line_20 = None
    for route in routes:
        if route.get('route_id') == LINE_20_ROUTE_ID:
            line_20 = route
            break
    
    if not line_20:
        print(f"Error: Route {LINE_20_ROUTE_ID} not found in routes.txt")
        print("Available routes:")
        for r in routes[:10]:
            print(f"  {r.get('route_id')}: {r.get('route_short_name')} - {r.get('route_long_name')}")
        return
    
    print(f"Found route: {line_20.get('route_short_name')} - {line_20.get('route_long_name')}")
    
    # 2. Find all trips for Line 20
    trips = read_csv("trips.txt")
    line_20_trips = [t for t in trips if t.get('route_id') == LINE_20_ROUTE_ID]
    print(f"Found {len(line_20_trips)} trips for Line 20")
    
    if not line_20_trips:
        return
    
    # Get shape IDs for direction 0 and 1
    shape_ids = {}
    for trip in line_20_trips:
        direction = trip.get('direction_id', '0')
        if direction not in shape_ids:
            shape_ids[direction] = trip.get('shape_id')
    
    print(f"Shape IDs: {shape_ids}")
    
    # 3. Extract shapes
    shapes_data = read_csv("shapes.txt")
    shapes = {"0": [], "1": []}
    
    for direction, shape_id in shape_ids.items():
        if shape_id:
            shape_points = [(s.get('shape_pt_lat'), s.get('shape_pt_lon'), int(s.get('shape_pt_sequence', 0)))
                           for s in shapes_data if s.get('shape_id') == shape_id]
            shape_points.sort(key=lambda x: x[2])
            shapes[direction] = [[float(p[0]), float(p[1])] for p in shape_points]
            print(f"Direction {direction}: {len(shapes[direction])} shape points")
    
    # 4. Find all stops for Line 20
    # First get all stop_ids from stop_times for Line 20 trips
    trip_ids = {t.get('trip_id') for t in line_20_trips}
    stop_times = read_csv("stop_times.txt")
    
    # Get unique stops with their sequence in each direction
    stops_by_direction = {"0": {}, "1": {}}
    
    for st in stop_times:
        if st.get('trip_id') in trip_ids:
            # Find the direction for this trip
            trip = next((t for t in line_20_trips if t.get('trip_id') == st.get('trip_id')), None)
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
        "routeId": LINE_20_ROUTE_ID,
        "routeName": line_20.get('route_short_name', '20'),
        "routeLongName": line_20.get('route_long_name', 'Ligne 20'),
        "routeColor": line_20.get('route_color', 'E30613'),
        "stops": stops_list,
        "shapes": {
            "direction0": shapes.get("0", []),
            "direction1": shapes.get("1", [])
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
