import csv
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Use Paris timezone for GTFS schedules
PARIS_TZ = ZoneInfo('Europe/Paris')

target_route_id = '11821953316814877'
target_stop_id = '3377704015495667'

# Generate for today and next 7 days
start_date = datetime.now(PARIS_TZ)
dates = [(start_date + timedelta(days=i)).strftime('%Y%m%d') for i in range(8)]

schedule_data = {}

# Load calendar
services = {}
with open('gtfs_data/calendar.txt', 'r') as f:
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

# Load trips
trips = {}
with open('gtfs_data/trips.txt', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['route_id'] == target_route_id:
            trips[row['trip_id']] = row

# Load stop times
trip_stops = []
with open('gtfs_data/stop_times.txt', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['trip_id'] in trips and row['stop_id'] == target_stop_id:
            trip_stops.append(row)

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
    for stop_time in trip_stops:
        trip_id = stop_time['trip_id']
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
                'date': date_str
            })

# Sort
final_schedule.sort(key=lambda x: x['arrival'])

# Save
with open('src/data/static_schedule.json', 'w') as f:
    json.dump(final_schedule, f, indent=2)

print(f"Generated {len(final_schedule)} scheduled stops")
