/**
 * Korea Marine Water Quality Service
 * 韓國海洋水質監測資料
 * API: https://apis.data.go.kr/B553931/
 */
import axios from 'axios';
import getDatabase from '../database/db.js';

// 韓國公共資料 API 端點
const KOREA_API_BASE = 'https://apis.data.go.kr/B553931';

// 測站資訊 API
const STATIONS_API = `${KOREA_API_BASE}/OceansWemoReInfoService2/getOceansWemoReInfo2`;
// 觀測資料 API
const OBSERVATIONS_API = `${KOREA_API_BASE}/OceansWemoReObsService1/getOceansWemoReObs1`;

const CACHE_KEY = 'korea_marine_sync_meta';
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
 * 取得韓國海洋監測站列表
 */
export async function fetchKoreaStations() {
  const apiKey = process.env.KOREA_DATA_API_KEY;
  
  if (!apiKey) {
    console.warn('[Korea] 未設定 KOREA_DATA_API_KEY，跳過資料抓取');
    return [];
  }

  try {
    console.log('[Korea] Fetching marine stations...');
    const response = await axios.get(STATIONS_API, {
      params: {
        serviceKey: apiKey,
        numOfRows: 100,
        pageNo: 1,
        resultType: 'json'
      },
      timeout: 30000
    });

    const items = response.data?.response?.body?.items?.item;
    if (!items) {
      console.log('[Korea] No stations data in response');
      return [];
    }

    return Array.isArray(items) ? items : [items];
  } catch (error) {
    console.error(`[Korea] Stations fetch failed: ${error.message}`);
    return [];
  }
}

/**
 * 取得韓國海洋水質觀測資料
 */
export async function fetchKoreaObservations(stationId) {
  const apiKey = process.env.KOREA_DATA_API_KEY;
  
  if (!apiKey) {
    return [];
  }

  try {
    const response = await axios.get(OBSERVATIONS_API, {
      params: {
        serviceKey: apiKey,
        numOfRows: 100,
        pageNo: 1,
        resultType: 'json',
        stationId: stationId
      },
      timeout: 30000
    });

    const items = response.data?.response?.body?.items?.item;
    if (!items) {
      return [];
    }

    return Array.isArray(items) ? items : [items];
  } catch (error) {
    console.log(`[Korea] Observations fetch failed for ${stationId}: ${error.message}`);
    return [];
  }
}

/**
 * 將韓國海洋水質資料匯入 pollution_data
 */
export async function importKoreaMarineToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[Korea] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  const apiKey = process.env.KOREA_DATA_API_KEY;
  if (!apiKey) {
    console.log('[Korea] 未設定 KOREA_DATA_API_KEY，跳過匯入');
    return 0;
  }

  console.log('[Korea] 開始匯入韓國海洋水質資料...');

  // 刪除舊資料
  db.prepare(`
    DELETE FROM pollution_data 
    WHERE source = 'Korea Marine (KR)'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const today = new Date().toISOString().slice(0, 10);

  // 取得測站列表
  const stations = await fetchKoreaStations();
  
  if (!stations.length) {
    console.log('[Korea] 無測站資料');
    saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
    return 0;
  }

  console.log(`[Korea] 找到 ${stations.length} 個測站`);

  // 逐站取得觀測資料
  for (const station of stations) {
    try {
      const lat = parseFloat(station.lat || station.latitude);
      const lng = parseFloat(station.lon || station.lng || station.longitude);
      
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }

      const stationId = station.stationId || station.station_id || station.id;
      const stationName = station.stationNm || station.station_name || station.name;

      // 取得該站觀測資料
      const observations = await fetchKoreaObservations(stationId);

      if (observations.length > 0) {
        // 有觀測資料，逐筆匯入
        const insertMany = db.transaction((obs) => {
          for (const o of obs) {
            const value = parseFloat(
              o.wtemp || o.salinity || o.ph || o.do || o.value || 1
            );
            const unit = o.unit || (o.wtemp ? '°C' : 'unknown');
            const recordedAt = o.obsrDt || o.date || today;

            insertStmt.run(
              'Korea Marine (KR)',
              'water_quality',
              lat,
              lng,
              Number.isFinite(value) ? value : 1,
              unit,
              typeof recordedAt === 'string' ? recordedAt.slice(0, 10) : today,
              JSON.stringify({
                stationId,
                stationName,
                parameter: o.wtemp ? 'water_temperature' : 
                          o.salinity ? 'salinity' : 
                          o.ph ? 'pH' : 
                          o.do ? 'dissolved_oxygen' : 'unknown',
                waterTemp: o.wtemp,
                salinity: o.salinity,
                ph: o.ph,
                dissolvedOxygen: o.do,
                queryUrl: OBSERVATIONS_API
              })
            );
            totalInserted++;
          }
        });
        insertMany(observations.slice(0, 50)); // 每站最多 50 筆
      } else {
        // 無觀測資料，只記錄測站位置
        insertStmt.run(
          'Korea Marine (KR)',
          'monitoring_station',
          lat,
          lng,
          1,
          'station',
          today,
          JSON.stringify({
            stationId,
            stationName,
            region: station.region || station.area,
            queryUrl: STATIONS_API
          })
        );
        totalInserted++;
      }

      // 避免 API rate limit
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`[Korea] Station processing failed:`, error.message);
    }
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[Korea] 匯入完成，共 ${totalInserted} 筆`);
  return totalInserted;
}

export default {
  fetchKoreaStations,
  fetchKoreaObservations,
  importKoreaMarineToDatabase
};
