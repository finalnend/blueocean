/**
 * Water Quality Portal (WQP) Service
 * 近岸/河口水質資料（營養鹽、溶氧、重金屬等）
 * API: https://www.waterqualitydata.us/
 * 
 * 根據 WQP FAQ：
 * - 日期格式必須是 MM-DD-YYYY
 * - 大查詢容易 timeout，建議用日期範圍縮小
 * - 逐月抓取比一次抓一年穩定
 */
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import getDatabase from '../database/db.js';

const WQP_BASE_URL = 'https://www.waterqualitydata.us/data';

// 沿海州份（使用 statecode 格式）
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

function getSyncMeta() {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT cache_data FROM data_cache
    WHERE cache_key = ? AND expires_at > datetime('now')
  `).get(CACHE_KEY);
  return row?.cache_data ? JSON.parse(row.cache_data) : null;
}

function saveSyncMeta(meta) {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO data_cache (cache_key, cache_data, expires_at)
    VALUES (?, ?, datetime('now', '+168 hours'))
  `).run(CACHE_KEY, JSON.stringify(meta));
}

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
  if (!csvText || csvText.trim().length === 0) return [];

  try {
    return parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true
    });
  } catch (error) {
    console.error(`[WQP] CSV parse error: ${error.message}`);
    return [];
  }
}

/**
 * 從 WQP 取得水質資料
 * 根據 FAQ 建議：先只用 statecode + 日期，不加 characteristicType 避免觸發慢查詢
 */
export async function fetchWQPResults({ stateCode, startDate, endDate }) {
  const params = {
    mimeType: 'csv',
    zip: 'no',
    sorted: 'no',
    statecode: stateCode,
    startDateLo: formatWqpDate(startDate),
    startDateHi: formatWqpDate(endDate),
    sampleMedia: 'Water',
    dataProfile: 'narrowResult',
    // 只取 EPA WQX 資料，避免碰到 NWIS(USGS) 的 legacy 限制
    providers: 'STORET'
  };

  // 印出完整 URL 方便 debug
  const fullUrl = `${WQP_BASE_URL}/Result/search?${new URLSearchParams(params).toString()}`;
  console.log(`[WQP] Request URL: ${fullUrl}`);

  try {
    const response = await axios.get(`${WQP_BASE_URL}/Result/search`, {
      params,
      timeout: 90000,
      responseType: 'text'
    });

    return parseWQPCSV(response.data);
  } catch (error) {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const configUrl = error.config?.url;
    const configParams = JSON.stringify(error.config?.params || {});
    
    console.error(`[WQP] Fetch failed: ${error.message}`);
    console.error(`[WQP] Status: ${status || 'N/A'}`);
    console.error(`[WQP] Config URL: ${configUrl}`);
    console.error(`[WQP] Config Params: ${configParams}`);
    if (responseData && typeof responseData === 'string') {
      console.error(`[WQP] Response (first 500 chars): ${responseData.slice(0, 500)}`);
    }
    return [];
  }
}

/**
 * 產生過去 N 個月的月份區間
 */
function getMonthRanges(months = 3) {
  const ranges = [];
  const now = new Date();
  
  for (let i = 0; i < months; i++) {
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // 月底
    const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);   // 月初
    ranges.push({
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
      label: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
    });
  }
  
  return ranges;
}

/**
 * 將 WQP 資料匯入 pollution_data
 * 改成逐月抓取，避免大查詢 timeout
 */
export async function importWQPToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[WQP] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  console.log('[WQP] 開始匯入水質資料（逐月抓取模式）...');

  // 刪除舊資料
  db.prepare(`DELETE FROM pollution_data WHERE source = 'WQP' AND type = 'water_quality'`).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  
  // 只抓最近 1 個月（先跑通，之後可以改成 3 個月）
  const monthRanges = getMonthRanges(1);

  for (const state of COASTAL_STATES) {
    let stateInserted = 0;
    
    for (const range of monthRanges) {
      try {
        console.log(`[WQP] ${state.name} - ${range.label}...`);
        
        const results = await fetchWQPResults({
          stateCode: state.code,
          startDate: range.start,
          endDate: range.end
        });

        if (!results.length) {
          console.log(`[WQP] ${state.name} ${range.label}: 0 筆`);
          continue;
        }

        console.log(`[WQP] ${state.name} ${range.label}: 抓取 ${results.length} 筆`);

        // 每州每月最多 200 筆
        const limitedResults = results.slice(0, 200);
        let monthInserted = 0;

        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            const lat = parseFloat(row.LatitudeMeasure || row['ActivityLocation/LatitudeMeasure']);
            const lng = parseFloat(row.LongitudeMeasure || row['ActivityLocation/LongitudeMeasure']);
            const value = parseFloat(row.ResultMeasureValue || row['ResultMeasure/MeasureValue']);

            if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(value)) {
              continue;
            }

            const recordedAt = row.ActivityStartDate || range.end;
            const unit = row['ResultMeasure/MeasureUnitCode'] || row.ResultMeasure_MeasureUnitCode || 'unknown';

            insertStmt.run(
              'WQP',
              'water_quality',
              lat, lng, value, unit, recordedAt,
              JSON.stringify({
                region: state.name,
                characteristicName: row.CharacteristicName,
                organization: row.OrganizationIdentifier,
                siteId: row.MonitoringLocationIdentifier,
                month: range.label
              })
            );
            monthInserted++;
            stateInserted++;
            totalInserted++;
          }
        });

        insertMany(limitedResults);
        console.log(`[WQP] ${state.name} ${range.label}: 寫入 ${monthInserted} 筆`);

        // 避免 rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[WQP] ${state.name} ${range.label} 失敗:`, error.message);
      }
    }
    
    console.log(`[WQP] ${state.name} 總計: ${stateInserted} 筆`);
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[WQP] 匯入完成，共 ${totalInserted} 筆`);
  return totalInserted;
}

export default { fetchWQPResults, importWQPToDatabase };
