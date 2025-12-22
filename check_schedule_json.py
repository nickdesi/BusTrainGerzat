import json
from datetime import datetime

# Load static schedule
with open('src/data/static_schedule.json', 'r') as f:
    schedule = json.load(f)

# Filter for today (assuming format YYYYMMDD)
today = datetime.now().strftime('%Y%m%d')
print(f"Checking schedule for date: {today}")

count = 0
for trip in schedule:
    if trip['date'] == today:
        # Convert timestamp to readable time
        dt = datetime.fromtimestamp(trip['departure'])
        time_str = dt.strftime('%H:%M:%S')
        
        # Print a sample around the user's reported time (11:00 - 13:00)
        if 11 <= dt.hour <= 13:
            print(f"Trip {trip['tripId']} | Stop {trip.get('stopId', 'N/A')} | {time_str} | {trip['headsign']}")
            count += 1
            if time_str.startswith("12:10"):
                print("!!! FOUND A 12:10 MATCH !!!")

print(f"Found {count} trips between 11:00 and 13:00 for today.")
