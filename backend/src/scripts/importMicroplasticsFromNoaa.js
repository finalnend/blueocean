import 'dotenv/config';
import axios from 'axios';
import { pathToFileURL } from 'url';
import getDatabase from '../database/db.js';

const FEATURE_SERVICE_URL =
  process.env.NOAA_MICROPLASTICS_URL ||
  'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/Marine_Microplastics_WGS84/FeatureServer/0/query';

const CACHE_KEY_PREFIX = 'noaa_microplastics_meta';
const STALE_WINDOW_HOURS =
  Number(process.env.NOAA_MICROPLASTICS_STALE_HOURS) || 12; // default: refresh check every 12h
const CACHE_TTL_HOURS =
  Number(process.env.NOAA_MICROPLASTICS_CACHE_TTL_HOURS) || 24 * 14; // keep ETag meta for 14 days

// 預設幾個區域（lon/lat，WGS84）
// 可依需要調整或新增
const REGIONS = {
  // 全域：不帶 geometry，抓整個圖層
  global: {
    bbox: null
  },
  // 台灣及周邊海域（粗略）
  taiwan_margin: {
    bbox: [115, 18, 130, 28]
  },
  // 北太平洋（粗略）
  north_pacific: {
    bbox: [120, 0, 240, 60]
  },
  // 地中海（粗略）
  mediterranean: {
    bbox: [-6, 30, 36, 46]
  }
};

function buildDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const [m, d, y] = parts.map((v) => Number.parseInt(v, 10));
  if (!y || !m || !d) return null;

  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

function getSyncMeta(regionKey) {
  const db = getDatabase();
  const cacheKey = `${CACHE_KEY_PREFIX}:${regionKey}`;
  const row = db
    .prepare(
      `
      SELECT cache_data
      FROM data_cache
      WHERE cache_key = ? AND expires_at > datetime('now')
    `
    )
    .get(cacheKey);

  if (!row?.cache_data) return null;

  try {
    return JSON.parse(row.cache_data);
  } catch (error) {
    console.warn(`[NOAA] Failed to parse cache for ${regionKey}:`, error.message);
    return null;
  }
}

function saveSyncMeta(regionKey, meta) {
  const db = getDatabase();
  const cacheKey = `${CACHE_KEY_PREFIX}:${regionKey}`;

  db.prepare(
    `
    INSERT OR REPLACE INTO data_cache (cache_key, cache_data, expires_at)
    VALUES (?, ?, datetime('now', '+' || ? || ' hours'))
  `
  ).run(cacheKey, JSON.stringify(meta), CACHE_TTL_HOURS);
}

function isRecentlyChecked(meta) {
  const latestTs = meta?.lastCheckedAt || meta?.lastSyncedAt;
  if (!latestTs) return false;

  const lastChecked = new Date(latestTs).getTime();
  if (Number.isNaN(lastChecked)) return false;

  const msSince = Date.now() - lastChecked;
  return msSince < STALE_WINDOW_HOURS * 60 * 60 * 1000;
}

async function checkRemoteEtag(regionKey, bbox, cachedEtag) {
  const paramsBase = {
    f: 'json',
    where: '1=1',
    outFields: 'OBJECTID',
    outSR: 4326,
    resultOffset: 0,
    resultRecordCount: 1,
    returnGeometry: false
  };

  if (bbox && bbox.length === 4) {
    const [xmin, ymin, xmax, ymax] = bbox;
    paramsBase.geometry = `${xmin},${ymin},${xmax},${ymax}`;
    paramsBase.geometryType = 'esriGeometryEnvelope';
    paramsBase.inSR = 4326;
    paramsBase.spatialRel = 'esriSpatialRelIntersects';
  }

  const headers = cachedEtag ? { 'If-None-Match': cachedEtag } : undefined;

  try {
    const res = await axios.get(FEATURE_SERVICE_URL, {
      params: paramsBase,
      headers,
      // 304 means ETag not changed; treat as success
      validateStatus: (status) => status === 200 || status === 304
    });

    const remoteEtag = res.headers?.etag;
    return { status: res.status, etag: remoteEtag || cachedEtag };
  } catch (error) {
    console.warn(`[NOAA] 無法取得 ETag (${regionKey}): ${error.message}`);
    return { status: 200, etag: cachedEtag };
  }
}

async function fetchRegionFeatures(regionKey, bbox) {
  console.log(`🌊 從 NOAA 取得區域 ${regionKey} microplastics 資料...`);

  const paramsBase = {
    f: 'geojson',
    where: '1=1',
    outFields: '*',
    outSR: 4326,
    orderByFields: 'OBJECTID',
    resultOffset: 0,
    resultRecordCount: 2000
  };

  // 若有 bbox，限定空間範圍；若為 null，抓全域
  if (bbox && bbox.length === 4) {
    const [xmin, ymin, xmax, ymax] = bbox;
    paramsBase.geometry = `${xmin},${ymin},${xmax},${ymax}`;
    paramsBase.geometryType = 'esriGeometryEnvelope';
    paramsBase.inSR = 4326;
    paramsBase.spatialRel = 'esriSpatialRelIntersects';
  }

  const allFeatures = [];

  // 分頁抓取，直到沒有新資料
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = { ...paramsBase, resultOffset: paramsBase.resultOffset };

    const res = await axios.get(FEATURE_SERVICE_URL, { params });
    const data = res.data;

    if (!data || !Array.isArray(data.features) || data.features.length === 0) {
      break;
    }

    allFeatures.push(...data.features);
    console.log(
      `  - 已取得 ${allFeatures.length} 筆（本頁 ${data.features.length} 筆）...`
    );

    if (data.features.length < paramsBase.resultRecordCount) {
      break;
    }

    paramsBase.resultOffset += paramsBase.resultRecordCount;
  }

  console.log(`✅ 區域 ${regionKey} 共取得 ${allFeatures.length} 筆資料。`);
  return allFeatures;
}

