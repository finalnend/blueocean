/**
 * EMODnet Chemistry Service
 * 歐洲海洋化學/污染監測資料
 * ERDDAP: https://erddap.emodnet-chemistry.eu/ 或 https://erddap.emodnet.eu/
 */
import axios from 'axios';
import getDatabase from '../database/db.js';

// EMODnet ERDDAP 端點（多個備用）
const ERDDAP_ENDPOINTS = [
  'https://erddap.emodnet-chemistry.eu/erddap',
  'https://erddap.emodnet.eu/erddap',
  'https://erddap.emodnet-physics.eu/erddap'
];

// 簡化：直接使用 EMODnet Physics 的即時資料（更穩定）
const PHYSICS_DATASETS = [
  { id: 'EP_PLATFORMS_METADATA', name: 'Platforms', type: 'chemistry' }
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
 * 從 ERDDAP tabledap 取得資料（嘗試多個端點）
 */
export async function fetchChemistryFromERDDAP(datasetId, constraints = {}) {
  const variables = 'latitude,longitude,time';
  
  for (const baseUrl of ERDDAP_ENDPOINTS) {
    let url = `${baseUrl}/tabledap/${datasetId}.json?${variables}`;
    
    if (constraints.minLat && constraints.maxLat) {
      url += `&latitude>=${constraints.minLat}&latitude<=${constraints.maxLat}`;
    }
    if (constraints.minLon && constraints.maxLon) {
      url += `&longitude>=${constraints.minLon}&longitude<=${constraints.maxLon}`;
    }

    try {
      console.log(`[EMODnet] Trying: ${baseUrl}...`);
      const response = await axios.get(url, { timeout: 30000 });
      
      const table = response.data?.table;
      if (!table?.rows || table.rows.length === 0) continue;

      const columnNames = table.columnNames;
      return table.rows.slice(0, 500).map(row => {
        const record = {};
        columnNames.forEach((col, idx) => {
          record[col] = row[idx];
        });
        return record;
      });
    } catch (error) {
      console.log(`[EMODnet] ${baseUrl} failed: ${error.message}`);
      continue;
    }
  }
  
  return [];
}

/**
 * 從 WFS 取得站點資料（備用方案）
 */
export async function fetchStationsWFS(bbox) {
  // 嘗試多個 WFS 端點
  const wfsEndpoints = [
    'https://geo.emodnet-chemistry.eu/geoserver/emodnet/wfs',
    'https://ows.emodnet-humanactivities.eu/wfs'
  ];
  
  for (const wfsUrl of wfsEndpoints) {
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
          count: 500
        },
        timeout: 30000
      });

      if (response.data?.features?.length > 0) {
        return response.data.features;
      }
    } catch (error) {
      console.log(`[EMODnet] WFS ${wfsUrl} failed: ${error.message}`);
      continue;
    }
  }
  
  return [];
}

/**
 * 嘗試從公開的 EMODnet 資料端點取得資料
 */
async function fetchEMODnetData(region) {
  const [minLon, minLat, maxLon, maxLat] = region.bbox.split(',').map(Number);
  
  // 嘗試 ERDDAP（使用 allDatasets 列表中的資料集）
  const commonDatasets = ['EP_PLATFORMS_METADATA', 'allDatasets'];
  
  for (const datasetId of commonDatasets) {
    const data = await fetchChemistryFromERDDAP(datasetId, {
      minLat, maxLat, minLon, maxLon
    });
    
    if (data.length > 0) {
      return { source: 'erddap', dataset: datasetId, type: 'chemistry', data };
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
