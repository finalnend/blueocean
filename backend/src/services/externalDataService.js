/**
 * External Data Service
 * 整合所有外部資料來源的匯入功能
 */
import getDatabase from '../database/db.js';
// 歐美來源
import { importWQPToDatabase } from './wqpService.js';
import { importECHOToDatabase } from './echoService.js';
import { importEMODnetToDatabase } from './emodnetChemService.js';
import { importICESDOMEToDatabase } from './icesDomeService.js';
// 亞太來源
import { importMOENVToDatabase } from './moenvService.js';
import { importNPIToDatabase } from './npiService.js';
import { importSPREPToDatabase } from './sprepService.js';

const db = getDatabase();

/**
 * 簡單的資料庫快取管理
 */
export class CacheManager {
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
 * 真正匯入邏輯在 owidDataParser.js 中
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
  console.log('[externalDataService] 清理過期快取...');
  CacheManager.clearExpired();
}

/**
 * 將所有外部資料匯入資料庫
 * 整合歐美來源 (WQP, ECHO, EMODnet, ICES) + 亞太來源 (MOENV, NPI, SPREP)
 */
export async function importExternalDataToDatabase() {
  console.log('[externalDataService] 開始匯入外部資料來源...');
  
  const results = {
    // 歐美來源
    wqp: 0,
    echo: 0,
    emodnet: 0,
    ices: 0,
    // 亞太來源
    moenv: 0,
    npi: 0,
    sprep: 0,
    errors: []
  };

  // ========== 歐美來源 ==========
  
  // 1. Water Quality Portal (WQP) - 美國近岸水質
  try {
    console.log('\n--- WQP (Water Quality Portal) ---');
    results.wqp = await importWQPToDatabase();
  } catch (error) {
    console.error('[WQP] 匯入失敗:', error.message);
    results.errors.push({ source: 'WQP', error: error.message });
  }

  // 2. EPA ECHO - 美國污染源設施
  try {
    console.log('\n--- EPA ECHO ---');
    results.echo = await importECHOToDatabase();
  } catch (error) {
    console.error('[ECHO] 匯入失敗:', error.message);
    results.errors.push({ source: 'EPA_ECHO', error: error.message });
  }

  // 3. EMODnet Chemistry - 歐洲海洋化學
  try {
    console.log('\n--- EMODnet Chemistry ---');
    results.emodnet = await importEMODnetToDatabase();
  } catch (error) {
    console.error('[EMODnet] 匯入失敗:', error.message);
    results.errors.push({ source: 'EMODnet_Chemistry', error: error.message });
  }

  // 4. ICES DOME - 歐洲海洋污染物監測
  try {
    console.log('\n--- ICES DOME ---');
    results.ices = await importICESDOMEToDatabase();
  } catch (error) {
    console.error('[ICES] 匯入失敗:', error.message);
    results.errors.push({ source: 'ICES_DOME', error: error.message });
  }

  // ========== 亞太來源 ==========

  // 5. MOENV (TW) - 台灣環境部水質資料
  try {
    console.log('\n--- MOENV (Taiwan) ---');
    results.moenv = await importMOENVToDatabase();
  } catch (error) {
    console.error('[MOENV] 匯入失敗:', error.message);
    results.errors.push({ source: 'MOENV (TW)', error: error.message });
  }

  // 6. NPI (AU) - 澳洲國家污染物清冊
  try {
    console.log('\n--- NPI (Australia) ---');
    results.npi = await importNPIToDatabase();
  } catch (error) {
    console.error('[NPI] 匯入失敗:', error.message);
    results.errors.push({ source: 'NPI (AU)', error: error.message });
  }

  // 7. SPREP (Pacific) - 太平洋島國環境資料
  try {
    console.log('\n--- SPREP (Pacific) ---');
    results.sprep = await importSPREPToDatabase();
  } catch (error) {
    console.error('[SPREP] 匯入失敗:', error.message);
    results.errors.push({ source: 'SPREP (Pacific)', error: error.message });
  }

  // 總結
  const totalWestern = results.wqp + results.echo + results.emodnet + results.ices;
  const totalAPAC = results.moenv + results.npi + results.sprep;
  const total = totalWestern + totalAPAC;
  
  console.log('\n========================================');
  console.log('[externalDataService] 外部資料匯入完成');
  console.log('--- 歐美來源 ---');
  console.log(`  WQP:     ${results.wqp} 筆`);
  console.log(`  ECHO:    ${results.echo} 筆`);
  console.log(`  EMODnet: ${results.emodnet} 筆`);
  console.log(`  ICES:    ${results.ices} 筆`);
  console.log(`  小計:    ${totalWestern} 筆`);
  console.log('--- 亞太來源 ---');
  console.log(`  MOENV:   ${results.moenv} 筆`);
  console.log(`  NPI:     ${results.npi} 筆`);
  console.log(`  SPREP:   ${results.sprep} 筆`);
  console.log(`  小計:    ${totalAPAC} 筆`);
  console.log('---');
  console.log(`  總計:    ${total} 筆`);
  
  if (results.errors.length > 0) {
    console.log(`  錯誤:    ${results.errors.length} 個來源失敗`);
  }
  console.log('========================================\n');

  return results;
}

/**
 * 取得所有資料來源的統計
 */
export function getDataSourceStats() {
  const stmt = db.prepare(`
    SELECT 
      source,
      type,
      COUNT(*) as count,
      MIN(recorded_at) as earliest,
      MAX(recorded_at) as latest
    FROM pollution_data
    GROUP BY source, type
    ORDER BY source, type
  `);

  return stmt.all();
}

export default {
  fetchOWIDPlasticData,
  fetchUNEPPlasticData,
  fetchCopernicusClimateData,
  fetchAllExternalData,
  scheduleCleanup,
  importExternalDataToDatabase,
  getDataSourceStats,
  CacheManager
};
