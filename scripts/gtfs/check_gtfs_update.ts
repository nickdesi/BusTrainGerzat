import fs from 'fs';
import path from 'path';
import https from 'https';
import { parse } from 'csv-parse/sync';
import AdmZip from 'adm-zip';

const GTFS_URLS = [
  "https://opendata.clermontmetropole.eu/api/v2/catalog/datasets/gtfs-smtc/alternative_exports/gtfs",
  "https://opendata.clermontmetropole.eu/api/v2/catalog/datasets/gtfs-smtc/attachments/gtfs_t2c_plus_scolaire_zip",
];

const TARGET_DIR = 'gtfs_data_new';
const FINAL_DIR = 'gtfs_data';

async function headRequest(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    https.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 301);
    }).on('error', () => resolve(false)).end();
  });
}

async function getGtfsUrl(): Promise<string | null> {
  for (const url of GTFS_URLS) {
    console.log(`🔍 Trying ${url}...`);
    const isOk = await headRequest(url);
    if (isOk) {
      console.log(`✅ Found working URL: ${url}`);
      return url;
    }
  }
  return null;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

function readCsv(filePath: string): any[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  // strip BOM if present
  const content = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function downloadAndCheck(): Promise<boolean> {
  const url = await getGtfsUrl();
  if (!url) return false;

  console.log(`⬇️ Downloading GTFS from ${url}...`);
  const zipDest = 'gtfs.zip';
  try {
    await downloadFile(url, zipDest);
  } catch (e) {
    console.error(`❌ Download failed: ${e}`);
    return false;
  }

  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const zip = new AdmZip(zipDest);
  zip.extractAllTo(TARGET_DIR, true);
  fs.unlinkSync(zipDest);

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
    if (row.stop_name.includes("GERZAT Champfleuri")) {
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
      if (row.end_date > maxDate) {
        maxDate = row.end_date;
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
      console.log("⚠️ Sentinel check failed/skipped, but applying update as requested by user.");
      applyUpdate();
      process.exit(0);
    }
    process.exit(1);
  }
}

main();
