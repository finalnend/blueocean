import cron from 'node-cron';
import { importOWIDDataToDatabase } from '../services/owidDataParser.js';
import { importExternalDataToDatabase, scheduleCleanup } from '../services/externalDataService.js';

/**
 * 資料同步排程管理器
 */

// 每天凌晨 2 點同步資料
export function scheduleDailyDataSync() {
  console.log('📅 設定每日資料同步排程...');
  
  // Cron 格式: 分 時 日 月 星期
  // 0 2 * * * = 每天凌晨 2:00
  cron.schedule('0 2 * * *', async () => {
    console.log('\n🔄 開始執行每日資料同步...');
    console.log(`時間: ${new Date().toISOString()}`);
    
    try {
      // 同步 OWID 資料
      const owidCount = await importOWIDDataToDatabase();
      console.log(`✅ OWID 資料同步完成: ${owidCount} 筆`);
      
      // 同步其他外部資料
      await importExternalDataToDatabase();
      
      console.log('🎉 每日資料同步完成！\n');
    } catch (error) {
      console.error('❌ 資料同步失敗:', error);
    }
  });
  
  console.log('✅ 排程已設定完成');
}

// 每週一次清理過期快取
export function scheduleWeeklyCacheCleanup() {
  console.log('📅 設定每週快取清理排程...');
  
  // 每週日凌晨 3:00
  cron.schedule('0 3 * * 0', () => {
    console.log('\n🧹 開始清理過期快取...');
    scheduleCleanup();
    console.log('✅ 快取清理完成\n');
  });
  
  console.log('✅ 排程已設定完成');
}

// 手動執行一次同步
export async function manualSync() {
  console.log('\n🔄 手動執行資料同步...');
  
  try {
    const owidCount = await importOWIDDataToDatabase();
    console.log(`✅ OWID 資料同步完成: ${owidCount} 筆`);
    
    await importExternalDataToDatabase();
    
    console.log('🎉 手動同步完成！\n');
    return true;
  } catch (error) {
    console.error('❌ 手動同步失敗:', error);
    return false;
  }
}

// 啟動所有排程
export function startAllSchedules() {
  console.log('\n🚀 啟動資料同步排程系統...\n');
  
  scheduleDailyDataSync();
  scheduleWeeklyCacheCleanup();
  
  console.log('\n✅ 所有排程已啟動');
  console.log('提示: 可以執行 npm run sync 手動觸發同步\n');
}

// 如果直接執行此腳本，進行手動同步
if (import.meta.url === `file://${process.argv[1]}`) {
  manualSync().then(() => {
    console.log('完成！');
    process.exit(0);
  }).catch((error) => {
    console.error('錯誤:', error);
    process.exit(1);
  });
}

export default {
  scheduleDailyDataSync,
  scheduleWeeklyCacheCleanup,
  manualSync,
  startAllSchedules
};
