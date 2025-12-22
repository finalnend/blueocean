/**
 * ICES DOME Service
 * 海洋環境污染物監測資料（海水/沉積物/生物體）
 * API: https://dome.ices.dk/api/swagger/index.html
 * Webservices: https://gis.ices.dk/geonetwork/srv/eng/catalog.search
 */
import axios from 'axios';
import getDatabase from '../database/db.js';

// ICES DOME API 端點
const DOME_API_BASE = 'https://dome.ices.dk/api';
const DOME_WEBSERVICE_BASE = 'https://dome.ices.dk/Webservices/DOMEWebServices.asmx';

// 查詢區域（ICES 海域）
const ICES_AREAS = {
  north_sea: { areaCode: '27.4', name: 'North Sea' },
  baltic: { areaCode: '27.3', name: 'Baltic Sea' },
  norwegian_sea: { areaCode: '27.2', name: 'Norwegian Sea' },
  celtic_seas: { areaCode: '27.7', name: 'Celtic Seas' }
};

// 常見污染物參數
const CONTAMINANT_PARAMS = ['CD', 'PB', 'HG', 'PCB', 'PAH', 'PFAS'];

const CACHE_KEY = 'ices_dome_sync_meta';
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
 * 從 DOME API 取得海水污染物資料
 */
