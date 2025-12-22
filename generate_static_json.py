import csv
import json
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Use Paris timezone for GTFS schedules
PARIS_TZ = ZoneInfo('Europe/Paris')

# Target line and stop by NAME (more resilient to ID changes)
TARGET_ROUTE_NAMES = ['E1']  # E1 is the new name
TARGET_STOP_NAMES = ['GERZAT Champfleuri', 'Patural']
TARGET_MAIN_STOP = 'GERZAT Champfleuri'

# Generate for today and next 7 days
start_date = datetime.now(PARIS_TZ)
dates = [(start_date + timedelta(days=i)).strftime('%Y%m%d') for i in range(8)]

schedule_data = {}

# Find route_id by name
target_route_ids = set()
with open('gtfs_data/routes.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['route_short_name'] in TARGET_ROUTE_NAMES:
            target_route_ids.add(row['route_id'])
            print(f"✅ Found route: {row['route_short_name']} -> route_id={row['route_id']}")

if not target_route_ids:
    print(f"❌ Error: Could not find route with names {TARGET_ROUTE_NAMES}")
    sys.exit(1)

# Find stop_id by name
target_stop_ids = set()
main_stop_ids = set() # specifically for Gerzat Champfleuri
with open('gtfs_data/stops.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        for target_name in TARGET_STOP_NAMES:
            if target_name.lower() in row['stop_name'].lower():
                target_stop_ids.add(row['stop_id'])
                if TARGET_MAIN_STOP.lower() in row['stop_name'].lower():
                    main_stop_ids.add(row['stop_id'])
                print(f"✅ Found stop: {row['stop_name']} -> stop_id={row['stop_id']}")

if not target_stop_ids:
    print(f"❌ Error: Could not find any target stops")
    sys.exit(1)

# Load calendar
services = {}
with open('gtfs_data/calendar.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        services[row['service_id']] = row

# Load calendar_dates
exceptions = {}
try:
    with open('gtfs_data/calendar_dates.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['date'] not in exceptions:
                exceptions[row['date']] = []
            exceptions[row['date']].append(row)
except FileNotFoundError:
    pass

# Load trips for target routes
trips = {}
with open('gtfs_data/trips.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['route_id'] in target_route_ids:
            trips[row['trip_id']] = row

print(f"📋 Found {len(trips)} trips for target routes")

# Load stop times for target stops
trip_stops = []
with open('gtfs_data/stop_times.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['trip_id'] in trips and row['stop_id'] in target_stop_ids:
            trip_stops.append(row)

print(f"📋 Found {len(trip_stops)} stop times at target stops")

# Build schedule
final_schedule = []

for date_str in dates:
    dt = datetime.strptime(date_str, '%Y%m%d').replace(tzinfo=PARIS_TZ)
    day_of_week = dt.weekday() # 0=Mon, 6=Sun
    days_key = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][day_of_week]
    
    active_services = set()
    
    # Check calendar
    for service_id, service in services.items():
        if service['start_date'] <= date_str <= service['end_date']:
            if service[days_key] == '1':
                active_services.add(service_id)
    
    # Check exceptions
    if date_str in exceptions:
        for exc in exceptions[date_str]:
            if exc['exception_type'] == '1':
                active_services.add(exc['service_id'])
            elif exc['exception_type'] == '2':
                active_services.discard(exc['service_id'])
    
    # Filter trips
    # We might have multiple stop_times for the same trip (if it stops at both Patural and Champfleuri)
    # We want to prefer Champfleuri if present, otherwise Patural.
    
    trip_events = {} # trip_id -> {stop_id, arrival, departure}
    
    for stop_time in trip_stops:
        trip_id = stop_time['trip_id']
        stop_id = stop_time['stop_id']
        
        # If we already have an event for this trip, check if we should overwrite it
        if trip_id in trip_events:
            existing_stop = trip_events[trip_id]['stop_id']
            # If current is main stop and existing is NOT, overwrite
            if stop_id in main_stop_ids and existing_stop not in main_stop_ids:
                 trip_events[trip_id] = stop_time
            # Else keep existing (Main > Secondary, or First encountered if both same priority - simplistic)
        else:
            trip_events[trip_id] = stop_time

    for trip_id, stop_time in trip_events.items():
        trip = trips[trip_id]
        if trip['service_id'] in active_services:
            # Convert time to timestamp
            # Handle times > 24:00:00
            h, m, s = map(int, stop_time['arrival_time'].split(':'))
            trip_dt = dt + timedelta(hours=h, minutes=m, seconds=s)
            timestamp = int(trip_dt.timestamp())
            
            final_schedule.append({
                'tripId': trip_id,
                'arrival': timestamp,
                'departure': timestamp, # Using arrival as departure for simplicity if same
                'headsign': trip['trip_headsign'],
                'direction': int(trip['direction_id']),
                'date': date_str,
                'stopId': stop_time['stop_id']
            })

# Sort
final_schedule.sort(key=lambda x: x['arrival'])

# Save
with open('src/data/static_schedule.json', 'w') as f:
    json.dump(final_schedule, f, indent=2)

print(f"✅ Generated {len(final_schedule)} scheduled stops")
