import express from 'express';
import {
  getAirQuality,
  getSST,
  getMarineWeather,
  getPlasticSites,
  getCleanupEvents,
  getSSTGrid,
  getTrackerSources,
  getMOENVWater,
  getNPIEmissions,
  getSPREPLayer
} from '../controllers/trackerController.js';

const router = express.Router();

/**
 * Tracker API Routes
 * 
 * 前端使用範例：
 * 
 * 1. 空氣品質
 *    GET /api/tracker/air-quality?lat=25.0&lng=121.5&parameter=pm25
 * 
 * 2. 海表溫度（點位）
 *    GET /api/tracker/sst?lat=25.0&lng=122.0&past_days=3&forecast_days=4
 * 
 * 3. 海面天氣（浪高等）
 *    GET /api/tracker/marine?lat=25.0&lng=122.0&past_days=3&forecast_days=4
 * 
 * 4. SST 網格（地圖圖層）
 *    GET /api/tracker/sst/grid?bbox=120,22,125,26&date=2025-11-15
 * 
 * 5. 塑膠熱點
 *    GET /api/tracker/plastic-sites?bbox=120,22,125,26&min_area=1000
 * 
 * 6. 淨灘活動
 *    GET /api/tracker/cleanups?bbox=120,22,125,26&from=2024-01-01&to=2024-12-31
 * 
 * === 亞太來源 ===
 * 
 * 7. 台灣 MOENV 水質
 *    GET /api/tracker/moenv-water?dataId=wqx_p_10&yearMonth=2024_01&limit=100
 * 
 * 8. 澳洲 NPI 排放
 *    GET /api/tracker/npi-emissions?bbox=140,-40,155,-25&substance=Mercury&year=2022
 * 
 * 9. 太平洋 SPREP 圖層
 *    GET /api/tracker/sprep-layer?layer=marine_protected&bbox=160,-20,180,0
 */

// 空氣品質
router.get('/air-quality', getAirQuality);

// 海表溫度（點位）
router.get('/sst', getSST);

// SST 網格（地圖圖層）
router.get('/sst/grid', getSSTGrid);

// 海面天氣
router.get('/marine', getMarineWeather);

// 塑膠熱點
router.get('/plastic-sites', getPlasticSites);

// 淨灘活動
router.get('/cleanups', getCleanupEvents);

// 資料來源狀態
router.get('/sources', getTrackerSources);

// === 亞太來源 ===

// 台灣 MOENV 水質
router.get('/moenv-water', getMOENVWater);

// 澳洲 NPI 排放
router.get('/npi-emissions', getNPIEmissions);

// 太平洋 SPREP 圖層
router.get('/sprep-layer', getSPREPLayer);

export default router;
