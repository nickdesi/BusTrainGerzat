import json
import re
import argparse
from datetime import datetime, timezone, timedelta
import sys
import os

# Constants
STATIC_SCHEDULE_PATH = 'src/data/static_schedule.json'

def get_day_type(date_str):
    dt = datetime.strptime(date_str, '%Y%m%d')
    wd = dt.weekday()
    if wd < 5:
        return 'MF'
    elif wd == 5:
        return 'SAT'
    else:
        return 'SUN'

def parse_schedule_text(filepath):
    """
    Parses a text file with T2C schedule format.
    Returns dictionaries for MF, SAT, SUN with list of trips.
    Each trip: {time: "HH:MM", headsign: "...", direction: 0|1}
    """
    trips_mf = []
    trips_sat = []
    trips_sun = []
    
    current_section = None
    current_direction = 0
    last_hour = 0
    
    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"❌ Error: File '{filepath}' not found.")
        sys.exit(1)

    for line in lines:
        line = line.strip()
        
        # Section Detection
        if "DU LUNDI AU VENDREDI" in line:
            current_section = 'MF'
            continue
        if "LE SAMEDI" in line:
            current_section = 'SAT'
            current_direction = 0
            last_hour = 0
            continue
        if "LE DIMANCHE" in line:
            current_section = 'SUN'
            current_direction = 0
            last_hour = 0
            continue
        
        # Direction Detection
        if "DE GERZAT" in line:
            current_direction = 0 # Gerzat -> Aubiere
            last_hour = 0
            continue
        if "DE AUBIÈRE" in line or "DE AUBIERE" in line or "DE ROMAGNAT" in line:
            current_direction = 1 # Aubiere/Romagnat -> Gerzat
            last_hour = 0
            continue
            
        # Time Parsing
        # Check for notes (v, b, p, etc.)
        note = None
        match = re.match(r'^([a-z])\s', line)
        if match:
            note = match.group(1)
            
        # Regex for HH.MM or HH:MM
        times = re.findall(r'\d{2}[\.:]\d{2}', line)
        if len(times) > 0 and current_section:
            start_time_str = times[0].replace('.', ':')
            h = int(start_time_str.split(':')[0])
            
            # Heuristic for direction switch (reset from evening to morning)
            if current_direction == 0 and h < last_hour - 5 and last_hour > 12:
                 # Likely switched to return trips without explicit header
                 current_direction = 1
                 last_hour = h
            else:
                 if h > last_hour: 
                     last_hour = h
            
            # Headsign logic
            headsign = "AUBIÈRE Pl. des Ramacles" if current_direction == 0 else "GERZAT Champfleuri"
            if note == 'b' or note == 'p':
                headsign = "Ballainvilliers"
            elif note == 'v':
                headsign = "Les Vignes"
            
            trip = {'time': start_time_str, 'headsign': headsign, 'direction': current_direction}
            
            if current_section == 'MF':
                trips_mf.append(trip)
            elif current_section == 'SAT':
                trips_sat.append(trip)
            elif current_section == 'SUN':
                trips_sun.append(trip)
                
    return {'MF': trips_mf, 'SAT': trips_sat, 'SUN': trips_sun}

def load_static_schedule(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File '{filepath}' not found.")
        sys.exit(1)

def compare_schedules(official_trips, static_data, date_str):
    """
    Compares parsed official trips against static JSON for a specific date.
    """
    print(f"\n📅 Verification for {date_str} ({get_day_type(date_str)})")
    
    # Filter static data for this date
    static_trips_today = [t for t in static_data if t['date'] == date_str]
    
    # Get relevant official trips
    day_type = get_day_type(date_str)
    targets = official_trips.get(day_type, [])
    
    if not targets:
        print("⚠️ No official schedule found for this day type in the text file.")
        return

    missing_count = 0
    ok_count = 0
    
    # Check Direction 0 and 1 separately
    for direction in [0, 1]:
        dir_name = "Gerzat -> Aubiere" if direction == 0 else "Aubiere -> Gerzat"
        print(f"  ➡️ Direction {direction} ({dir_name}):")
        
        dir_targets = [t for t in targets if t['direction'] == direction]
        dir_static = [t for t in static_trips_today if t['direction'] == direction]
        
        # Create a set of static departure timestamps for quick lookup
        # Allow +/- 60s tolerance
        static_times = []
        for t in dir_static:
            ts = t['departure']
            # Convert to HH:MM for easier debug matching
            # Assuming Paris time (UTC+1 winter)
            dt = datetime.fromtimestamp(ts, timezone.utc) + timedelta(hours=1)
            static_times.append(dt.strftime('%H:%M'))
            
        for target in dir_targets:
            if target['time'] in static_times:
                ok_count += 1
                # Remove to handle duplicates? Simple verification doesn't strict require it.
            else:
                # Fuzzy check +/- 1 min?
                # For now strict string match as we generated them strictly
                print(f"    ❌ MISSING: {target['time']} ({target['headsign']})")
                missing_count += 1
    
    if missing_count == 0:
        print(f"  ✅ All {ok_count} trips verified successfully.")
    else:
        print(f"  ⚠️ Found {missing_count} missing trips! ({ok_count} OK)")

def main():
    parser = argparse.ArgumentParser(description="Verify Bus Schedules")
    parser.add_argument('schedule_file', help="Path to text file with official schedule")
    parser.add_argument('--days', type=int, default=3, help="Number of days to verify starting from today")
    args = parser.parse_args()
    
    print(f"🔍 Loading official schedule from {args.schedule_file}...")
    official_data = parse_schedule_text(args.schedule_file)
    print(f"   Found {len(official_data['MF'])} Mon-Fri trips, {len(official_data['SAT'])} Sat trips, {len(official_data['SUN'])} Sun trips.")
    
    print(f"🔍 Loading static schedule from {STATIC_SCHEDULE_PATH}...")
    static_data = load_static_schedule(STATIC_SCHEDULE_PATH)
    
    # Verify next few days
    today = datetime.now()
    for i in range(args.days):
        check_date = (today + timedelta(days=i)).strftime('%Y%m%d')
        compare_schedules(official_data, static_data, check_date)

if __name__ == "__main__":
    main()
