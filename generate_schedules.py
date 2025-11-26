import csv
import json
from datetime import datetime, timedelta
import os

# Configuration for T2C (Bus)
T2C_GTFS_DIR = 'gtfs_data'
T2C_OUTPUT_FILE = 'src/app/api/realtime/static_schedule.json'
T2C_TARGET_ROUTE_ID = '11821953316814877'
T2C_TARGET_STOP_ID = '3377704015495667'

# Configuration for SNCF (Train)
SNCF_GTFS_DIR = 'sncf_gtfs_data'
SNCF_OUTPUT_FILE = 'public/static_train_schedule.json'
SNCF_TARGET_STOP_ID = 'StopPoint:OCETrain TER-87734046' # Gerzat

DAYS_TO_GENERATE = 8

def load_csv_from_dir(directory, filename):
    """Loads a CSV file from a specified directory."""
    path = os.path.join(directory, filename)
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

def parse_gtfs_time(time_str, date_obj):
    """Parses GTFS time (which can be > 24:00:00) and returns a datetime object."""
    h, m, s = map(int, time_str.split(':'))
    return date_obj + timedelta(hours=h, minutes=m, seconds=s)

def generate_schedule(gtfs_dir, output_file, target_route_id, target_stop_id, is_sncf=False):
    """
    Generates a schedule from GTFS data for a specific route and stop.
    """
    print(f"--- Generating schedule for {'SNCF' if is_sncf else 'T2C'} ---")

    # 1. Load GTFS data
    calendar = load_csv_from_dir(gtfs_dir, 'calendar.txt')
    calendar_dates = load_csv_from_dir(gtfs_dir, 'calendar_dates.txt')
    trips_data = load_csv_from_dir(gtfs_dir, 'trips.txt')
    stop_times_data = load_csv_from_dir(gtfs_dir, 'stop_times.txt')

    # 2. Build a map of service_id to active dates
    service_active_dates = {}
    start_date = datetime.now()
    date_range = [start_date + timedelta(days=i) for i in range(DAYS_TO_GENERATE)]
    date_strs = {d.strftime('%Y%m%d'): d for d in date_range}

    # From calendar.txt
    if calendar:
        for service in calendar:
            service_id = service['service_id']
            service_active_dates[service_id] = set()
            service_start = service['start_date']
            service_end = service['end_date']
            days = [service.get(d, '0') for d in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']]

            for date_str, dt in date_strs.items():
                if service_start <= date_str <= service_end:
                    if days[dt.weekday()] == '1':
                        service_active_dates[service_id].add(dt)

    # From calendar_dates.txt (exceptions)
    for exception in calendar_dates:
        service_id = exception['service_id']
        date_str = exception['date']
        if date_str in date_strs:
            dt = date_strs[date_str]
            if service_id not in service_active_dates:
                service_active_dates[service_id] = set()

            if exception['exception_type'] == '1': # Added
                service_active_dates[service_id].add(dt)
            elif exception['exception_type'] == '2': # Removed
                service_active_dates[service_id].discard(dt)

    # 3. Find relevant trips and their stop times at the target stop
    trips_at_stop = {}
    for stop_time in stop_times_data:
        if stop_time['stop_id'] == target_stop_id:
            trips_at_stop[stop_time['trip_id']] = {
                'arrival_time': stop_time['arrival_time'],
                'departure_time': stop_time['departure_time']
            }

    # 4. Filter trips by route (if applicable) and gather details
    relevant_trips = {}
    for trip in trips_data:
        trip_id = trip['trip_id']
        # Filter by route for T2C, or just by stop for SNCF
        is_relevant_route = (not target_route_id) or (trip.get('route_id') == target_route_id)

        if trip_id in trips_at_stop and is_relevant_route:
            relevant_trips[trip_id] = {
                'service_id': trip['service_id'],
                'headsign': trip['trip_headsign'],
                'direction_id': trip.get('direction_id', ''),
                'stop_info': trips_at_stop[trip_id]
            }

    # 5. Generate the final schedule
    final_schedule = []
    for trip_id, trip_details in relevant_trips.items():
        service_id = trip_details['service_id']
        if service_id in service_active_dates:
            for date_obj in service_active_dates[service_id]:
                arrival_dt = parse_gtfs_time(trip_details['stop_info']['arrival_time'], date_obj)
                departure_dt = parse_gtfs_time(trip_details['stop_info']['departure_time'], date_obj)

                entry = {
                    'tripId': trip_id,
                    'arrival': int(arrival_dt.timestamp()),
                    'departure': int(departure_dt.timestamp()),
                    'headsign': trip_details['headsign'],
                    'direction': int(trip_details['direction_id']) if trip_details['direction_id'] else 0,
                    'date': date_obj.strftime('%Y%m%d')
                }

                if is_sncf:
                    import re
                    match = re.search(r'OCESN(\d+)', trip_id)
                    train_number = match.group(1) if match else 'Inconnu'

                    direction = 'unknown'
                    if train_number != 'Inconnu':
                        num = int(train_number)
                        direction = 'To Clermont' if num % 2 != 0 else 'From Clermont'

                    entry['trainNumber'] = train_number
                    entry['direction'] = direction

                final_schedule.append(entry)

    # 6. Sort and save
    final_schedule.sort(key=lambda x: x['arrival'])

    # Create directory if it doesn't exist
    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump(final_schedule, f, indent=2)

    print(f"Generated {len(final_schedule)} scheduled stops in {output_file}")


def main():
    """Main function to generate both schedules."""
    # Generate T2C schedule
    generate_schedule(T2C_GTFS_DIR, T2C_OUTPUT_FILE, T2C_TARGET_ROUTE_ID, T2C_TARGET_STOP_ID)

    # Generate SNCF schedule (with slight modifications if needed)
    # The generic function should work, but SNCF logic might differ.
    # For now, let's assume the same structure.
    # We pass `target_route_id=None` to select all routes for the given stop.
    generate_schedule(SNCF_GTFS_DIR, SNCF_OUTPUT_FILE, None, SNCF_TARGET_STOP_ID, is_sncf=True)


if __name__ == '__main__':
    main()