export async function fetchContaminantsInWater(filters = {}) {
  try {
    // 使用 DOME REST API
    const response = await axios.get(`${DOME_API_BASE}/contaminants/water`, {
      params: {
        year: filters.year || new Date().getFullYear() - 1,
        area: filters.areaCode,
        param: filters.param,
        format: 'json'
      },
      timeout: 60000,
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.data || [];
  } catch (error) {
    // 如果 REST API 失敗，嘗試 SOAP webservice（簡化版）
    console.log(`[ICES] REST API failed, trying alternative...`);
    return await fetchFromWebservice('water', filters);
  }
}

/**
 * 從 DOME API 取得沉積物污染物資料
 */
export async function fetchContaminantsInSediment(filters = {}) {
  try {
    const response = await axios.get(`${DOME_API_BASE}/contaminants/sediment`, {
      params: {
        year: filters.year || new Date().getFullYear() - 1,
        area: filters.areaCode,
        format: 'json'
      },
      timeout: 60000
    });

    return response.data || [];
  } catch (error) {
    return await fetchFromWebservice('sediment', filters);
  }
}

/**
 * 從 DOME API 取得生物體污染物資料
 */
export async function fetchContaminantsInBiota(filters = {}) {
  try {
    const response = await axios.get(`${DOME_API_BASE}/contaminants/biota`, {
      params: {
        year: filters.year || new Date().getFullYear() - 1,
        area: filters.areaCode,
        format: 'json'
      },
      timeout: 60000
    });

    return response.data || [];
  } catch (error) {
    return await fetchFromWebservice('biota', filters);
  }
}

/**
 * 備用：從 ICES 公開資料服務取得資料
 */
async function fetchFromWebservice(medium, filters) {
  try {
    // 嘗試 ICES 的公開資料下載端點
    const downloadUrl = 'https://data.ices.dk/Download/Download';
    
    const response = await axios.get(downloadUrl, {
      params: {
        dataset: 'contaminants',
        medium: medium,
        year: filters.year || new Date().getFullYear() - 1,
        format: 'json'
      },
      timeout: 120000
    });

    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error(`[ICES] Webservice fetch failed: ${error.message}`);
    return [];
  }
}

/**
 * 從 ICES 公開 GeoJSON 服務取得站點資料
 */
async function fetchStationsGeoJSON(areaCode) {
  try {
    const wfsUrl = 'https://gis.ices.dk/geoserver/ICES/wfs';
    
    const response = await axios.get(wfsUrl, {
      params: {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: 'ICES:DOME_Stations',
        outputFormat: 'application/json',
        cql_filter: areaCode ? `AREA='${areaCode}'` : undefined,
        count: 500
      },
      timeout: 60000
    });

    return response.data?.features || [];
  } catch (error) {
    console.log(`[ICES] WFS stations fetch failed: ${error.message}`);
    return [];
  }
}

/**
 * 將 ICES DOME 資料匯入 pollution_data
 */
export async function importICESDOMEToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[ICES] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  console.log('[ICES] 開始匯入 DOME 污染物監測資料...');

  // 刪除舊資料
  db.prepare(`
    DELETE FROM pollution_data 
    WHERE source = 'ICES_DOME'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const today = new Date().toISOString().slice(0, 10);
  const lastYear = new Date().getFullYear() - 1;

  // 嘗試從各區域取得資料
  for (const [areaKey, area] of Object.entries(ICES_AREAS)) {
    try {
      console.log(`[ICES] 查詢 ${area.name}...`);

      // 嘗試取得各類型資料
      const waterData = await fetchContaminantsInWater({ areaCode: area.areaCode, year: lastYear });
      const sedimentData = await fetchContaminantsInSediment({ areaCode: area.areaCode, year: lastYear });
      const biotaData = await fetchContaminantsInBiota({ areaCode: area.areaCode, year: lastYear });

      // 如果 API 都沒資料，嘗試 WFS 站點
      let allData = [
        ...waterData.map(d => ({ ...d, medium: 'water' })),
        ...sedimentData.map(d => ({ ...d, medium: 'sediment' })),
        ...biotaData.map(d => ({ ...d, medium: 'biota' }))
      ];

      if (allData.length === 0) {
        const stations = await fetchStationsGeoJSON(area.areaCode);
        allData = stations.map(s => ({
          Latitude: s.geometry?.coordinates?.[1],
          Longitude: s.geometry?.coordinates?.[0],
          Value: 1,
          MUNIT: 'station',
          DATE: today,
          PARAM: 'monitoring_station',
          medium: 'station',
          ...s.properties
        }));
      }

      if (!allData.length) {
        console.log(`[ICES] ${areaKey}: 無資料`);
        continue;
      }

      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          const lat = parseFloat(row.Latitude || row.LAT || row.latitude);
          const lng = parseFloat(row.Longitude || row.LON || row.longitude);
          
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          const value = parseFloat(row.Value || row.VALUE || 1);
          const unit = row.MUNIT || row.Unit || 'unknown';
          const recordedAt = row.DATE || row.SampleDate || today;
          const param = row.PARAM || row.Parameter || 'unknown';
          const medium = row.medium || 'unknown';

          // 根據 medium 決定 type
          let type = 'contaminant';
          if (medium === 'sediment') type = 'sediment_contaminant';
          else if (medium === 'biota') type = 'biota_contaminant';
          else if (medium === 'water') type = 'water_contaminant';

          insertStmt.run(
            'ICES_DOME',
            type,
            lat,
            lng,
            Number.isFinite(value) ? value : 1,
            unit,
            typeof recordedAt === 'string' ? recordedAt.slice(0, 10) : today,
            JSON.stringify({
              area: areaKey,
              areaName: area.name,
              areaCode: area.areaCode,
              parameter: param,
              medium: medium,
              species: row.Species || row.SPECIES,
              tissue: row.Tissue || row.TISSUE,
              method: row.Method || row.METOA,
              qualityFlag: row.QFLAG || row.QualityFlag,
              queryUrl: `${DOME_API_BASE}/contaminants/${medium}`
            })
          );
          totalInserted++;
        }
      });

      insertMany(allData);
      console.log(`[ICES] ${areaKey}: 匯入 ${allData.length} 筆`);

    } catch (error) {
      console.error(`[ICES] ${areaKey} 處理失敗:`, error.message);
    }
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[ICES] 匯入完成，共 ${totalInserted} 筆`);
  return totalInserted;
}

export default {
  fetchContaminantsInWater,
  fetchContaminantsInSediment,
  fetchContaminantsInBiota,
  importICESDOMEToDatabase
};
