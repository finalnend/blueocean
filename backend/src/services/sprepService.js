/**
 * SPREP (Pacific Environment Data Portal) Service
 * 太平洋島國環境資料 - WFS 服務
 * API: https://geoserver.sprep.org/geoserver/pipap/ows
 */
import getDatabase from '../database/db.js';
import { WFSClient, getFeatureCoordinates } from './wfsClient.js';

const SPREP_WFS_BASE = process.env.SPREP_WFS_BASE || 'https://geoserver.sprep.org/geoserver/pipap/ows';

// SPREP 常用圖層（根據實際 GetCapabilities 結果）
const SPREP_LAYERS = {
  // 保護區（使用實際存在的圖層名稱）
  wdpa_points: 'pipap:World_Database_Protected_Areas_Points',
  wdpa_polygons: 'pipap:World_Database_Protected_Areas_Polygons',
  // 太平洋 EEZ
  pacific_eez: 'pipap:pacific_eez_v11',
  // 太平洋島國
  pacific_islands: 'pipap:Pacific_Island_Countries_and_Territories'
};

const CACHE_KEY = 'sprep_sync_meta';
const STALE_WINDOW_HOURS = 24;

// 建立 WFS 客戶端（使用 1.0.0 版本，SPREP 不支援 2.0.0）
const wfsClient = new WFSClient(SPREP_WFS_BASE, {
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
 * 取得 SPREP 可用圖層
 */
export async function getSPREPLayers() {
  return await wfsClient.getCapabilities();
}

/**
 * 取得 SPREP 圖層資料
 */
export async function fetchSPREPLayer(layerName, options = {}) {
  const { bbox, country } = options;
  
  let cqlFilter = null;
  if (country) {
    cqlFilter = `country='${country}' OR country_name='${country}'`;
  }

  // 嘗試預設圖層名稱
  let typeName = SPREP_LAYERS[layerName] || layerName;
  
  // 如果不是完整名稱，加上 pipap: 前綴
  if (!typeName.includes(':')) {
    typeName = `pipap:${typeName}`;
  }

  return await wfsClient.getFeatures(typeName, {
    bbox,
    cqlFilter,
    count: options.count || 1000
  });
}

/**
 * 取得太平洋區域海洋保護區
 */
export async function fetchMarineProtectedAreas(options = {}) {
  return await fetchSPREPLayer('marine_protected', options);
}

/**
 * 取得太平洋區域珊瑚礁資料
 */
export async function fetchCoralReefs(options = {}) {
  return await fetchSPREPLayer('coral_reefs', options);
}

/**
 * 將 SPREP 資料匯入 pollution_data
 */
export async function importSPREPToDatabase() {
  const db = getDatabase();
  const meta = getSyncMeta();

  if (isRecentlyChecked(meta)) {
    console.log(`[SPREP] 已在 ${meta.lastSyncedAt} 同步過，略過此次。`);
    return 0;
  }

  console.log('[SPREP] 開始匯入太平洋島國環境資料...');

  // 先取得可用圖層
  const capabilities = await wfsClient.getCapabilities();
  
  if (!capabilities.success) {
    console.log(`[SPREP] 無法取得 capabilities: ${capabilities.error}`);
    saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
    return 0;
  }
  
  console.log(`[SPREP] 可用圖層 (${capabilities.layers?.length || 0}): ${capabilities.layers?.slice(0, 10).join(', ')}...`);

  // 刪除舊資料
  db.prepare(`
    DELETE FROM pollution_data 
    WHERE source = 'SPREP (Pacific)'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const today = new Date().toISOString().slice(0, 10);

  // 優先使用預設圖層，如果失敗則嘗試 capabilities 中的圖層
  const layersToTry = { ...SPREP_LAYERS };
  
  // 從 capabilities 中找出可能有用的圖層（包含 pipap: 前綴的）
  const availableLayers = capabilities.layers?.filter(l => l.startsWith('pipap:')) || [];
  
  // 如果預設圖層都不在 capabilities 中，使用 capabilities 中的前幾個
  const defaultLayerNames = Object.values(SPREP_LAYERS);
  const hasDefaultLayers = defaultLayerNames.some(l => availableLayers.includes(l));
  
  if (!hasDefaultLayers && availableLayers.length > 0) {
    console.log('[SPREP] 預設圖層不存在，使用 capabilities 中的圖層');
    // 清空預設，使用實際存在的
    Object.keys(layersToTry).forEach(k => delete layersToTry[k]);
    availableLayers.slice(0, 5).forEach((layer, idx) => {
      layersToTry[`layer_${idx}`] = layer;
    });
  }

  // 嘗試抓取各圖層
  for (const [layerName, typeName] of Object.entries(layersToTry)) {
    try {
      console.log(`[SPREP] 查詢 ${layerName} (${typeName})...`);
      
      const result = await wfsClient.getAllFeatures(typeName, {
        count: 500,
        maxFeatures: 3000
      });

      if (!result.success || !result.features?.length) {
        console.log(`[SPREP] ${layerName}: 無資料或圖層不存在`);
        continue;
      }

      const insertMany = db.transaction((features) => {
        for (const feature of features) {
          const coords = getFeatureCoordinates(feature);
          if (!coords) continue;

          const props = feature.properties || {};
          
          // 取得數值（如果有）
          const value = parseFloat(
            props.area_km2 || props.area || props.size || 
            props.count || props.value || 1
          );

          // 取得單位
          const unit = props.unit || (props.area_km2 ? 'km2' : 'feature');

          // 取得日期
          const recordedAt = props.date || props.survey_date || 
                            props.created || today;

          // 決定 type
          let type = 'marine_layer';
          const lowerName = layerName.toLowerCase();
          if (lowerName.includes('waste') || lowerName.includes('pollution')) {
            type = 'coastal_pollution';
          } else if (lowerName.includes('coral')) {
            type = 'coral_reef';
          } else if (lowerName.includes('mangrove')) {
            type = 'mangrove';
          } else if (lowerName.includes('protected') || lowerName.includes('wdpa')) {
            type = 'marine_protected_area';
          } else if (lowerName.includes('eez')) {
            type = 'exclusive_economic_zone';
          }

          insertStmt.run(
            'SPREP (Pacific)',
            type,
            coords.lat,
            coords.lng,
            Number.isFinite(value) ? value : 1,
            unit,
            typeof recordedAt === 'string' ? recordedAt.slice(0, 10) : today,
            JSON.stringify({
              layer: layerName,
              featureId: feature.id || props.id || props.gid,
              name: props.name || props.site_name || props.area_name || props.NAME,
              country: props.country || props.country_name || props.nation || props.TERRITORY1,
              island: props.island || props.island_name,
              status: props.status || props.protection_status || props.STATUS,
              description: props.description || props.notes,
              geometry_type: feature.geometry?.type,
              queryUrl: `${SPREP_WFS_BASE}?typeName=${typeName}`
            })
          );
          totalInserted++;
        }
      });

      insertMany(result.features);
      console.log(`[SPREP] ${layerName}: 匯入 ${result.features.length} 筆`);

    } catch (error) {
      console.error(`[SPREP] ${layerName} 處理失敗:`, error.message);
    }
  }

  saveSyncMeta({ lastSyncedAt: new Date().toISOString() });
  console.log(`[SPREP] 匯入完成，共 ${totalInserted} 筆`);
  return totalInserted;
}

/**
 * API 端點：查詢 SPREP 圖層資料
 */
export async function querySPREPLayer(options = {}) {
  const { layer, bbox, country, limit = 100 } = options;
  
  if (!layer) {
    return { error: '缺少 layer 參數' };
  }

  const result = await fetchSPREPLayer(layer, {
    bbox: bbox ? bbox.split(',').map(Number) : null,
    country,
    count: limit
  });

  if (!result.success) {
    return { error: result.error };
  }

  return {
    source: 'SPREP (Pacific)',
    layer,
    count: result.features?.length || 0,
    features: result.features?.slice(0, limit) || []
  };
}

export default {
  getSPREPLayers,
  fetchSPREPLayer,
  fetchMarineProtectedAreas,
  fetchCoralReefs,
  importSPREPToDatabase,
  querySPREPLayer
};
