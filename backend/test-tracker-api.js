/**
 * Tracker API 測試腳本
 * 
 * 執行方式：node test-tracker-api.js
 * 
 * 注意：需要先啟動後端伺服器並設定好 OPENAQ_API_KEY
 */

const BASE_URL = 'http://localhost:3000/api/tracker';

async function testAPI(endpoint, name) {
  console.log(`\n測試 ${name}...`);
  console.log(`請求: ${endpoint}`);
  
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 成功');
      console.log('回應:', JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      console.log('❌ 失敗:', data.error);
    }
  } catch (error) {
    console.log('❌ 請求錯誤:', error.message);
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Blue Earth Watch - Tracker API 測試');
  console.log('='.repeat(60));

  // 測試空氣品質 API（台北）
  await testAPI(
    `${BASE_URL}/air-quality?lat=25.0478&lng=121.5170&parameter=pm25`,
    '空氣品質查詢 (台北)'
  );

  // 測試海表溫度 API（台灣東部海域）
  await testAPI(
    `${BASE_URL}/sst?lat=25.0&lng=122.0&past_days=2&forecast_days=2`,
    '海表溫度查詢 (台灣東部)'
  );

  // 測試海面天氣 API
  await testAPI(
    `${BASE_URL}/marine?lat=25.0&lng=122.0`,
    '海面天氣查詢'
  );

  // 測試塑膠熱點 API（台灣周邊）
  await testAPI(
    `${BASE_URL}/plastic-sites?bbox=120,22,125,26`,
    '塑膠熱點查詢 (台灣周邊)'
  );

  // 測試淨灘活動 API
  await testAPI(
    `${BASE_URL}/cleanups?bbox=120,22,125,26&limit=10`,
    '淨灘活動查詢'
  );

  // 測試 SST 網格 API
  await testAPI(
    `${BASE_URL}/sst/grid?bbox=120,22,125,26`,
    'SST 網格查詢'
  );

  console.log('\n' + '='.repeat(60));
  console.log('測試完成！');
  console.log('='.repeat(60));
}

// 執行測試
runTests().catch(console.error);
