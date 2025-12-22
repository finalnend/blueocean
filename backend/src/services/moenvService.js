/**
 * Taiwan MOENV (環境部) Service
 * 台灣環境部開放資料 API
 * API: https://data.moenv.gov.tw/
 */
import axios from 'axios';
import getDatabase from '../database/db.js';

const MOENV_BASE_URL = 'https://data.moenv.gov.tw/api/v2';

// 水質相關資料集 ID（需根據實際 MOENV 資料集調整）
const WATER_QUALITY_DATASETS = {
  // 河川水質監測
  river_water: 'wqx_p_02',
  // 海域水質監測
  ocean_water: 'wqx_p_10',
  // 近岸海域水質
  coastal_water: 'wqx_p_11'
};

const CACHE_KEY = 'moenv_sync_meta';
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
 * 從 MOENV API 取得資料
 * @param {string} dataId - 資料集 ID
 * @param {object} options - 查詢選項
 */
export async function fetchMOENVData(dataId, options = {}) {
  const apiKey = process.env.MOENV_API_KEY;
  
  if (!apiKey) {
    console.warn('[MOENV] 未設定 MOENV_API_KEY，跳過資料抓取');
    return [];
  }

  const params = {
    api_key: apiKey,
    offset: options.offset || 0,
    limit: options.limit || 1000,
    format: 'json'
  };

  // 加入年月篩選（如果有）
  if (options.yearMonth) {
    params.year_month = options.yearMonth;
  }

  try {
    console.log(`[MOENV] Fetching ${dataId}...`);
    const response = await axios.get(`${MOENV_BASE_URL}/${dataId}`, {
      params,
      timeout: 30000
    });

    return response.data?.records || [];
  } catch (error) {
    if (error.response?.status === 429) {
      console.error('[MOENV] API 限流，請稍後再試');
    } else {
      console.error(`[MOENV] Fetch failed: ${error.message}`);
    }
    return [];
  }
}

/**
 * 分頁抓取所有資料
 */
async function fetchAllPages(dataId, options = {}) {
  const allRecords = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const records = await fetchMOENVData(dataId, { ...options, offset, limit });
    
    if (records.length === 0) {
      hasMore = false;
    } else {
      allRecords.push(...records);
      offset += limit;
      
      // 避免超過 API 限制
      if (allRecords.length >= 5000) {
        console.log(`[MOENV] 達到 5000 筆上限，停止抓取`);
        hasMore = false;
      }
      
      // 延遲避免限流
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return allRecords;
}

/**
 * 台灣測站座標對照表（常見測站）
 */
const TAIWAN_STATIONS = {
  // 河川測站（示例）
  '基隆河-南港': { lat: 25.0478, lng: 121.6069 },
  '淡水河-關渡': { lat: 25.1167, lng: 121.4667 },
  '高屏溪-里港': { lat: 22.7833, lng: 120.4833 },
  // 海域測站（示例）
  '台北港': { lat: 25.1500, lng: 121.3667 },
  '基隆港': { lat: 25.1333, lng: 121.7500 },
  '高雄港': { lat: 22.6167, lng: 120.2667 },
  '花蓮港': { lat: 23.9833, lng: 121.6167 }
};

/**
 * 嘗試從測站名稱取得座標
 */
function getStationCoords(stationName) {
  // 預設台灣中心點
  const defaultCoord = { lat: 23.5, lng: 121.0 };
  
  // null guard - 確保 stationName 是字串
  if (typeof stationName !== 'string') {
    return defaultCoord;
  }
  
  // 直接匹配
  if (TAIWAN_STATIONS[stationName]) {
    return TAIWAN_STATIONS[stationName];
  }
  
  // 部分匹配
  for (const [name, coords] of Object.entries(TAIWAN_STATIONS)) {
    if (stationName.includes(name) || name.includes(stationName)) {
      return coords;
    }
  }
  
  return defaultCoord;
}

/**
 * 將 MOENV 資料匯入 pollution_data
 */
export async function importMOENVToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[MOENV] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  const apiKey = process.env.MOENV_API_KEY;
  if (!apiKey) {
    console.log('[MOENV] 未設定 MOENV_API_KEY，跳過匯入');
    return 0;
  }

  console.log('[MOENV] 開始匯入台灣環境部水質資料...');

  // 刪除舊資料
  db.prepare(`
    DELETE FROM pollution_data 
    WHERE source = 'MOENV (TW)' AND type = 'water_quality'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const today = new Date().toISOString().slice(0, 10);

  // 嘗試抓取各類水質資料
  for (const [datasetName, dataId] of Object.entries(WATER_QUALITY_DATASETS)) {
    try {
      console.log(`[MOENV] 查詢 ${datasetName} (${dataId})...`);
      const records = await fetchAllPages(dataId);

      if (!records.length) {
        console.log(`[MOENV] ${datasetName}: 無資料`);
        continue;
      }

      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          // 嘗試取得座標（MOENV 資料可能有不同欄位名稱）
          let lat = parseFloat(row.latitude || row.lat || row.TWD97_LAT);
          let lng = parseFloat(row.longitude || row.lng || row.TWD97_LON);
          
          // 如果沒有座標，嘗試從測站名稱查找
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            const stationName = row.sitename || row.station || row.SiteName;
            const coords = getStationCoords(stationName);
            lat = coords.lat;
            lng = coords.lng;
          }

          // 取得測值（嘗試多種可能的欄位名稱）
          const value = parseFloat(
            row.value || row.itemvalue || row.concentration || 
            row.ph || row.do || row.bod || 1
          );

          // 取得單位
          const unit = row.unit || row.itemunit || 'unknown';

          // 取得日期
          const recordedAt = row.monitordate || row.sampledate || 
                            row.publishtime || today;

          insertStmt.run(
            'MOENV (TW)',
            'water_quality',
            lat,
            lng,
            Number.isFinite(value) ? value : 1,
            unit,
            typeof recordedAt === 'string' ? recordedAt.slice(0, 10) : today,
            JSON.stringify({
              dataset: datasetName,
              dataId: dataId,
              stationId: row.siteid || row.station_id,
              stationName: row.sitename || row.station || row.SiteName,
              parameter: row.itemname || row.parameter || row.item,
              method: row.method || row.itemengname,
              county: row.county,
              township: row.township,
              queryUrl: `${MOENV_BASE_URL}/${dataId}`
            })
          );
          totalInserted++;
        }
      });

      insertMany(records);
      console.log(`[MOENV] ${datasetName}: 匯入 ${records.length} 筆`);

    } catch (error) {
      console.error(`[MOENV] ${datasetName} 處理失敗:`, error.message);
    }
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[MOENV] 匯入完成，共 ${totalInserted} 筆`);
  return totalInserted;
}

/**
 * API 端點：查詢 MOENV 水質資料
 */
export async function queryMOENVWater(options = {}) {
  const { dataId, yearMonth, limit = 100 } = options;
  
  if (!dataId) {
    return { error: '缺少 dataId 參數' };
  }

  const records = await fetchMOENVData(dataId, { yearMonth, limit });
  
  return {
    source: 'MOENV (TW)',
    dataId,
    count: records.length,
    records: records.slice(0, limit)
  };
}

export default {
  fetchMOENVData,
  importMOENVToDatabase,
  queryMOENVWater
};
