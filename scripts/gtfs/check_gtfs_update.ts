import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import AdmZip from 'adm-zip';

const GTFS_URLS = [
  "https://opendata.clermontmetropole.eu/api/v2/catalog/datasets/gtfs-smtc/alternative_exports/gtfs",
];

const TARGET_DIR = 'gtfs_data_new';
const FINAL_DIR = 'gtfs_data';

async function fetchBinaryWithRetry(url: string, retries = 3, timeoutMs = 30000): Promise<ArrayBuffer> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'BusTrainGerzat-GTFS-Updater/3.8' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return await res.arrayBuffer();
    } catch (err) {
      lastError = err as Error;
      console.warn(`[check_gtfs_update] Attempt ${attempt}/${retries} failed: ${(err as Error).message}`);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError || new Error(`Failed to fetch ${url}`);
}

function readCsv(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  // strip BOM if present
  const content = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function downloadAndCheck(): Promise<boolean> {
  let buffer: ArrayBuffer | null = null;
  let successUrl: string | null = null;

  for (const url of GTFS_URLS) {
    try {
      console.log(`⬇️ Downloading GTFS from ${url}...`);
      buffer = await fetchBinaryWithRetry(url);
      successUrl = url;
      break;
    } catch (e) {
      console.error(`❌ Download failed for ${url}: ${(e as Error).message}`);
    }
  }

  if (!buffer || !successUrl) {
    return false;
  }

  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const zip = new AdmZip(Buffer.from(buffer));
  zip.extractAllTo(TARGET_DIR, true);

  console.log("📂 Inspecting GTFS data...");

  let routeId = null;
  const routes = readCsv(path.join(TARGET_DIR, 'routes.txt'));
  for (const row of routes) {
    if (row.route_short_name === 'E1' || row.route_short_name === '20') {
      routeId = row.route_id;
      break;
    }
  }

  if (!routeId) {
    console.log("❌ Could not find Route E1/20 in new GTFS.");
    return false;
  }

  let stopId = null;
  const stops = readCsv(path.join(TARGET_DIR, 'stops.txt'));
  for (const row of stops) {
    if (row.stop_name && row.stop_name.includes("GERZAT Champfleuri")) {
      stopId = row.stop_id;
      break;
    }
  }

  if (!stopId) {
    console.log("❌ Could not find Stop GERZAT Champfleuri in new GTFS.");
    return false;
  }

  console.log("📅 Checking GTFS validity period...");
  let maxDate = "00000000";
  try {
    const calendar = readCsv(path.join(TARGET_DIR, 'calendar.txt'));
    for (const row of calendar) {
      if (row.end_date && row.end_date > maxDate) {
        maxDate = row.end_date;
      }
    }
    const calendarDates = readCsv(path.join(TARGET_DIR, 'calendar_dates.txt'));
    for (const row of calendarDates) {
      if (row.date && row.date > maxDate) {
        maxDate = row.date;
      }
    }

    console.log(`📅 Remote GTFS data valid until: ${maxDate}`);

    const now = new Date();
    const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    if (maxDate >= todayStr) {
      console.log("✅ New GTFS data is valid for the future. Proceeding.");
      return true;
    } else {
      console.log(`⚠️ New GTFS data expired on ${maxDate} (Today: ${todayStr}). Skipping.`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Error checking calendar dates: ${e}`);
    return false;
  }
}

function applyUpdate() {
  console.log("🔄 Updating local GTFS data...");
  if (fs.existsSync(FINAL_DIR)) {
    fs.rmSync(FINAL_DIR, { recursive: true, force: true });
  }
  fs.renameSync(TARGET_DIR, FINAL_DIR);
  console.log("✅ GTFS Data updated. Please regenerate static JSON.");
}

async function main() {
  const success = await downloadAndCheck();
  if (success) {
    applyUpdate();
    process.exit(0);
  } else {
    if (fs.existsSync(TARGET_DIR) && fs.existsSync(path.join(TARGET_DIR, 'routes.txt'))) {
      console.log("⚠️ Sentinel check failed/skipped, but applying update as fallback.");
      applyUpdate();
      process.exit(0);
    }
    process.exit(1);
  }
}

void main();
