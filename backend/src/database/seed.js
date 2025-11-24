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
    '#',
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