function importRegionToDb(regionKey, features) {
  if (!features.length) {
    console.log(`⚠️ 區域 ${regionKey} 沒有可匯入的資料。`);
    return 0;
  }

  const db = getDatabase();

  console.log(
    `🧹 刪除舊的 NOAA microplastics 資料（region = ${regionKey}）...`
  );
  db.prepare(
    `DELETE FROM pollution_data 
     WHERE source = 'NOAA_NCEI_Microplastics' 
       AND type = 'microplastic'
       AND json_extract(meta, '$.region') = ?`
  ).run(regionKey);

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data
    (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const today = new Date().toISOString().slice(0, 10);

  const insertMany = db.transaction((rows) => {
    for (const feature of rows) {
      if (!feature || !feature.geometry || !feature.properties) continue;

      const { geometry, properties: props } = feature;

      // 這個圖層是點資料，保守起見只處理 Point
      if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
        continue;
      }

      const [lng, lat] = geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const rawValue = props.Microplastics_measurement;
      const value = Number.parseFloat(rawValue);
      if (!Number.isFinite(value)) continue;

      const unit = props.Unit || 'pieces/m3';
      const recordedAt = buildDate(props.Date_m_d_yyyy) || today;

      const meta = JSON.stringify({
        region: regionKey,
        ocean: props.Location_Oceans,
        regionName: props.Location_Regions,
        subregion: props.Location_SubRegions,
        country: props.Country,
        state: props.State,
        beachLocation: props.Beach_Location,
        medium: props.Medium,
        concentrationClass: props.Concentration_class_text,
        doi: props.DOI,
        accession: props.NCEI_Accession_No,
        sourceLayer: 'Marine_Microplastics_WGS84'
      });

      insertStmt.run(
        'NOAA_NCEI_Microplastics',
        'microplastic',
        lat,
        lng,
        value,
        unit,
        recordedAt,
        meta
      );

      inserted += 1;
    }
  });

  insertMany(features);

  console.log(
    `💾 區域 ${regionKey} 匯入完成，成功寫入 ${inserted} 筆資料。`
  );
  return inserted;
}

async function runForRegion(regionKey) {
  const region = REGIONS[regionKey];
  if (!region) {
    console.error(`❌ 未知區域：${regionKey}`);
    console.error(`可用區域：${Object.keys(REGIONS).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const meta = getSyncMeta(regionKey);

  if (isRecentlyChecked(meta)) {
    console.log(
      `[NOAA] ${regionKey} microplastics 已在 ${meta?.lastCheckedAt || meta?.lastSyncedAt
      } 檢查過（窗口 ${STALE_WINDOW_HOURS}h），略過此次同步。`
    );
    return;
  }

  const nowIso = new Date().toISOString();
  const { status: etagStatus, etag } = await checkRemoteEtag(
    regionKey,
    region.bbox,
    meta?.etag
  );

  if (etagStatus === 304) {
    console.log(`[NOAA] ${regionKey} ETag 未變更，跳過資料匯入。`);
    saveSyncMeta(regionKey, {
      etag,
      lastCheckedAt: nowIso,
      lastSyncedAt: meta?.lastSyncedAt || meta?.lastCheckedAt || nowIso
    });
    return;
  }

  try {
    const features = await fetchRegionFeatures(regionKey, region.bbox);
    importRegionToDb(regionKey, features);

    saveSyncMeta(regionKey, {
      etag,
      lastCheckedAt: nowIso,
      lastSyncedAt: nowIso
    });
  } catch (error) {
    console.error(`❌ 區域 ${regionKey} 匯入失敗:`, error.message);
    process.exitCode = 1;
  }
}

// 提供給其他模組使用的同步函式（例如排程）
export async function syncNoaaMicroplastics(regionKey = 'global') {
  if (regionKey === 'all') {
    for (const key of Object.keys(REGIONS)) {
      // eslint-disable-next-line no-await-in-loop
      await runForRegion(key);
    }
  } else {
    await runForRegion(regionKey);
  }
}

async function main() {
  const argRegion = process.argv[2];

  if (!argRegion || argRegion === 'help' || argRegion === '--help') {
    console.log('用法：');
    console.log('  npm run import-microplastics-noaa -- <regionKey>');
    console.log('');
    console.log('可用區域：');
    Object.keys(REGIONS).forEach((key) => {
      console.log(`  - ${key}`);
    });
    console.log('');
    console.log('範例：');
    console.log('  npm run import-microplastics-noaa -- global');
    console.log('  npm run import-microplastics-noaa -- taiwan_margin');
    console.log('  npm run import-microplastics-noaa -- north_pacific');
    console.log('  npm run import-microplastics-noaa -- mediterranean');
    console.log('  npm run import-microplastics-noaa -- all');
    return;
  }

  await syncNoaaMicroplastics(argRegion);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error('❌ 匯入程序發生錯誤:', error);
    process.exit(1);
  });
}

export default {
  syncNoaaMicroplastics
};

