import csv
import json
from datetime import datetime, timedelta
import os

# Configuration
GTFS_DIR = 'sncf_gtfs_data'
OUTPUT_FILE = 'static_train_schedule.json'
STOP_ID = 'StopPoint:OCETrain TER-87734046' # Gerzat
DAYS_TO_GENERATE = 8

def load_csv(filename):
    with open(os.path.join(GTFS_DIR, filename), 'r', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

def main():
    print("Loading GTFS data...")
    trips = load_csv('trips.txt')
    stop_times = load_csv('stop_times.txt')
    calendar_dates = load_csv('calendar_dates.txt')
    
    # 1. Find all trips that stop at the target stop
    print(f"Finding trips for stop {STOP_ID}...")
    relevant_trips = set()
    trip_stop_times = {} # trip_id -> {arrival_time, departure_time, stop_headsign}

    for st in stop_times:
        if st['stop_id'] == STOP_ID:
            relevant_trips.add(st['trip_id'])
            trip_stop_times[st['trip_id']] = {
                'arrival_time': st['arrival_time'],
                'departure_time': st['departure_time']
            }

    print(f"Found {len(relevant_trips)} relevant trips.")

    # 2. Map trips to their service_id and route_id
    trip_info = {} # trip_id -> {service_id, route_id, headsign, direction_id}
    for trip in trips:
        if trip['trip_id'] in relevant_trips:
            trip_info[trip['trip_id']] = {
                'service_id': trip['service_id'],
                'route_id': trip['route_id'],
                'headsign': trip['trip_headsign'],
                'direction_id': trip.get('direction_id', ''),
                'trip_id': trip['trip_id'] # Store trip_id for train number extraction
            }

    # 3. Organize calendar_dates by date
    # service_id -> set of dates (YYYYMMDD)
    service_dates = {}
    for cd in calendar_dates:
        if cd['exception_type'] == '1': # Service added
            if cd['service_id'] not in service_dates:
                service_dates[cd['service_id']] = set()
            service_dates[cd['service_id']].add(cd['date'])
    
    # 4. Generate schedule for next DAYS_TO_GENERATE days
    schedule = {}
    today = datetime.now().date()
    
    for i in range(DAYS_TO_GENERATE):
        current_date = today + timedelta(days=i)
        date_str = current_date.strftime('%Y%m%d')
        date_key = current_date.strftime('%Y-%m-%d')
        
        print(f"Processing {date_key}...")
        daily_trips = []

        for trip_id, info in trip_info.items():
            service_id = info['service_id']
            
            # Check if service runs on this date
            runs_today = False
            if service_id in service_dates and date_str in service_dates[service_id]:
                runs_today = True
            
            if runs_today:
                st = trip_stop_times[trip_id]
                
                # Extract train number from trip_id (e.g. OCESN874111F...)
                # Heuristic: Look for the number after OCESN or similar
                # Actually, trip_headsign often contains the train number in some feeds, but here it's usually the destination.
                # We'll use the trip_id parsing logic from the API.
                import re
                match = re.search(r'OCESN(\d+)', trip_id)
                train_number = match.group(1) if match else 'Inconnu'
                
                direction = 'unknown'
                if train_number != 'Inconnu':
                    num = int(train_number)
                    direction = 'To Clermont' if num % 2 != 0 else 'From Clermont'

                daily_trips.append({
                    'tripId': trip_id,
                    'routeId': info['route_id'],
                    'headsign': info['headsign'],
                    'arrivalTime': st['arrival_time'],
                    'departureTime': st['departure_time'],
                    'trainNumber': train_number,
                    'direction': direction
                })

        # Sort by arrival time
        daily_trips.sort(key=lambda x: x['arrivalTime'])
        schedule[date_key] = daily_trips

    # 5. Write to JSON
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(schedule, f, indent=2)
    
    print(f"Schedule generated in {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
