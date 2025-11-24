import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import getDatabase from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveGeoJsonPath() {
  // 允許從 CLI 傳入路徑，否則使用預設檔案
  const argPath = process.argv[2];
  if (argPath) {
    return path.isAbsolute(argPath)
      ? argPath
      : path.join(process.cwd(), argPath);
  }

  // 預設：backend/database/gpw_manual_sites.geojson
  return path.join(__dirname, '../../database/gpw_manual_sites.geojson');
}

function getPointFromGeometry(geometry) {
  if (!geometry) return null;

  const { type, coordinates } = geometry;

  if (type === 'Point' && Array.isArray(coordinates) && coordinates.length >= 2) {
    const [lng, lat] = coordinates;
    return { lat, lng };
  }

  // 對 Polygon / MultiPolygon 粗略取中心點（簡單平均所有座標）
  const collectCoords = [];

  if (type === 'Polygon' && Array.isArray(coordinates)) {
    for (const ring of coordinates) {
      if (Array.isArray(ring)) {
        for (const coord of ring) {
          if (Array.isArray(coord) && coord.length >= 2) {
            collectCoords.push(coord);
          }
        }
      }
    }
  } else if (type === 'MultiPolygon' && Array.isArray(coordinates)) {
    for (const polygon of coordinates) {
      if (!Array.isArray(polygon)) continue;
      for (const ring of polygon) {
        if (!Array.isArray(ring)) continue;
        for (const coord of ring) {
          if (Array.isArray(coord) && coord.length >= 2) {
            collectCoords.push(coord);
          }
        }
      }
    }
  }

  if (collectCoords.length === 0) return null;

  let sumLat = 0;
  let sumLng = 0;
  for (const [lng, lat] of collectCoords) {
    sumLat += lat;
    sumLng += lng;
  }

  const lat = sumLat / collectCoords.length;
  const lng = sumLng / collectCoords.length;

  return { lat, lng };
}

async function main() {
  const geoJsonPath = resolveGeoJsonPath();

  if (!fs.existsSync(geoJsonPath)) {
    console.error(`找不到 GeoJSON 檔案: ${geoJsonPath}`);
    console.error('請先準備一個 gpw_manual_sites.geojson 或在執行時提供路徑，例如：');
    console.error('  npm run import-gpw-manual -- ./database/gpw_manual_sites.geojson');
    process.exit(1);
  }

  console.log('📂  讀取 GPW 手動標記資料...');
  console.log(`    檔案路徑: ${geoJsonPath}`);

  const raw = fs.readFileSync(geoJsonPath, 'utf-8');
  let geojson;
  try {
    geojson = JSON.parse(raw);
  } catch (error) {
    console.error('❌ GeoJSON 解析失敗，請確認格式是否正確。');
    console.error(error.message);
    process.exit(1);
  }

  const features = Array.isArray(geojson.features) ? geojson.features : [];
  if (features.length === 0) {
    console.log('⚠️  GeoJSON.features 為空，沒有可匯入的資料。');
    process.exit(0);
  }

  const db = getDatabase();

  console.log('🧹  刪除舊的 GPW 手動資料 (source = GPW_manual)...');
  db.prepare(`DELETE FROM pollution_data WHERE source = 'GPW_manual'`).run();

  const insertStmt = db.prepare(`
    INSERT INTO pollution_data
    (source, type, lat, lng, value, unit, recorded_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const today = new Date().toISOString().slice(0, 10);

  const insertMany = db.transaction((rows) => {
    for (const feature of rows) {
      const point = getPointFromGeometry(feature.geometry);
      if (!point) {
        console.warn('⚠️  找不到可用座標，略過一筆資料。');
        continue;
      }

      const props = feature.properties || {};

      const source = props.source || 'GPW_manual';
      const type = props.type || 'plastic_site';

      // 優先使用 area_m2 當 value，沒有的話退回 value 欄位，再退回 0
      const valueRaw = props.area_m2 ?? props.value ?? 0;
      const value = Number.isFinite(Number(valueRaw)) ? Number(valueRaw) : 0;

      const unit = props.area_m2 != null ? 'm2' : (props.unit || 'index');
      const recordedAt = props.recorded_at || today;

      // 將所有 properties 存進 meta，方便前端使用
      const meta = JSON.stringify(props);

      insertStmt.run(
        source,
        type,
        point.lat,
        point.lng,
        value,
        unit,
        recordedAt,
        meta
      );

      inserted += 1;
    }
  });

  insertMany(features);

  console.log(`✅ 匯入完成，成功插入 ${inserted} 筆 GPW 手動標記資料。`);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ 匯入過程發生錯誤:', error);
  process.exit(1);
});

