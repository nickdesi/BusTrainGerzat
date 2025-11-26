import csv
from datetime import datetime

target_route_id = '11821953316814877'
target_stop_id = '3377704015495667'
today_str = '20251126' # YYYYMMDD
day_of_week = 2 # Wednesday (0=Monday, 2=Wednesday)

active_services = set()

# Check calendar.txt
with open('gtfs_data/calendar.txt', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        start_date = row['start_date']
        end_date = row['end_date']
        if start_date <= today_str <= end_date:
            # Check day of week
            days = [row['monday'], row['tuesday'], row['wednesday'], row['thursday'], row['friday'], row['saturday'], row['sunday']]
            if days[day_of_week] == '1':
                active_services.add(row['service_id'])

print(f"Active services from calendar: {active_services}")

# Check calendar_dates.txt (exceptions)
try:
    with open('gtfs_data/calendar_dates.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['date'] == today_str:
                if row['exception_type'] == '1': # Added
                    active_services.add(row['service_id'])
                elif row['exception_type'] == '2': # Removed
                    active_services.discard(row['service_id'])
except FileNotFoundError:
    pass

print(f"Final active services: {active_services}")

# Find trips
active_trips = {}
with open('gtfs_data/trips.txt', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['route_id'] == target_route_id and row['service_id'] in active_services:
            active_trips[row['trip_id']] = row

print(f"Found {len(active_trips)} active trips for route {target_route_id}")

# Find stop times
schedule = []
with open('gtfs_data/stop_times.txt', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['trip_id'] in active_trips and row['stop_id'] == target_stop_id:
            schedule.append({
                'trip_id': row['trip_id'],
                'arrival_time': row['arrival_time'],
                'departure_time': row['departure_time'],
                'headsign': active_trips[row['trip_id']]['trip_headsign'],
                'direction_id': active_trips[row['trip_id']]['direction_id']
            })

# Sort by time
schedule.sort(key=lambda x: x['arrival_time'])

print(f"Found {len(schedule)} scheduled stops at {target_stop_id}")
for s in schedule:
    print(f"{s['arrival_time']} - {s['headsign']} (Dir: {s['direction_id']})")
