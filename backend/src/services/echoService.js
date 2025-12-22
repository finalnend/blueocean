/**
 * US EPA ECHO Service
 * 污染源/排放設施資料（NPDES 許可設施）
 * API: https://echo.epa.gov/tools/web-services
 */
import axios from 'axios';
import getDatabase from '../database/db.js';

const ECHO_BASE_URL = 'https://echodata.epa.gov/echo';

// 使用 Envirofacts API 作為備用
const ENVIROFACTS_URL = 'https://data.epa.gov/efservice';

// 查詢沿海州份的 NPDES 設施（縮減列表以加快速度）
const COASTAL_STATES = ['CA', 'FL', 'TX', 'NY', 'MA'];

const CACHE_KEY = 'echo_sync_meta';
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
 * 建立 ECHO 查詢 QID
 */
export async function createEchoQid(query) {
  try {
    const response = await axios.get(`${ECHO_BASE_URL}/cwa_rest_services.get_qid`, {
      params: {
        output: 'JSON',
        p_st: query.state,
        p_med: 'W', // Water media
        p_ptype: 'NPD', // NPDES permits
        responseset: 1000
      },
      timeout: 30000
    });

    return response.data?.Results?.QueryID || null;
  } catch (error) {
    console.error(`[ECHO] Failed to get QID: ${error.message}`);
    return null;
  }
}

/**
 * 用 QID 取得設施資料
 */
export async function fetchEchoFacilitiesByQid(qid) {
  if (!qid) return [];

  try {
    const response = await axios.get(`${ECHO_BASE_URL}/cwa_rest_services.get_facilities`, {
      params: {
        output: 'JSON',
        qid: qid,
        responseset: 1000
      },
      timeout: 60000
    });

    return response.data?.Results?.Facilities || [];
  } catch (error) {
    console.error(`[ECHO] Failed to fetch facilities: ${error.message}`);
    return [];
  }
}

// ArcGIS FeatureServer 備用端點
const ARCGIS_ECHO_URL = 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/EPA_ECHO_Facilities/FeatureServer/0/query';

/**
 * 延遲函數（用於 exponential backoff）
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 帶重試的 axios 請求（exponential backoff）
 */
async function axiosWithRetry(config, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await axios(config);
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      
      // 不重試 4xx 錯誤（除了 429 Too Many Requests）
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }
      
      // exponential backoff: 1s, 2s, 4s
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`[ECHO] 請求失敗 (attempt ${attempt + 1}/${maxRetries}), ${waitTime}ms 後重試...`);
      await delay(waitTime);
    }
  }
  throw lastError;
}

/**
 * 直接查詢設施（使用 Envirofacts API 和 ArcGIS 作為備用）
 * 加入 retry + exponential backoff
 */
async function fetchFacilitiesDirect(state) {
  // 先嘗試 ECHO API（降低 responseset 避免 500 錯誤）+ retry
  try {
    const response = await axiosWithRetry({
      method: 'get',
      url: `${ECHO_BASE_URL}/cwa_rest_services.get_facilities`,
      params: {
        output: 'JSON',
        p_st: state,
        p_med: 'W',
        p_ptype: 'NPD',
        responseset: 100  // 降低到 100 避免 500 錯誤
      },
      timeout: 30000
    });

    const facilities = response.data?.Results?.Facilities;
    if (facilities && facilities.length > 0) {
      return facilities;
    }
  } catch (error) {
    console.log(`[ECHO] ${state} ECHO API failed after retries: ${error.message}`);
  }

  // 備用方案 1：ArcGIS FeatureServer
  try {
    console.log(`[ECHO] ${state} 嘗試 ArcGIS FeatureServer...`);
    const response = await axios.get(ARCGIS_ECHO_URL, {
      params: {
        where: `STATE='${state}'`,
        outFields: 'FAC_NAME,FAC_LAT,FAC_LONG,FAC_CITY,FAC_COUNTY,NPDES_IDS',
        f: 'json',
        resultRecordCount: 100
      },
      timeout: 30000
    });

    if (response.data?.features?.length > 0) {
      return response.data.features.map(f => ({
        FacLat: f.attributes.FAC_LAT,
        FacLong: f.attributes.FAC_LONG,
        FacName: f.attributes.FAC_NAME,
        SourceID: f.attributes.NPDES_IDS,
        FacCity: f.attributes.FAC_CITY,
        FacCounty: f.attributes.FAC_COUNTY
      }));
    }
  } catch (error) {
    console.log(`[ECHO] ${state} ArcGIS failed: ${error.message}`);
  }

  // 備用方案 2：Envirofacts NPDES_PERMITS
  try {
    console.log(`[ECHO] ${state} 嘗試 Envirofacts API...`);
    const response = await axios.get(
      `${ENVIROFACTS_URL}/NPDES_PERMITS/STATE_CODE/${state}/rows/0:100/JSON`,
      { timeout: 30000 }
    );

    if (Array.isArray(response.data) && response.data.length > 0) {
      // 轉換格式
      return response.data.map(row => ({
        FacLat: row.LATITUDE83,
        FacLong: row.LONGITUDE83,
        FacName: row.FACILITY_NAME,
        SourceID: row.NPDES_ID,
        FacCity: row.CITY,
        FacCounty: row.COUNTY_NAME
      }));
    }
  } catch (error) {
    console.log(`[ECHO] ${state} Envirofacts failed: ${error.message}`);
  }

  return [];
}

/**
 * 將 ECHO 設施資料匯入 pollution_data
 */
export async function importECHOToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[ECHO] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  console.log('[ECHO] 開始匯入 EPA 污染源設施資料...');

  // 刪除舊資料
  db.prepare(`
    DELETE FROM pollution_data 
    WHERE source = 'EPA_ECHO' AND type = 'pollution_source'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const state of COASTAL_STATES) {
    try {
      console.log(`[ECHO] 查詢 ${state} 設施...`);
      const facilities = await fetchFacilitiesDirect(state);

      if (!facilities.length) {
        console.log(`[ECHO] ${state}: 無設施資料`);
        continue;
      }

      const insertMany = db.transaction((rows) => {
        for (const fac of rows) {
          const lat = parseFloat(fac.FacLat || fac.Lat83);
          const lng = parseFloat(fac.FacLong || fac.Long83);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          insertStmt.run(
            'EPA_ECHO',
            'pollution_source',
            lat,
            lng,
            1, // 設施存在 = 1
            'facility',
            today,
            JSON.stringify({
              state: state,
              facilityName: fac.FacName || fac.CWPName,
              npdesId: fac.SourceID || fac.CWPPermitStatusDesc,
              permitStatus: fac.CWPPermitStatusDesc,
              complianceStatus: fac.CWPComplianceStatus,
              city: fac.FacCity || fac.CWPCity,
              county: fac.FacCounty,
              facilityType: 'NPDES',
              queryUrl: `${ECHO_BASE_URL}/cwa_rest_services.get_facilities?p_st=${state}`
            })
          );
          totalInserted++;
        }
      });

      insertMany(facilities);
      console.log(`[ECHO] ${state}: 匯入 ${facilities.length} 筆設施`);

      // 避免 API rate limit（增加到 2 秒）
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`[ECHO] ${state} 處理失敗:`, error.message);
    }
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[ECHO] 匯入完成，共 ${totalInserted} 筆設施`);
  return totalInserted;
}

export default {
  createEchoQid,
  fetchEchoFacilitiesByQid,
  importECHOToDatabase
};
