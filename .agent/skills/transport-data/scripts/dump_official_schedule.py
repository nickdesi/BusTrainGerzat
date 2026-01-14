
import json
from datetime import datetime
from collections import defaultdict

# Helper to format time
def format_time(ts):
    return datetime.fromtimestamp(ts).strftime('%H:%M')

def main():
    with open('src/data/static_schedule.json', 'r') as f:
        data = json.load(f)

    # Group by date and direction
    schedule = defaultdict(lambda: defaultdict(list))
    
    # Process only next 3 unique days
    unique_days = sorted(list(set(entry['departure'] // 86400 for entry in data)))[:3]
    
    for entry in data:
        day_key = entry['departure'] // 86400
        if day_key not in unique_days:
            continue
            
        direction = "Gerzat -> Aubiere" if entry['direction'] == 0 else "Aubiere -> Gerzat"
        # Determine if it's likely an express or special stop based on headsign or logic
        # Ideally we'd have the stop name in JSON but we don't. 
        # We can infer PATURAL if the time matches the known express times OR if we add stopName to JSON.
        # For now, let's just list the headsign.
        line_info = entry
        schedule[day_key][direction].append(entry)

    # Output
    print(f"# HORAIRES OFFICIELS LINE E1 (Générés le {datetime.now().strftime('%d/%m/%Y %H:%M')})")
    print(" (Basé sur les données GTFS Open Data officielles re-téléchargées)\n")
    
    for day in unique_days:
        date_str = datetime.fromtimestamp(day * 86400).strftime('%A %d %B %Y')
        print(f"## {date_str}\n")
        
        for direction in ["Gerzat -> Aubiere", "Aubiere -> Gerzat"]:
            entries = sorted(schedule[day][direction], key=lambda x: x['departure'])
            print(f"### {direction}")
            if not entries:
                print("(Aucun départ)")
            else:
                for i, entry in enumerate(entries):
                    time_str = format_time(entry['departure'])
                    headsign = entry.get('headsign', '')
                    print(f"- {time_str}  (Dest: {headsign})")
            print("\n")
            
        print("-" * 40 + "\n")

if __name__ == "__main__":
    main()
