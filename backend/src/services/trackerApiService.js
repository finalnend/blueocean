import axios from 'axios';
import { LRUCache } from 'lru-cache';

// 快取設定（10 分鐘）
const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 10 // 10 minutes
});

/**
 * OpenAQ 空氣品質 API 服務
 */
export class OpenAQService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openaq.org/v3';
  }

  /**
   * 找尋附近的測站
   * @param {number} lat 緯度
   * @param {number} lng 經度
   * @param {number} radius 搜尋半徑（公尺）
   * @param {number} parameterId 污染物 ID (2=PM2.5, 1=PM10)
   */
  async findNearbyLocations(lat, lng, radius = 10000, parameterId = 2) {
    const cacheKey = `openaq_locations_${lat}_${lng}_${radius}_${parameterId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseURL}/locations`, {
        params: {
          coordinates: `${lat},${lng}`,
          radius: radius,
          parameters_id: parameterId,
          limit: 5
        },
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      const result = response.data;
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('OpenAQ findNearbyLocations error:', error.message);
      throw new Error(`無法取得測站資料: ${error.message}`);
    }
  }

  /**
   * 取得測站最新數值
   * @param {number} locationId 測站 ID
   */
  async getLatestMeasurements(locationId) {
    const cacheKey = `openaq_latest_${locationId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.baseURL}/locations/${locationId}/latest`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );

      const result = response.data;
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`OpenAQ getLatestMeasurements error (${locationId}):`, error.message);
      return null;
    }
  }
}

/**
 * Open-Meteo Marine Weather API 服務
 */
export class OpenMeteoMarineService {
  constructor() {
    this.baseURL = 'https://marine-api.open-meteo.com/v1/marine';
  }

  /**
   * 取得海面資料（SST、浪高等）
   * @param {number} lat 緯度
   * @param {number} lng 經度
   * @param {number} pastDays 過去幾天
   * @param {number} forecastDays 預報幾天
   */
  async getMarineData(lat, lng, pastDays = 3, forecastDays = 4) {
    const cacheKey = `marine_${lat}_${lng}_${pastDays}_${forecastDays}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseURL, {
        params: {
          latitude: lat,
          longitude: lng,
          hourly: 'wave_height,sea_surface_temperature,ocean_current_velocity',
          past_days: pastDays,
          forecast_days: forecastDays
        }
      });

      const result = response.data;
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('OpenMeteo Marine error:', error.message);
      throw new Error(`無法取得海面資料: ${error.message}`);
    }
  }
}

/**
 * Global Plastic Watch API 服務
 */
export class GlobalPlasticWatchService {
  constructor() {
    this.baseURL = 'https://api.globalplasticwatch.org';
  }

  /**
   * 查詢塑膠廢棄物熱點
   * @param {Array} bbox [minLon, minLat, maxLon, maxLat]
   * @param {number} minArea 最小面積（平方公尺）
   */
  async getPlasticSites(bbox, minArea = 0) {
    const cacheKey = `gpw_${bbox.join('_')}_${minArea}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseURL}/plastic-sites`, {
        params: {
          bbox: bbox.join(','),
          min_area: minArea
        }
      });

      const result = response.data;
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Global Plastic Watch error:', error.message);
      // 如果 API 失敗，返回空結果而不是拋出錯誤
      return { features: [] };
    }
  }
}

/**
 * Preventing Plastic Pollution (PPP) API 服務
 */
export class PPPService {
  constructor() {
    // PPP 的 ArcGIS FeatureServer endpoint（需要根據實際情況調整）
    this.baseURL = 'https://data.preventingplasticpollution.com/datasets';
  }

  /**
   * 取得淨灘活動資料
   * @param {Array} bbox [minLon, minLat, maxLon, maxLat]
   * @param {string} from 開始日期 (YYYY-MM-DD)
   * @param {string} to 結束日期 (YYYY-MM-DD)
   */
  async getCleanupEvents(bbox, from = null, to = null) {
    const cacheKey = `ppp_${bbox.join('_')}_${from}_${to}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      // 實際 endpoint 需要根據 PPP 文檔調整
      // 這裡提供一個示範結構
      const params = {
        where: '1=1',
        geometry: bbox.join(','),
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      };

      if (from) {
        params.where += ` AND date >= '${from}'`;
      }
      if (to) {
        params.where += ` AND date <= '${to}'`;
      }

      // 注意：這個 URL 需要根據實際 PPP API 調整
      // const response = await axios.get(`${this.baseURL}/cleanup-summary/FeatureServer/0/query`, { params });
      
      // 暫時返回模擬資料結構
      const result = {
        type: 'FeatureCollection',
        features: []
      };

      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('PPP API error:', error.message);
      return { type: 'FeatureCollection', features: [] };
    }
  }
}

// 導出服務實例
export const openAQService = new OpenAQService(process.env.OPENAQ_API_KEY);
export const marineService = new OpenMeteoMarineService();
export const plasticWatchService = new GlobalPlasticWatchService();
export const pppService = new PPPService();
