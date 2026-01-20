import requests
import zipfile
import io
import os
import csv
import shutil
import sys

# Configuration
# List of GTFS URLs to try (in order of preference)
GTFS_URLS = [
    "https://opendata.clermontmetropole.eu/api/v2/catalog/datasets/gtfs-smtc/alternative_exports/gtfs",
    "https://opendata.clermontmetropole.eu/api/v2/catalog/datasets/gtfs-smtc/attachments/gtfs_t2c_plus_scolaire_zip",
]
TARGET_DIR = "gtfs_data_new" # Temp dir
FINAL_DIR = "gtfs_data"

def get_gtfs_url():
    """Try each URL and return the first one that works."""
    for url in GTFS_URLS:
        print(f"🔍 Trying {url}...")
        try:
            r = requests.head(url, allow_redirects=True, timeout=10)
            if r.status_code == 200:
                print(f"✅ Found working URL: {url}")
                return url
        except Exception as e:
            print(f"⚠️ Failed: {e}")
    return None

def download_and_check():
    gtfs_url = get_gtfs_url()
    if not gtfs_url:
        return False
        
    print(f"⬇️ Downloading GTFS from {gtfs_url}...")
    try:
        r = requests.get(gtfs_url)
        r.raise_for_status()
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return False

    # Unzip to temp
    if os.path.exists(TARGET_DIR):
        shutil.rmtree(TARGET_DIR)
    os.makedirs(TARGET_DIR)

    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        z.extractall(TARGET_DIR)
        
    print("📂 Inspecting GTFS data...")
    
    # 1. Find Route ID for "E1"
    route_id = None
    with open(f"{TARGET_DIR}/routes.txt", 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['route_short_name'] == 'E1' or row['route_short_name'] == '20':
                route_id = row['route_id']
                break
    
    if not route_id:
        print("❌ Could not find Route E1/20 in new GTFS.")
        return False

    # 2. Find Stop ID for "GERZAT Champfleuri"
    stop_id = None
    with open(f"{TARGET_DIR}/stops.txt", 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if "GERZAT Champfleuri" in row['stop_name']:
                stop_id = row['stop_id']
                break
    
    if not stop_id:
        print("❌ Could not find Stop GERZAT Champfleuri in new GTFS.")
        return False

    # 3. Check Validity Dates (Replacing brittle 05:53 check)
    print("📅 Checking GTFS validity period...")
    max_date = "00000000"
    
    try:
        with open(f"{TARGET_DIR}/calendar.txt", 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['end_date'] > max_date:
                    max_date = row['end_date']
        
        print(f"📅 Remote GTFS data valid until: {max_date}")
        
        from datetime import datetime
        today_str = datetime.now().strftime("%Y%m%d")
        
        if max_date >= today_str:
             print("✅ New GTFS data is valid for the future. Proceeding.")
             return True
        else:
             print(f"⚠️ New GTFS data expired on {max_date} (Today: {today_str}). Skipping.")
             return False

    except Exception as e:
        print(f"❌ Error checking calendar dates: {e}")
        return False

def apply_obfuscation():
    # If valid, replace old gtfs directory
    print("🔄 Updating local GTFS data...")
    if os.path.exists(FINAL_DIR):
        shutil.rmtree(FINAL_DIR)
    shutil.move(TARGET_DIR, FINAL_DIR)
    print("✅ GTFS Data updated. Please regenerate static JSON.")

if __name__ == "__main__":
    # Force update logic for now as user requested official data only
    if download_and_check():
        apply_obfuscation()
        sys.exit(0) 
    else:
        # even if check fails (meaning it didn't find the specific sentinel time), we might still want to update 
        # BUT download_and_check returns False on download failure OR sentinel failure.
        # Let's modify download_and_check to return the path if download success, and check logic separate.
        # For this specific request, I will rely on the script's existing 'apply_obfuscation' if download works.
        # Actually simplest is to just call apply_obfuscation if TARGET_DIR exists and contains valid data.
        if os.path.exists(TARGET_DIR) and os.path.exists(f"{TARGET_DIR}/routes.txt"):
             print("⚠️ Sentinel check failed/skipped, but applying update as requested by user.")
             apply_obfuscation()
             sys.exit(0)
        sys.exit(1)
