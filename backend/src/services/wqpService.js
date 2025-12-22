/**
 * Water Quality Portal (WQP) Service
 * 近岸/河口水質資料（營養鹽、溶氧、重金屬等）
 * API: https://www.waterqualitydata.us/
 */
import axios from 'axios';
import getDatabase from '../database/db.js';

const WQP_BASE_URL = 'https://www.waterqualitydata.us/data';

// 預設查詢的水質參數（可擴充）
const DEFAULT_CHARACTERISTICS = [
  'Nitrogen',
  'Phosphorus',
  'Dissolved oxygen (DO)',
  'Mercury',
  'Lead',
  'pH'
];

// 預設近岸區域 bbox（可依需求調整）
const COASTAL_REGIONS = {
  us_east_coast: { bBox: '-82,24,-65,45', name: 'US East Coast' },
  us_west_coast: { bBox: '-130,32,-117,49', name: 'US West Coast' },
  gulf_of_mexico: { bBox: '-98,18,-80,31', name: 'Gulf of Mexico' }
};

const CACHE_KEY = 'wqp_sync_meta';
const STALE_WINDOW_HOURS = 24;

/**
 * 取得同步 metadata
 */
function getSyncMeta() {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT cache_data FROM data_cache
    WHERE cache_key = ? AND expires_at > datetime('now')
  `).get(CACHE_KEY);

  return row?.cache_data ? JSON.parse(row.cache_data) : null;
}

/**
 * 儲存同步 metadata
 */
function saveSyncMeta(meta) {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO data_cache (cache_key, cache_data, expires_at)
    VALUES (?, ?, datetime('now', '+168 hours'))
  `).run(CACHE_KEY, JSON.stringify(meta));
}

/**
 * 檢查是否在 stale window 內
 */
function isRecentlyChecked(meta) {
  if (!meta?.lastSyncedAt) return false;
  const lastSync = new Date(meta.lastSyncedAt).getTime();
  const msSince = Date.now() - lastSync;
  return msSince < STALE_WINDOW_HOURS * 60 * 60 * 1000;
}

/**
 * 解析 WQP CSV 回應
 */
function parseWQPCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || null;
    });
    records.push(row);
  }

  return records;
}

/**
 * 從 WQP 取得水質資料
 */
export async function fetchWQPResults({ bBox, startDate, endDate, characteristicName }) {
  const params = {
    mimeType: 'csv',
    zip: 'no',
    sorted: 'no',
    bBox: bBox,
    startDateLo: startDate,
    startDateHi: endDate,
    characteristicName: characteristicName || DEFAULT_CHARACTERISTICS.join(';'),
    sampleMedia: 'Water',
    dataProfile: 'narrowResult'
  };

  try {
    console.log(`[WQP] Fetching results for bbox: ${bBox}...`);
    const response = await axios.get(`${WQP_BASE_URL}/Result/search`, {
      params,
      timeout: 120000, // WQP 可能較慢
      responseType: 'text'
    });

    return parseWQPCSV(response.data);
  } catch (error) {
    console.error(`[WQP] Fetch failed: ${error.message}`);
    return [];
  }
}

/**
 * 將 WQP 資料匯入 pollution_data
 */
export async function importWQPToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[WQP] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  console.log('[WQP] 開始匯入水質資料...');

  // 計算查詢日期範圍（過去一年）
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let totalInserted = 0;

  // 刪除舊資料
  db.prepare(`
    DELETE FROM pollution_data 
    WHERE source = 'WQP' AND type = 'water_quality'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 逐區域抓取
  for (const [regionKey, region] of Object.entries(COASTAL_REGIONS)) {
    try {
      const results = await fetchWQPResults({
        bBox: region.bBox,
        startDate,
        endDate
      });

      if (!results.length) {
        console.log(`[WQP] ${regionKey}: 無資料`);
        continue;
      }

      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          const lat = parseFloat(row.LatitudeMeasure || row.ActivityLocation_LatitudeMeasure);
          const lng = parseFloat(row.LongitudeMeasure || row.ActivityLocation_LongitudeMeasure);
          const value = parseFloat(row.ResultMeasureValue);

          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(value)) {
            continue;
          }

          const recordedAt = row.ActivityStartDate || endDate;
          const unit = row.ResultMeasure_MeasureUnitCode || row['MeasureUnitCode'] || 'unknown';

          insertStmt.run(
            'WQP',
            'water_quality',
            lat,
            lng,
            value,
            unit,
            recordedAt,
            JSON.stringify({
              region: regionKey,
              regionName: region.name,
              characteristicName: row.CharacteristicName,
              sampleMedia: row.ActivityMediaName || 'Water',
              organization: row.OrganizationIdentifier,
              siteId: row.MonitoringLocationIdentifier,
              detectionLimit: row.DetectionQuantitationLimitMeasure_MeasureValue,
              queryUrl: `${WQP_BASE_URL}/Result/search?bBox=${region.bBox}`
            })
          );
          totalInserted++;
        }
      });

      insertMany(results);
      console.log(`[WQP] ${regionKey}: 匯入 ${results.length} 筆`);

    } catch (error) {
      console.error(`[WQP] ${regionKey} 匯入失敗:`, error.message);
    }
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[WQP] 匯入完成，共 ${totalInserted} 筆`);
  return totalInserted;
}

export default {
  fetchWQPResults,
  importWQPToDatabase
};
