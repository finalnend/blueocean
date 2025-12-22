/**
 * Water Quality Portal (WQP) Service
 * 近岸/河口水質資料（營養鹽、溶氧、重金屬等）
 * API: https://www.waterqualitydata.us/
 */
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import getDatabase from '../database/db.js';

const WQP_BASE_URL = 'https://www.waterqualitydata.us/data';

// 使用 statecode（更可靠）
const COASTAL_STATES = [
  { code: 'US:06', name: 'California' },
  { code: 'US:12', name: 'Florida' },
  { code: 'US:36', name: 'New York' },
  { code: 'US:48', name: 'Texas' },
  { code: 'US:25', name: 'Massachusetts' }
];

/**
 * 將日期轉換為 WQP 格式 (MM-DD-YYYY)
 */
function formatWqpDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
}

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
 * 解析 WQP CSV 回應（使用正式 CSV parser）
 */
function parseWQPCSV(csvText) {
  if (!csvText || csvText.trim().length === 0) {
    return [];
  }

  try {
    const records = parse(csvText, {
      columns: true,           // 第一行當作 header
      skip_empty_lines: true,
      relax_quotes: true,      // 容許不完整引號
      relax_column_count: true // 容許欄位數不一致
    });
    return records;
  } catch (error) {
    console.error(`[WQP] CSV parse error: ${error.message}`);
    return [];
  }
}

/**
 * 從 WQP 取得水質資料（使用 statecode，改為 30 天範圍避免 timeout）
 */
export async function fetchWQPResults({ stateCode, startDate, endDate, characteristicType }) {
  const params = {
    mimeType: 'csv',
    zip: 'no',
    sorted: 'no',
    statecode: stateCode,
    startDateLo: formatWqpDate(startDate),
    startDateHi: formatWqpDate(endDate),
    characteristicType: characteristicType || 'Nutrient',
    sampleMedia: 'Water',
    dataProfile: 'narrowResult'
  };

  try {
    console.log(`[WQP] Fetching ${stateCode} from ${formatWqpDate(startDate)} to ${formatWqpDate(endDate)}...`);
    const response = await axios.get(`${WQP_BASE_URL}/Result/search`, {
      params,
      timeout: 60000,  // 降低 timeout 避免長時間等待
      responseType: 'text'
    });

    return parseWQPCSV(response.data);
  } catch (error) {
    // 印出詳細錯誤資訊
    const status = error.response?.status;
    const responseData = error.response?.data;
    console.error(`[WQP] Fetch failed: ${error.message}`);
    if (status) {
      console.error(`[WQP] Status: ${status}`);
    }
    if (responseData && typeof responseData === 'string') {
      console.error(`[WQP] Response (first 300 chars): ${responseData.slice(0, 300)}`);
    }
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

  // 改為查詢過去 2 天（避免大州 timeout/500）
  const endDate = new Date();
  const startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

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

  // 逐州抓取
  for (const state of COASTAL_STATES) {
    let stateInserted = 0;
    
    try {
      const results = await fetchWQPResults({
        stateCode: state.code,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        characteristicType: 'Nutrient'
      });

      if (!results.length) {
        console.log(`[WQP] ${state.name}: 抓取 0 筆`);
        continue;
      }

      console.log(`[WQP] ${state.name}: 抓取 ${results.length} 筆，開始解析...`);

      // 限制每州最多 500 筆
      const limitedResults = results.slice(0, 500);

      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          // 嘗試多種可能的欄位名稱
          const lat = parseFloat(
            row.LatitudeMeasure || 
            row['ActivityLocation/LatitudeMeasure'] ||
            row.ActivityLocation_LatitudeMeasure
          );
          const lng = parseFloat(
            row.LongitudeMeasure || 
            row['ActivityLocation/LongitudeMeasure'] ||
            row.ActivityLocation_LongitudeMeasure
          );
          const value = parseFloat(
            row.ResultMeasureValue ||
            row['ResultMeasure/MeasureValue']
          );

          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(value)) {
            continue;
          }

          const recordedAt = row.ActivityStartDate || endDate.toISOString().slice(0, 10);
          const unit = row['ResultMeasure/MeasureUnitCode'] || 
                      row.ResultMeasure_MeasureUnitCode || 
                      row.MeasureUnitCode || 
                      'unknown';

          insertStmt.run(
            'WQP',
            'water_quality',
            lat,
            lng,
            value,
            unit,
            recordedAt,
            JSON.stringify({
              region: state.name,
              regionName: state.name,
              characteristicName: row.CharacteristicName,
              sampleMedia: row.ActivityMediaName || 'Water',
              organization: row.OrganizationIdentifier,
              siteId: row.MonitoringLocationIdentifier,
              detectionLimit: row['DetectionQuantitationLimitMeasure/MeasureValue'],
              queryUrl: `${WQP_BASE_URL}/Result/search?statecode=${state.code}`
            })
          );
          stateInserted++;
          totalInserted++;
        }
      });

      insertMany(limitedResults);
      console.log(`[WQP] ${state.name}: 成功寫入 ${stateInserted} 筆`);

      // 避免 API rate limit
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error(`[WQP] ${state.name} 匯入失敗:`, error.message);
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
