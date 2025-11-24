import api from './api';

const TRACKER_BASE = '/api/tracker';

/**
 * 空氣品質查詢
 * @param {number} lat - 緯度
 * @param {number} lng - 經度
 * @param {Object} options - 選項
 * @param {number} options.radius - 搜尋半徑（公尺，預設 10000）
 * @param {string} options.parameter - 污染物類型（pm25, pm10, o3, no2, so2, co）
 */
export async function getAirQuality(lat, lng, options = {}) {
  try {
    const params = new URLSearchParams({
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      radius: options.radius || 10000,
      parameter: options.parameter || 'pm25'
    });

    const response = await api.get(`${TRACKER_BASE}/air-quality?${params}`);
    return response;
  } catch (error) {
    console.error('getAirQuality error:', error);
    return { success: false, error: error.message, sources: [] };
  }
}

/**
 * 海表溫度查詢（點位）
 * @param {number} lat - 緯度
 * @param {number} lng - 經度
 * @param {Object} options - 選項
 * @param {number} options.past_days - 過去幾天（預設 3）
 * @param {number} options.forecast_days - 預報幾天（預設 4）
 */
export async function getSST(lat, lng, options = {}) {
  try {
    const params = new URLSearchParams({
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      past_days: options.past_days || 3,
      forecast_days: options.forecast_days || 4
    });

    const response = await api.get(`${TRACKER_BASE}/sst?${params}`);
    return response;
  } catch (error) {
    console.error('getSST error:', error);
    return { success: false, error: error.message, hourly: [] };
  }
}

/**
 * 海面天氣查詢（完整海況）
 * @param {number} lat - 緯度
 * @param {number} lng - 經度
 * @param {Object} options - 選項
 */
export async function getMarineWeather(lat, lng, options = {}) {
  try {
    const params = new URLSearchParams({
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      past_days: options.past_days || 3,
      forecast_days: options.forecast_days || 4
    });

    const response = await api.get(`${TRACKER_BASE}/marine?${params}`);
    return response;
  } catch (error) {
    console.error('getMarineWeather error:', error);
    return { success: false, error: error.message, hourly: [] };
  }
}

/**
 * 塑膠熱點查詢
 * @param {Object} bbox - 地理範圍 { minLon, minLat, maxLon, maxLat }
 * @param {Object} options - 選項
 * @param {number} options.min_area - 最小面積（平方公尺）
 */
export async function getPlasticSites(bbox, options = {}) {
  try {
    const bboxStr = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
    const params = new URLSearchParams({
      bbox: bboxStr,
      ...(options.min_area && { min_area: options.min_area })
    });

    const response = await api.get(`${TRACKER_BASE}/plastic-sites?${params}`);
    return response;
  } catch (error) {
    console.error('getPlasticSites error:', error);
    return { success: false, error: error.message, sites: [] };
  }
}

/**
 * 淨灘活動查詢
 * @param {Object} bbox - 地理範圍 { minLon, minLat, maxLon, maxLat }
 * @param {Object} options - 選項
 * @param {string} options.from - 開始日期 (YYYY-MM-DD)
 * @param {string} options.to - 結束日期 (YYYY-MM-DD)
 * @param {number} options.limit - 最多返回幾筆
 */
export async function getCleanupEvents(bbox, options = {}) {
  try {
    const bboxStr = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
    const params = new URLSearchParams({
      bbox: bboxStr,
      ...(options.from && { from: options.from }),
      ...(options.to && { to: options.to }),
      limit: options.limit || 200
    });

    const response = await api.get(`${TRACKER_BASE}/cleanups?${params}`);
    return response;
  } catch (error) {
    console.error('getCleanupEvents error:', error);
    return { success: false, error: error.message, events: [] };
  }
}

/**
 * SST 網格資料查詢（地圖圖層用）
 * @param {Object} bbox - 地理範圍 { minLon, minLat, maxLon, maxLat }
 * @param {string} date - 日期 (YYYY-MM-DD)，可選
 */
export async function getSSTGrid(bbox, date = null) {
  try {
    const bboxStr = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
    const params = new URLSearchParams({
      bbox: bboxStr,
      ...(date && { date })
    });

    const response = await api.get(`${TRACKER_BASE}/sst/grid?${params}`);
    return response;
  } catch (error) {
    console.error('getSSTGrid error:', error);
    return { success: false, error: error.message, grid: { cells: [] } };
  }
}

/**
 * 批次查詢：點位完整環境資料
 * @param {number} lat - 緯度
 * @param {number} lng - 經度
 */
export async function getLocationEnvironmentData(lat, lng) {
  try {
    const [airQuality, sst, marineWeather] = await Promise.all([
      getAirQuality(lat, lng).catch(e => ({ success: false, sources: [] })),
      getSST(lat, lng, { past_days: 1, forecast_days: 1 }).catch(e => ({ success: false, hourly: [] })),
      getMarineWeather(lat, lng, { past_days: 1, forecast_days: 1 }).catch(e => ({ success: false, hourly: [] }))
    ]);

    return {
      airQuality,
      sst,
      marineWeather,
      location: { lat, lng }
    };
  } catch (error) {
    console.error('getLocationEnvironmentData error:', error);
    return null;
  }
}

/**
 * 批次查詢：地圖範圍資料
 * @param {Object} bounds - Leaflet LatLngBounds 物件或 bbox 物件
 */
export async function getMapAreaData(bounds) {
  try {
    // 轉換 Leaflet bounds 為 bbox
    const bbox = bounds.getWest ? {
      minLon: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLon: bounds.getEast(),
      maxLat: bounds.getNorth()
    } : bounds;

    const [plasticSites, cleanupEvents] = await Promise.all([
      getPlasticSites(bbox, { min_area: 1000 }).catch(e => ({ success: false, sites: [] })),
      getCleanupEvents(bbox, { limit: 50 }).catch(e => ({ success: false, events: [] }))
    ]);

    return {
      plasticSites,
      cleanupEvents,
      bbox
    };
  } catch (error) {
    console.error('getMapAreaData error:', error);
    return null;
  }
}

/**
 * 輔助函數：格式化空氣品質等級
 */
export function getAirQualityLevel(value, parameter = 'pm25') {
  if (parameter === 'pm25') {
    if (value <= 12) return { level: '良好', color: 'green', description: '空氣品質令人滿意' };
    if (value <= 35.4) return { level: '中等', color: 'yellow', description: '敏感族群需注意' };
    if (value <= 55.4) return { level: '對敏感族群不健康', color: 'orange', description: '敏感族群應減少戶外活動' };
    if (value <= 150.4) return { level: '不健康', color: 'red', description: '所有人應減少戶外活動' };
    if (value <= 250.4) return { level: '非常不健康', color: 'purple', description: '所有人應避免戶外活動' };
    return { level: '危險', color: 'maroon', description: '所有人應留在室內' };
  }
  return { level: '未知', color: 'gray', description: '無法判斷' };
}

/**
 * 輔助函數：格式化海表溫度警示
 */
export function getSSTWarning(tempC) {
  if (tempC > 30) return { warning: true, message: '海水溫度過高，可能影響海洋生態' };
  if (tempC < 10) return { warning: true, message: '海水溫度較低' };
  return { warning: false, message: '溫度正常' };
}

/**
 * 輔助函數：從地圖點擊事件取得座標
 */
export function getCoordinatesFromMapEvent(event) {
  return {
    lat: event.latlng.lat,
    lng: event.latlng.lng
  };
}
