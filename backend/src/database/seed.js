import getDatabase from './db.js';

const db = getDatabase();

console.log('🌱 正在植入種子資料...');

// 插入範例污染資料
const pollutionInsert = db.prepare(`
  INSERT INTO pollution_data (source, type, lat, lng, value, unit, recorded_at, meta)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const samplePollutionData = [
  // 太平洋垃圾帶
  ['UNEP', 'plastic', 38.0, -145.0, 1250.5, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'North Pacific Gyre' })],
  ['UNEP', 'plastic', 35.0, -140.0, 980.3, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'North Pacific Gyre' })],
  ['UNEP', 'plastic', 40.0, -150.0, 1450.8, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'North Pacific Gyre' })],
  
  // 印度洋
  ['UNEP', 'plastic', -10.0, 80.0, 620.2, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'Indian Ocean' })],
  ['UNEP', 'plastic', -15.0, 85.0, 580.5, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'Indian Ocean' })],
  
  // 大西洋
  ['UNEP', 'plastic', 28.0, -30.0, 420.7, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'North Atlantic' })],
  ['UNEP', 'plastic', 32.0, -35.0, 510.3, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'North Atlantic' })],
  
  // 地中海（高污染區）
  ['UNEP', 'plastic', 36.0, 14.0, 890.4, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'Mediterranean Sea' })],
  ['UNEP', 'plastic', 38.0, 20.0, 920.1, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'Mediterranean Sea' })],
  
  // 東南亞沿海
  ['OWID', 'plastic', 13.75, 100.50, 1580.5, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'Southeast Asia', country: 'Thailand' })],
  ['OWID', 'plastic', 14.60, 120.98, 1720.3, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'Southeast Asia', country: 'Philippines' })],
  ['OWID', 'plastic', 1.35, 103.82, 1350.8, 'kg/km²', '2024-01-01', JSON.stringify({ region: 'Southeast Asia', country: 'Singapore' })],
  
  // 微塑膠資料
  ['Research', 'microplastic', 25.0, -80.0, 45.2, 'particles/m³', '2024-01-01', JSON.stringify({ region: 'Caribbean' })],
  ['Research', 'microplastic', 51.5, -0.1, 38.7, 'particles/m³', '2024-01-01', JSON.stringify({ region: 'North Sea' })],
  
  // ========== 水質監測資料 ==========
  // 台灣水質監測站
  ['MOENV (TW)', 'water_quality', 25.0478, 121.5319, 7.2, 'pH', '2024-12-01', JSON.stringify({ region: '台北', stationName: '淡水河-關渡', parameter: 'pH值', county: '台北市' })],
  ['MOENV (TW)', 'water_quality', 25.1333, 121.7500, 6.8, 'mg/L', '2024-12-01', JSON.stringify({ region: '基隆', stationName: '基隆港', parameter: '溶氧量', county: '基隆市' })],
  ['MOENV (TW)', 'water_quality', 24.1477, 120.6736, 7.5, 'pH', '2024-12-01', JSON.stringify({ region: '台中', stationName: '台中港', parameter: 'pH值', county: '台中市' })],
  ['MOENV (TW)', 'water_quality', 22.6167, 120.2667, 7.1, 'pH', '2024-12-01', JSON.stringify({ region: '高雄', stationName: '高雄港', parameter: 'pH值', county: '高雄市' })],
  ['MOENV (TW)', 'water_quality', 23.9833, 121.6167, 8.2, 'mg/L', '2024-12-01', JSON.stringify({ region: '花蓮', stationName: '花蓮港', parameter: '溶氧量', county: '花蓮縣' })],
  ['MOENV (TW)', 'water_quality', 22.7500, 121.1500, 7.8, 'pH', '2024-12-01', JSON.stringify({ region: '台東', stationName: '台東海域', parameter: 'pH值', county: '台東縣' })],
  ['MOENV (TW)', 'water_quality', 24.8000, 121.0000, 6.5, 'mg/L', '2024-12-01', JSON.stringify({ region: '新竹', stationName: '新竹海域', parameter: '溶氧量', county: '新竹市' })],
  ['MOENV (TW)', 'water_quality', 23.4800, 120.4500, 7.3, 'pH', '2024-12-01', JSON.stringify({ region: '嘉義', stationName: '布袋港', parameter: 'pH值', county: '嘉義縣' })],
  ['MOENV (TW)', 'water_quality', 23.0000, 120.2000, 7.0, 'pH', '2024-12-01', JSON.stringify({ region: '台南', stationName: '安平港', parameter: 'pH值', county: '台南市' })],
  ['MOENV (TW)', 'water_quality', 24.2500, 120.5200, 6.9, 'mg/L', '2024-12-01', JSON.stringify({ region: '彰化', stationName: '彰化海域', parameter: '溶氧量', county: '彰化縣' })],
  
  // 美國水質監測站 (WQP)
  ['WQP', 'water_quality', 37.7749, -122.4194, 7.8, 'pH', '2024-12-01', JSON.stringify({ region: 'California', stationName: 'San Francisco Bay', parameter: 'pH', state: 'CA' })],
  ['WQP', 'water_quality', 25.7617, -80.1918, 8.1, 'pH', '2024-12-01', JSON.stringify({ region: 'Florida', stationName: 'Miami Beach', parameter: 'pH', state: 'FL' })],
  ['WQP', 'water_quality', 40.7128, -74.0060, 7.2, 'pH', '2024-12-01', JSON.stringify({ region: 'New York', stationName: 'Hudson River', parameter: 'pH', state: 'NY' })],
  ['WQP', 'water_quality', 29.7604, -95.3698, 7.5, 'pH', '2024-12-01', JSON.stringify({ region: 'Texas', stationName: 'Houston Ship Channel', parameter: 'pH', state: 'TX' })],
  ['WQP', 'water_quality', 42.3601, -71.0589, 7.6, 'pH', '2024-12-01', JSON.stringify({ region: 'Massachusetts', stationName: 'Boston Harbor', parameter: 'pH', state: 'MA' })],
  ['WQP', 'water_quality', 33.7490, -84.3880, 7.4, 'mg/L', '2024-12-01', JSON.stringify({ region: 'Georgia', stationName: 'Chattahoochee River', parameter: 'DO', state: 'GA' })],
  ['WQP', 'water_quality', 47.6062, -122.3321, 8.5, 'mg/L', '2024-12-01', JSON.stringify({ region: 'Washington', stationName: 'Puget Sound', parameter: 'DO', state: 'WA' })],
  ['WQP', 'water_quality', 32.7157, -117.1611, 8.0, 'pH', '2024-12-01', JSON.stringify({ region: 'California', stationName: 'San Diego Bay', parameter: 'pH', state: 'CA' })],
  
  // 歐洲水質監測站 (EMODnet)
  ['EMODnet', 'water_quality', 51.5074, -0.1278, 7.9, 'pH', '2024-12-01', JSON.stringify({ region: 'UK', stationName: 'Thames Estuary', parameter: 'pH', country: 'United Kingdom' })],
  ['EMODnet', 'water_quality', 48.8566, 2.3522, 7.3, 'pH', '2024-12-01', JSON.stringify({ region: 'France', stationName: 'Seine River', parameter: 'pH', country: 'France' })],
  ['EMODnet', 'water_quality', 52.5200, 13.4050, 7.1, 'mg/L', '2024-12-01', JSON.stringify({ region: 'Germany', stationName: 'Spree River', parameter: 'DO', country: 'Germany' })],
  ['EMODnet', 'water_quality', 41.9028, 12.4964, 7.6, 'pH', '2024-12-01', JSON.stringify({ region: 'Italy', stationName: 'Tiber River', parameter: 'pH', country: 'Italy' })],
  ['EMODnet', 'water_quality', 59.3293, 18.0686, 7.8, 'pH', '2024-12-01', JSON.stringify({ region: 'Sweden', stationName: 'Stockholm Archipelago', parameter: 'pH', country: 'Sweden' })],
  ['EMODnet', 'water_quality', 55.6761, 12.5683, 8.0, 'mg/L', '2024-12-01', JSON.stringify({ region: 'Denmark', stationName: 'Copenhagen Harbor', parameter: 'DO', country: 'Denmark' })],
  
  // 亞太水質監測站
  ['Korea Marine', 'water_quality', 37.5665, 126.9780, 7.4, 'pH', '2024-12-01', JSON.stringify({ region: 'South Korea', stationName: 'Han River', parameter: 'pH', country: 'South Korea' })],
  ['Korea Marine', 'water_quality', 35.1796, 129.0756, 8.1, 'pH', '2024-12-01', JSON.stringify({ region: 'South Korea', stationName: 'Busan Harbor', parameter: 'pH', country: 'South Korea' })],
  ['SPREP', 'water_quality', -17.7134, 178.0650, 8.3, 'pH', '2024-12-01', JSON.stringify({ region: 'Fiji', stationName: 'Suva Harbor', parameter: 'pH', country: 'Fiji' })],
  ['SPREP', 'water_quality', -13.8333, -171.7500, 8.2, 'pH', '2024-12-01', JSON.stringify({ region: 'Samoa', stationName: 'Apia Harbor', parameter: 'pH', country: 'Samoa' })],
  ['NPI (AU)', 'water_quality', -33.8688, 151.2093, 7.7, 'pH', '2024-12-01', JSON.stringify({ region: 'Australia', stationName: 'Sydney Harbor', parameter: 'pH', country: 'Australia' })],
  ['NPI (AU)', 'water_quality', -37.8136, 144.9631, 7.5, 'pH', '2024-12-01', JSON.stringify({ region: 'Australia', stationName: 'Melbourne Bay', parameter: 'pH', country: 'Australia' })],
];

const insertMany = db.transaction((data) => {
  for (const row of data) {
    pollutionInsert.run(...row);
  }
});

insertMany(samplePollutionData);

console.log(`✅ 插入 ${samplePollutionData.length} 筆污染資料`);

// 插入教育資源
const resourceInsert = db.prepare(`
  INSERT INTO resource_links (title, url, type, tags, language, description)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const sampleResources = [
  [
    'Plastic Pollution - Our World in Data',
    'https://ourworldindata.org/plastic-pollution',
    'dataset',
    'plastic,pollution,data',
    'en',
    '全球塑膠污染的完整數據與視覺化分析'
  ],
  [
    'UNEP Global Plastic Watch',
    'https://www.unep.org/plastic-pollution',
    'report',
    'plastic,policy,unep',
    'en',
    '聯合國環境署關於全球塑膠污染的監測與報告'
  ],
  [
    'Ocean Cleanup Project',
    'https://theoceancleanup.com/',
    'ngo',
    'cleanup,action,ocean',
    'en',
    '致力於清理海洋塑膠的國際組織'
  ],
  [
    'Copernicus Climate Change Service',
    'https://climate.copernicus.eu/',
    'dataset',
    'climate,temperature,data',
    'en',
    '歐盟氣候變遷監測服務提供的氣候數據'
  ],
  [
    'Marine Debris Tracker',
    'https://www.marinedebris.engr.uga.edu/',
    'tool',
    'citizen-science,tracking,mobile',
    'en',
    '公民科學海洋廢棄物追蹤應用'
  ],
  [
    '海洋保育教學活動指南',
    'https://oceanliteracy.unesco.org/resources/',
    'teaching',
    'education,classroom,activity',
    'zh-TW',
    '適合中學教師使用的海洋保育教學活動設計'
  ]
];

const insertResources = db.transaction((resources) => {
  for (const resource of resources) {
    resourceInsert.run(...resource);
  }
});

insertResources(sampleResources);

console.log(`✅ 插入 ${sampleResources.length} 筆教育資源`);

// 插入範例遊戲分數
const scoreInsert = db.prepare(`
  INSERT INTO game_scores (nickname, score, cleanup_rate, duration, created_at)
  VALUES (?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
`);

const sampleScores = [
  ['Ocean守護者', 5280, 0.88, 298, 1],
  ['海洋戰士', 4950, 0.82, 305, 1],
  ['Eco勇者', 4720, 0.79, 312, 2],
  ['CleanupKing', 4680, 0.78, 320, 2],
  ['海龜小幫手', 4520, 0.75, 301, 3],
  ['藍色星球', 4380, 0.73, 315, 3],
  ['環保小尖兵', 4120, 0.69, 325, 4],
  ['Ocean清潔隊', 3980, 0.66, 330, 4],
  ['海洋愛好者', 3850, 0.64, 340, 5],
  ['地球守衛', 3720, 0.62, 345, 5],
];

const insertScores = db.transaction((scores) => {
  for (const score of scores) {
    scoreInsert.run(...score);
  }
});

insertScores(sampleScores);

console.log(`✅ 插入 ${sampleScores.length} 筆遊戲分數`);

console.log('🎉 種子資料植入完成！');

db.close();
