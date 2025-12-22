/**
 * Australia NPI (National Pollutant Inventory) Service
 * 澳洲國家污染物清冊 - WFS 服務
 * API: https://data.gov.au/geoserver/npi/wfs
 */
import getDatabase from '../database/db.js';
import { WFSClient, getFeatureCoordinates } from './wfsClient.js';

const NPI_WFS_BASE = process.env.NPI_WFS_BASE || 'https://data.gov.au/geoserver/npi/wfs';

// NPI 常用圖層（根據實際 GetCapabilities 結果）
const NPI_LAYERS = {
  facilities: 'npi:Facilities_KMZ0',
  emissions: 'npi:Emissions_KMZ0',
  substances: 'npi:Substances_KMZ0'
};

const CACHE_KEY = 'npi_sync_meta';
const STALE_WINDOW_HOURS = 24;

// 建立 WFS 客戶端（使用 1.0.0 版本，data.gov.au 不支援 2.0.0）
const wfsClient = new WFSClient(NPI_WFS_BASE, {
  version: '1.0.0',
  timeout: 120000
});

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
 * 取得 NPI 可用圖層
 */
export async function getNPILayers() {
  return await wfsClient.getCapabilities();
}

/**
 * 取得 NPI 設施資料
 */
export async function fetchNPIFacilities(options = {}) {
  const { bbox, state, year } = options;
  
  let cqlFilter = null;
  const filters = [];
  
  if (state) {
    filters.push(`state='${state}'`);
  }
  if (year) {
    filters.push(`report_year=${year}`);
  }
  
  if (filters.length > 0) {
    cqlFilter = filters.join(' AND ');
  }

  return await wfsClient.getFeatures(NPI_LAYERS.facilities, {
    bbox,
    cqlFilter,
    count: options.count || 1000
  });
}

/**
 * 取得 NPI 排放資料
 */
export async function fetchNPIEmissions(options = {}) {
  const { bbox, substance, medium, year } = options;
  
  const filters = [];
  
  if (substance) {
    filters.push(`substance_name LIKE '%${substance}%'`);
  }
  if (medium) {
    filters.push(`medium='${medium}'`);
  }
  if (year) {
    filters.push(`report_year=${year}`);
  }
  
  const cqlFilter = filters.length > 0 ? filters.join(' AND ') : null;

  // 嘗試 emissions 圖層，如果失敗則嘗試 facilities
  let result = await wfsClient.getFeatures(NPI_LAYERS.emissions, {
    bbox,
    cqlFilter,
    count: options.count || 1000
  });

  if (!result.success || result.features?.length === 0) {
    // 嘗試備用圖層
    result = await wfsClient.getFeatures(NPI_LAYERS.facilities, {
      bbox,
      count: options.count || 1000
    });
  }

  return result;
}

/**
 * 將 NPI 資料匯入 pollution_data
 */
export async function importNPIToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[NPI] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  console.log('[NPI] 開始匯入澳洲 NPI 污染排放資料...');

  // 先取得可用圖層
  const capabilities = await wfsClient.getCapabilities();
  console.log(`[NPI] 可用圖層: ${capabilities.layers?.slice(0, 10).join(', ')}...`);

  // 刪除舊資料
  db.prepare(`
    DELETE FROM pollution_data 
    WHERE source = 'NPI (AU)'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  // 嘗試抓取各圖層
  for (const [layerName, typeName] of Object.entries(NPI_LAYERS)) {
    try {
      console.log(`[NPI] 查詢 ${layerName} (${typeName})...`);
      
      const result = await wfsClient.getAllFeatures(typeName, {
        count: 1000,
        maxFeatures: 5000
      });

      if (!result.success || !result.features?.length) {
        console.log(`[NPI] ${layerName}: 無資料或圖層不存在`);
        continue;
      }

      const insertMany = db.transaction((features) => {
        for (const feature of features) {
          const coords = getFeatureCoordinates(feature);
          if (!coords) continue;

          const props = feature.properties || {};
          
          // 取得排放量
          const value = parseFloat(
            props.total_emission || props.emission_kg || 
            props.quantity || props.amount || 1
          );

          // 取得單位
          const unit = props.unit || props.emission_unit || 'kg/year';

          // 取得年份
          const reportYear = props.report_year || props.year || currentYear - 1;
          const recordedAt = `${reportYear}-01-01`;

          // 決定 type
          let type = 'emission';
          if (layerName.includes('water') || props.medium === 'Water') {
            type = 'water_emission';
          }

          insertStmt.run(
            'NPI (AU)',
            type,
            coords.lat,
            coords.lng,
            Number.isFinite(value) ? value : 1,
            unit,
            recordedAt,
            JSON.stringify({
              layer: layerName,
              facilityId: props.facility_id || props.npi_id,
              facilityName: props.facility_name || props.name,
              substance: props.substance_name || props.substance,
              medium: props.medium,
              state: props.state,
              postcode: props.postcode,
              industry: props.industry || props.anzsic,
              reportYear: reportYear,
              queryUrl: `${NPI_WFS_BASE}?typeName=${typeName}`
            })
          );
          totalInserted++;
        }
      });

      insertMany(result.features);
      console.log(`[NPI] ${layerName}: 匯入 ${result.features.length} 筆`);

    } catch (error) {
      console.error(`[NPI] ${layerName} 處理失敗:`, error.message);
    }
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[NPI] 匯入完成，共 ${totalInserted} 筆`);
  return totalInserted;
}

/**
 * API 端點：查詢 NPI 排放資料
 */
export async function queryNPIEmissions(options = {}) {
  const { bbox, substance, year, limit = 100 } = options;
  
  const result = await fetchNPIEmissions({
    bbox: bbox ? bbox.split(',').map(Number) : null,
    substance,
    year: year ? parseInt(year) : null,
    count: limit
  });

  if (!result.success) {
    return { error: result.error };
  }

  return {
    source: 'NPI (AU)',
    count: result.features?.length || 0,
    features: result.features?.slice(0, limit) || []
  };
}

export default {
  getNPILayers,
  fetchNPIFacilities,
  fetchNPIEmissions,
  importNPIToDatabase,
  queryNPIEmissions
};
