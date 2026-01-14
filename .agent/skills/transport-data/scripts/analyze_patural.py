import csv

PATURAL_IDS = {'PATUA', 'PATUR', 'PATU'}
# Add variants if any
TARGET_IDS = PATURAL_IDS

trips = {}
with open('gtfs_data/trips.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Assuming E1 is route_id 3, but let's check all routes or just E1
        if row['route_id'] == '3':
            trips[row['trip_id']] = row

print(f"Loaded {len(trips)} E1 trips.")

# Find which trips stop at Patural
patural_trips = set()
trip_stops = {} # trip_id -> list of stop_ids

with open('gtfs_data/stop_times.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        tid = row['trip_id']
        if tid in trips:
            if tid not in trip_stops:
                trip_stops[tid] = []
            trip_stops[tid].append(row)
            
            if row['stop_id'] in TARGET_IDS:
                patural_trips.add(tid)

print(f"Found {len(patural_trips)} trips stopping at Patural.")

# Analyze them
print("\n--- Patural Trips Analysis ---")
print("Trip ID | Headsign | Direction | First Stop ID | Stops Count")

for tid in patural_trips:
    stops = sorted(trip_stops[tid], key=lambda x: int(x['stop_sequence']))
    first_stop = stops[0]['stop_id']
    last_stop = stops[-1]['stop_id']
    trip = trips[tid]
    
    # We want to know how to distinguish "Express"
    # Is it the Origin?
    
    print(f"{tid} | {trip['trip_headsign']} | {trip['direction_id']} | {first_stop} -> {last_stop} | {len(stops)}")

# Also identifying Non-Patural trips to compare?
# Or just focus on "What makes a Return Express trip unique?"
