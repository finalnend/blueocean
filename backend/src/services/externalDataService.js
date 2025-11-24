import getDatabase from '../database/db.js';

const db = getDatabase();

/**
 * 簡單的資料庫快取管理
 */
class CacheManager {
  // 檢查快取是否存在且未過期
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

  // 清除已過期的快取
  static clearExpired() {
    const stmt = db.prepare(`
      DELETE FROM data_cache WHERE expires_at < datetime('now')
    `);

    stmt.run();
  }
}

/**
 * Our World in Data 資料占位函式
 * 真正匯入邏輯在 owidDataParser.js 中，這裡不再回傳任何內建 MOCK。
 */
export async function fetchOWIDPlasticData() {
  console.warn(
    '[externalDataService] fetchOWIDPlasticData 不再回傳內建 MOCK，請改從資料庫查詢。'
  );
  return null;
}

/**
 * UNEP / GPW 資料占位函式
 * 未接上正式 API 前，不回傳假資料。
 */
export async function fetchUNEPPlasticData() {
  console.warn(
    '[externalDataService] fetchUNEPPlasticData 尚未接正式 API，也不再回傳 MOCK。'
  );
  return null;
}

/**
 * Copernicus 資料占位函式
 * 保留接口但不回傳模擬數據。
 */
export async function fetchCopernicusClimateData() {
  console.warn(
    '[externalDataService] fetchCopernicusClimateData 尚未接正式 API，也不再回傳 MOCK。'
  );
  return null;
}

/**
 * 聚合外部資料的占位函式
 */
export async function fetchAllExternalData() {
  console.warn(
    '[externalDataService] fetchAllExternalData 目前只回傳空結果，未使用任何 MOCK。'
  );

  return {
    owid: null,
    unep: null,
    copernicus: null,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * 定期清理快取
 */
export function scheduleCleanup() {
  // 每天清一次
  setInterval(() => {
    console.log('[externalDataService] 清理過期快取...');
    CacheManager.clearExpired();
  }, 24 * 60 * 60 * 1000);
}

/**
 * 將外部資料匯入資料庫的占位函式
 * 目前不做任何寫入，也不產生 MOCK。
 */
export async function importExternalDataToDatabase() {
  console.log(
    '[externalDataService] importExternalDataToDatabase 目前未實作，不匯入 MOCK 資料。'
  );
}

export default {
  fetchOWIDPlasticData,
  fetchUNEPPlasticData,
  fetchCopernicusClimateData,
  fetchAllExternalData,
  scheduleCleanup,
  importExternalDataToDatabase
};

