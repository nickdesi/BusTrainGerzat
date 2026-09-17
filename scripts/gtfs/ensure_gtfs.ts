import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SCHEDULE_FILE = path.join(process.cwd(), 'src', 'data', 'static_schedule.json');
const forceUpdate = process.env.FORCE_GTFS_UPDATE === 'true';

if (!forceUpdate && fs.existsSync(SCHEDULE_FILE)) {
  try {
    const stats = fs.statSync(SCHEDULE_FILE);
    if (stats.size > 1000) {
      console.log('✅ Static GTFS schedule already exists. Skipping prebuild download.');
      process.exit(0);
    }
  } catch {
    // If check fails, continue to update
  }
}

console.log('🔄 Static GTFS schedule missing or force requested. Running gtfs:update...');
execSync('npm run gtfs:update', { stdio: 'inherit' });
