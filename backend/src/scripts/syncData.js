import cron from 'node-cron';
import { pathToFileURL } from 'url';
import { importOWIDDataToDatabase } from '../services/owidDataParser.js';
import { importExternalDataToDatabase, scheduleCleanup } from '../services/externalDataService.js';
import { syncNoaaMicroplastics } from './importMicroplasticsFromNoaa.js';

export function scheduleDailyDataSync() {
  console.log('Scheduling daily data sync at 02:00 UTC...');

  cron.schedule('0 2 * * *', async () => {
    console.log(`\n[SYNC] Starting daily sync ${new Date().toISOString()}`);

    try {
      const owidCount = await importOWIDDataToDatabase();
      console.log(`[SYNC] OWID rows refreshed: ${owidCount}`);

      await importExternalDataToDatabase();
      console.log('[SYNC] External data refresh complete');

      // NOAA 全球微塑膠資料每日同步一次
      await syncNoaaMicroplastics('global');
      console.log('[SYNC] NOAA microplastics (global) refreshed\n');
    } catch (error) {
      console.error('[SYNC] Daily sync failed:', error);
    }
  });
}

export function scheduleWeeklyCacheCleanup() {
  console.log('Scheduling weekly cache cleanup (Sunday 03:00 UTC)...');

  cron.schedule('0 3 * * 0', () => {
    console.log('[SYNC] Cleaning cache entries...');
    scheduleCleanup();
    console.log('[SYNC] Cache cleanup finished');
  });
}

export async function manualSync(options = {}) {
  const force = options.force || process.argv.includes('--force') || process.argv.includes('-f');
  
  if (force) {
    console.log('\n[SYNC] Running FORCED manual sync (ignoring cache)...');
  } else {
    console.log('\n[SYNC] Running manual sync...');
  }

  try {
    const owidCount = await importOWIDDataToDatabase();
    console.log(`[SYNC] OWID rows refreshed: ${owidCount}`);

    await importExternalDataToDatabase({ force });

    await syncNoaaMicroplastics('global', { force });
    console.log('[SYNC] NOAA microplastics (global) refreshed');

    console.log('[SYNC] Manual sync complete\n');
    return true;
  } catch (error) {
    console.error('[SYNC] Manual sync failed:', error);
    return false;
  }
}

export function startAllSchedules() {
  console.log('\n[SYNC] Starting scheduled jobs...\n');
  scheduleDailyDataSync();
  scheduleWeeklyCacheCleanup();
  console.log('[SYNC] Schedules configured. Use "npm run sync" to trigger manually.\n');
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  manualSync()
    .then(() => {
      console.log('[SYNC] Done.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[SYNC] Error:', error);
      process.exit(1);
    });
}

export default {
  scheduleDailyDataSync,
  scheduleWeeklyCacheCleanup,
  manualSync,
  startAllSchedules
};
