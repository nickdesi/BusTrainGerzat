#!/usr/bin/env python3
"""
Generate a JSON file with all stop times for Line E1 (route_id=3).
This will be used as a fallback in the Trip API when RT data is unavailable.
"""
import csv
import json
from pathlib import Path

GTFS_DIR = Path("gtfs_data")
OUTPUT_FILE = Path("public/data/e1_stop_times.json")

def parse_time(time_str):
    """Convert HH:MM:SS to seconds from midnight."""
    parts = time_str.split(':')
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])

def main():
    # 1. Get all E1 trip IDs (route_id = '3')
    e1_trip_ids = set()
    e1_trip_info = {}
    
    with open(GTFS_DIR / "trips.txt", 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['route_id'] == '3':  # Line E1
                e1_trip_ids.add(row['trip_id'])
                e1_trip_info[row['trip_id']] = {
                    'headsign': row.get('trip_headsign', ''),
                    'direction': int(row.get('direction_id', 0))
                }
    
    print(f"Found {len(e1_trip_ids)} E1 trips")
    
    # 2. Get all stop times for E1 trips
    trips_data = {}
    
    with open(GTFS_DIR / "stop_times.txt", 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trip_id = row['trip_id']
            if trip_id not in e1_trip_ids:
                continue
            
            if trip_id not in trips_data:
                trips_data[trip_id] = {
                    'tripId': trip_id,
                    'headsign': e1_trip_info[trip_id]['headsign'],
                    'direction': e1_trip_info[trip_id]['direction'],
                    'stops': []
                }
            
            trips_data[trip_id]['stops'].append({
                'stopId': row['stop_id'],
                'sequence': int(row['stop_sequence']),
                'arrivalTime': parse_time(row['arrival_time']),  # Seconds from midnight
                'departureTime': parse_time(row['departure_time'])
            })
    
    # Sort stops by sequence for each trip
    for trip in trips_data.values():
        trip['stops'].sort(key=lambda s: s['sequence'])
    
    # Convert to list
    result = list(trips_data.values())
    
    print(f"Processed {len(result)} trips with stop times")
    
    # Save to JSON
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False)
    
    print(f"Saved to {OUTPUT_FILE}")
    
    # Show sample
    if result:
        sample = result[0]
        print(f"\nSample trip: {sample['tripId']}")
        print(f"  Direction: {sample['direction']}")
        print(f"  Headsign: {sample['headsign']}")
        print(f"  Stops: {len(sample['stops'])}")
        for stop in sample['stops'][:3]:
            h = stop['arrivalTime'] // 3600
            m = (stop['arrivalTime'] % 3600) // 60
            print(f"    {stop['sequence']}: {stop['stopId']} @ {h:02d}:{m:02d}")

if __name__ == '__main__':
    main()
