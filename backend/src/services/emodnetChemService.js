/**
 * EMODnet Chemistry Service
 * 歐洲海洋化學/污染監測資料
 * WFS: https://emodnet.ec.europa.eu/geonetwork/
 * ERDDAP: https://erddap.emodnet-chemistry.eu/
 */
import axios from 'axios';
import getDatabase from '../database/db.js';

// EMODnet Chemistry ERDDAP 端點
const ERDDAP_BASE_URL = 'https://erddap.emodnet-chemistry.eu/erddap';

// 預設查詢的資料集（可擴充）
// 這些是 EMODnet Chemistry 常見的 tabledap 資料集
const DATASETS = [
  {
    id: 'EP_ERD_INT_EUTRO_NRT',
    name: 'Eutrophication NRT',
    type: 'nutrient'
  }
];

// 歐洲海域 bbox
const EUROPEAN_SEAS = {
  north_sea: { bbox: '-5,50,10,62', name: 'North Sea' },
  baltic_sea: { bbox: '10,53,30,66', name: 'Baltic Sea' },
  mediterranean_west: { bbox: '-6,35,16,44', name: 'Western Mediterranean' },
  black_sea: { bbox: '27,40,42,47', name: 'Black Sea' }
};

const CACHE_KEY = 'emodnet_sync_meta';
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
 * 從 ERDDAP tabledap 取得資料
 */
export async function fetchChemistryFromERDDAP(datasetId, constraints = {}) {
  // 建構 ERDDAP tabledap URL
  // 格式: /tabledap/{datasetId}.json?{variables}&{constraints}
  const variables = 'latitude,longitude,time,value,parameter';
  
  let url = `${ERDDAP_BASE_URL}/tabledap/${datasetId}.json?${variables}`;
  
  // 加入約束條件
  if (constraints.minLat && constraints.maxLat) {
    url += `&latitude>=${constraints.minLat}&latitude<=${constraints.maxLat}`;
  }
  if (constraints.minLon && constraints.maxLon) {
    url += `&longitude>=${constraints.minLon}&longitude<=${constraints.maxLon}`;
  }
  if (constraints.startTime) {
    url += `&time>=${constraints.startTime}`;
  }

  try {
    console.log(`[EMODnet] Fetching from ERDDAP: ${datasetId}...`);
    const response = await axios.get(url, { timeout: 120000 });
    
    const table = response.data?.table;
    if (!table?.rows) return [];

    const columnNames = table.columnNames;
    return table.rows.map(row => {
      const record = {};
      columnNames.forEach((col, idx) => {
        record[col] = row[idx];
      });
      return record;
    });
  } catch (error) {
    // ERDDAP 可能回傳 404 如果資料集不存在或無資料
    if (error.response?.status === 404) {
      console.log(`[EMODnet] Dataset ${datasetId}: 無資料或不存在`);
      return [];
    }
    console.error(`[EMODnet] ERDDAP fetch failed: ${error.message}`);
    return [];
  }
}

/**
 * 從 WFS 取得站點資料（備用方案）
 */
export async function fetchStationsWFS(bbox) {
  const wfsUrl = 'https://geo.emodnet-chemistry.eu/geoserver/emodnet/wfs';
  
  try {
    const response = await axios.get(wfsUrl, {
      params: {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: 'emodnet:stations',
        outputFormat: 'application/json',
        bbox: bbox,
        srsName: 'EPSG:4326',
        count: 1000
      },
      timeout: 60000
    });

    return response.data?.features || [];
  } catch (error) {
    console.error(`[EMODnet] WFS fetch failed: ${error.message}`);
    return [];
  }
}

/**
 * 嘗試從公開的 EMODnet 資料端點取得資料
 */
async function fetchEMODnetData(region) {
  const [minLon, minLat, maxLon, maxLat] = region.bbox.split(',').map(Number);
  
  // 嘗試 ERDDAP
  for (const dataset of DATASETS) {
    const data = await fetchChemistryFromERDDAP(dataset.id, {
      minLat, maxLat, minLon, maxLon,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    if (data.length > 0) {
      return { source: 'erddap', dataset: dataset.id, type: dataset.type, data };
    }
  }

  // 嘗試 WFS 站點
  const stations = await fetchStationsWFS(region.bbox);
  if (stations.length > 0) {
    return { source: 'wfs', type: 'chemistry', data: stations };
  }

  return { source: null, data: [] };
}

/**
 * 將 EMODnet 資料匯入 pollution_data
 */
export async function importEMODnetToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[EMODnet] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  console.log('[EMODnet] 開始匯入歐洲海洋化學資料...');

  // 刪除舊資料
  db.prepare(`
    DELETE FROM pollution_data 
    WHERE source = 'EMODnet_Chemistry'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const [regionKey, region] of Object.entries(EUROPEAN_SEAS)) {
    try {
      console.log(`[EMODnet] 查詢 ${region.name}...`);
      const result = await fetchEMODnetData(region);

      if (!result.data.length) {
        console.log(`[EMODnet] ${regionKey}: 無資料`);
        continue;
      }

      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          let lat, lng, value, recordedAt, paramName;

          if (result.source === 'erddap') {
            lat = parseFloat(row.latitude);
            lng = parseFloat(row.longitude);
            value = parseFloat(row.value);
            recordedAt = row.time ? row.time.slice(0, 10) : today;
            paramName = row.parameter || result.type;
          } else if (result.source === 'wfs') {
            // WFS GeoJSON 格式
            const coords = row.geometry?.coordinates;
            if (!coords) return;
            [lng, lat] = coords;
            value = row.properties?.value || 1;
            recordedAt = row.properties?.date || today;
            paramName = row.properties?.parameter || 'station';
          }

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          if (!Number.isFinite(value)) value = 1;

          insertStmt.run(
            'EMODnet_Chemistry',
            result.type || 'chemistry',
            lat,
            lng,
            value,
            row.unit || 'unknown',
            recordedAt,
            JSON.stringify({
              region: regionKey,
              regionName: region.name,
              parameter: paramName,
              dataSource: result.source,
              dataset: result.dataset,
              queryUrl: `${ERDDAP_BASE_URL}/tabledap/${result.dataset || 'index'}.html`
            })
          );
          totalInserted++;
        }
      });

      insertMany(result.data);
      console.log(`[EMODnet] ${regionKey}: 匯入 ${result.data.length} 筆`);

    } catch (error) {
      console.error(`[EMODnet] ${regionKey} 處理失敗:`, error.message);
    }
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[EMODnet] 匯入完成，共 ${totalInserted} 筆`);
  return totalInserted;
}

export default {
  fetchChemistryFromERDDAP,
  fetchStationsWFS,
  importEMODnetToDatabase
};
