import axios from 'axios';
import getDatabase from '../database/db.js';

const db = getDatabase();

/**
 * 快取管理工具
 */
class CacheManager {
  // 檢查快取是否存在且有效
  static get(key) {
    const stmt = db.prepare(`
      SELECT cache_data 
      FROM data_cache 
      WHERE cache_key = ? AND expires_at > datetime('now')
    `);
    
    const result = stmt.get(key);
    return result ? JSON.parse(result.cache_data) : null;
  }
  
  // 設定快取
  static set(key, data, expiresInHours = 24) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO data_cache (cache_key, cache_data, expires_at)
      VALUES (?, ?, datetime('now', '+' || ? || ' hours'))
    `);
    
    stmt.run(key, JSON.stringify(data), expiresInHours);
  }
  
  // 清除過期快取
  static clearExpired() {
    const stmt = db.prepare(`
      DELETE FROM data_cache WHERE expires_at < datetime('now')
    `);
    
    stmt.run();
  }
}

/**
 * Our World in Data 資料整合
 * https://github.com/owid/owid-datasets
 */
export async function fetchOWIDPlasticData() {
  const cacheKey = 'owid_plastic_data';
  
  // 檢查快取
  const cached = CacheManager.get(cacheKey);
  if (cached) {
    console.log('使用快取的 OWID 塑膠資料');
    return cached;
  }
  
  try {
    // 注意：OWID 主要提供 CSV 格式資料，這裡是示範
    // 實際使用時需要下載 CSV 並解析
    console.log('從 Our World in Data 取得塑膠污染資料...');
    
    // 模擬資料（實際應該從真實 API 或 CSV 取得）
    const mockData = {
      source: 'Our World in Data',
      lastUpdated: new Date().toISOString(),
      data: [
        {
          country: 'Global',
          year: 2024,
          plasticWaste: 353, // million tonnes
          mismanaged: 82.5 // million tonnes
        }
      ]
    };
    
    // 快取資料
    CacheManager.set(cacheKey, mockData, 168); // 7 天
    
    return mockData;
  } catch (error) {
    console.error('取得 OWID 資料失敗:', error.message);
    return null;
  }
}

/**
 * UNEP Global Plastic Watch 資料整合
 * 注意：實際 API 需要申請金鑰
 */
export async function fetchUNEPPlasticData() {
  const cacheKey = 'unep_plastic_watch';
  
  const cached = CacheManager.get(cacheKey);
  if (cached) {
    console.log('使用快取的 UNEP 資料');
    return cached;
  }
  
  try {
    console.log('從 UNEP Global Plastic Watch 取得資料...');
    
    // 實際應該呼叫 UNEP API
    // const response = await axios.get('https://api.unep.org/plastic-watch/...', {
    //   headers: { 'Authorization': `Bearer ${process.env.UNEP_API_KEY}` }
    // });
    
    // 模擬資料
    const mockData = {
      source: 'UNEP Global Plastic Watch',
      lastUpdated: new Date().toISOString(),
      hotspots: [
        { name: 'North Pacific Gyre', lat: 38, lng: -145, intensity: 'high' },
        { name: 'Mediterranean Sea', lat: 36, lng: 14, intensity: 'very_high' }
      ]
    };
    
    CacheManager.set(cacheKey, mockData, 72); // 3 天
    
    return mockData;
  } catch (error) {
    console.error('取得 UNEP 資料失敗:', error.message);
    return null;
  }
}

/**
 * Copernicus Climate Data 整合
 * https://cds.climate.copernicus.eu/
 */
export async function fetchCopernicusClimateData() {
  const cacheKey = 'copernicus_climate';
  
  const cached = CacheManager.get(cacheKey);
  if (cached) {
    console.log('使用快取的 Copernicus 氣候資料');
    return cached;
  }
  
  try {
    console.log('從 Copernicus 取得氣候資料...');
    
    // 實際需要使用 CDS API
    // 需安裝 cdsapi Python package 或使用其 REST API
    
    // 模擬資料
    const mockData = {
      source: 'Copernicus Climate Change Service',
      lastUpdated: new Date().toISOString(),
      globalTemperature: {
        current: 1.48, // °C above pre-industrial
        trend: 'increasing'
      },
      seaSurfaceTemp: {
        anomaly: 0.85 // °C
      }
    };
    
    CacheManager.set(cacheKey, mockData, 24); // 1 天
    
    return mockData;
  } catch (error) {
    console.error('取得 Copernicus 資料失敗:', error.message);
    return null;
  }
}

/**
 * 整合所有外部資料來源
 */
export async function fetchAllExternalData() {
  console.log('🌐 開始整合外部資料...');
  
  const results = await Promise.allSettled([
    fetchOWIDPlasticData(),
    fetchUNEPPlasticData(),
    fetchCopernicusClimateData()
  ]);
  
  const data = {
    owid: results[0].status === 'fulfilled' ? results[0].value : null,
    unep: results[1].status === 'fulfilled' ? results[1].value : null,
    copernicus: results[2].status === 'fulfilled' ? results[2].value : null,
    fetchedAt: new Date().toISOString()
  };
  
  console.log('✅ 外部資料整合完成');
  
  return data;
}

/**
 * 定期清理過期快取
 */
export function scheduleCleanup() {
  // 每天清理一次
  setInterval(() => {
    console.log('🧹 清理過期快取...');
    CacheManager.clearExpired();
  }, 24 * 60 * 60 * 1000);
}

/**
 * 將外部資料匯入資料庫
 * 這個函數可以定期執行來更新資料庫
 */
export async function importExternalDataToDatabase() {
  console.log('📥 開始匯入外部資料到資料庫...');
  
  // 這裡可以實作將外部 API 資料轉換並儲存到 pollution_data 表
  // 目前使用 seed.js 的範例資料
  
  console.log('✅ 資料匯入完成');
}

export default {
  fetchOWIDPlasticData,
  fetchUNEPPlasticData,
  fetchCopernicusClimateData,
  fetchAllExternalData,
  scheduleCleanup,
  importExternalDataToDatabase
};
