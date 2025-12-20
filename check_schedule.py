#!/usr/bin/env python3
"""
Check schedule for Line E1 at GERZAT Champfleuri.
Uses name-based lookup for route and stop IDs.
"""
import csv
from datetime import datetime
from zoneinfo import ZoneInfo

# Target route and stop by NAME (resilient to ID changes)
TARGET_ROUTE_NAMES = ['E1', '20']  # E1 is the new name, 20 was the old
TARGET_STOP_NAME = 'GERZAT Champfleuri'

# Get today's date dynamically
PARIS_TZ = ZoneInfo('Europe/Paris')
now = datetime.now(PARIS_TZ)
today_str = now.strftime('%Y%m%d')
day_of_week = now.weekday()  # 0=Monday, 6=Sunday

# Step 1: Find route_id by name
target_route_ids = set()
with open('gtfs_data/routes.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['route_short_name'] in TARGET_ROUTE_NAMES:
            target_route_ids.add(row['route_id'])
            print(f"✅ Found route: {row['route_short_name']} -> route_id={row['route_id']}")

if not target_route_ids:
    print(f"❌ Error: Could not find route with names {TARGET_ROUTE_NAMES}")
    exit(1)

# Step 2: Find stop_id by name
target_stop_ids = set()
with open('gtfs_data/stops.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if TARGET_STOP_NAME.lower() in row['stop_name'].lower():
            target_stop_ids.add(row['stop_id'])
            print(f"✅ Found stop: {row['stop_name']} -> stop_id={row['stop_id']}")

if not target_stop_ids:
    print(f"❌ Error: Could not find stop with name containing '{TARGET_STOP_NAME}'")
    exit(1)

# Step 3: Find active services
active_services = set()

# Check calendar.txt
with open('gtfs_data/calendar.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        start_date = row['start_date']
        end_date = row['end_date']
        if start_date <= today_str <= end_date:
            days = [row['monday'], row['tuesday'], row['wednesday'], row['thursday'], row['friday'], row['saturday'], row['sunday']]
            if days[day_of_week] == '1':
                active_services.add(row['service_id'])

print(f"📅 Active services from calendar: {len(active_services)}")

# Check calendar_dates.txt (exceptions)
try:
    with open('gtfs_data/calendar_dates.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['date'] == today_str:
                if row['exception_type'] == '1':  # Added
                    active_services.add(row['service_id'])
                elif row['exception_type'] == '2':  # Removed
                    active_services.discard(row['service_id'])
except FileNotFoundError:
    pass

print(f"📅 Final active services: {len(active_services)}")

# Step 4: Find active trips for our route
active_trips = {}
with open('gtfs_data/trips.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['route_id'] in target_route_ids and row['service_id'] in active_services:
            active_trips[row['trip_id']] = row

print(f"🚌 Found {len(active_trips)} active trips for route E1")

# Step 5: Find stop times at our stops
schedule = []
with open('gtfs_data/stop_times.txt', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['trip_id'] in active_trips and row['stop_id'] in target_stop_ids:
            schedule.append({
                'trip_id': row['trip_id'],
                'arrival_time': row['arrival_time'],
                'departure_time': row['departure_time'],
                'headsign': active_trips[row['trip_id']]['trip_headsign'],
                'direction_id': active_trips[row['trip_id']]['direction_id']
            })

# Sort by time
schedule.sort(key=lambda x: x['arrival_time'])

print(f"\n📋 Found {len(schedule)} scheduled stops at {TARGET_STOP_NAME}:")
for s in schedule[:20]:  # Show first 20
    print(f"  {s['arrival_time']} - {s['headsign']} (Dir: {s['direction_id']})")
if len(schedule) > 20:
    print(f"  ... and {len(schedule) - 20} more")
