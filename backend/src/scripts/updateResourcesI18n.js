/**
 * 更新現有資源的 i18n 欄位
 * 執行: node src/scripts/updateResourcesI18n.js
 */
import getDatabase from '../database/db.js';

const db = getDatabase();

console.log('🔄 正在更新現有資源的 i18n 欄位...');

// 確保 i18n 欄位存在
const tableInfo = db.prepare("PRAGMA table_info(resource_links)").all();
const existingColumns = tableInfo.map(col => col.name);

const columnsToAdd = [
  { name: 'title_en', type: 'VARCHAR(255)' },
  { name: 'title_zh', type: 'VARCHAR(255)' },
  { name: 'description_en', type: 'TEXT' },
  { name: 'description_zh', type: 'TEXT' }
];

for (const col of columnsToAdd) {
  if (!existingColumns.includes(col.name)) {
    console.log(`  ➕ 新增欄位: ${col.name}`);
    db.exec(`ALTER TABLE resource_links ADD COLUMN ${col.name} ${col.type}`);
  }
}

// 資源翻譯對照表 (根據 URL 匹配)
const translations = {
  'https://marinedebris.noaa.gov/': {
    title_en: 'NOAA Marine Debris Program',
    title_zh: 'NOAA 海洋廢棄物計畫',
    description_en: 'NOAA marine debris monitoring program providing US marine debris data',
    description_zh: 'NOAA 海洋廢棄物計畫，提供美國海洋垃圾監測數據'
  },
  'https://globalfishingwatch.org/': {
    title_en: 'Global Fishing Watch',
    title_zh: '全球漁業監測',
    description_en: 'Global fishing monitoring platform tracking vessel activity and ocean resource use',
    description_zh: '全球漁業監測平台，追蹤漁船活動與海洋資源利用'
  },
  'https://obis.org/': {
    title_en: 'Ocean Biodiversity Information System (OBIS)',
    title_zh: '海洋生物多樣性資訊系統 (OBIS)',
    description_en: 'Global ocean biodiversity database with over 100 million marine species records',
    description_zh: '全球海洋生物多樣性資料庫，收錄超過 1 億筆海洋物種紀錄'
  },
  'https://emodnet.ec.europa.eu/': {
    title_en: 'EMODnet - European Marine Observation',
    title_zh: 'EMODnet - 歐洲海洋觀測網',
    description_en: 'European marine observation network providing chemistry, bathymetry, and biology data',
    description_zh: '歐洲海洋觀測網，提供海洋化學、地形、生物等多元數據'
  },
  'https://www.waterqualitydata.us/': {
    title_en: 'Water Quality Portal (WQP)',
    title_zh: '美國水質監測入口網站 (WQP)',
    description_en: 'US water quality monitoring portal integrating EPA and USGS water quality data',
    description_zh: '美國水質監測入口網站，整合 EPA 與 USGS 水質數據'
  },
  'https://www.ipcc.ch/srocc/': {
    title_en: 'IPCC Ocean and Cryosphere Report',
    title_zh: 'IPCC 海洋與冰凍圈特別報告',
    description_en: 'IPCC special report analyzing climate change impacts on oceans',
    description_zh: 'IPCC 海洋與冰凍圈特別報告，分析氣候變遷對海洋的影響'
  },
  'https://www.un.org/en/conferences/ocean2022': {
    title_en: 'UN Ocean Conference Reports',
    title_zh: '聯合國海洋大會報告',
    description_en: 'UN Ocean Conference reports promoting SDG14 ocean conservation goals',
    description_zh: '聯合國海洋大會報告，推動 SDG14 海洋保育目標'
  },
  'https://www.worldwildlife.org/publications/living-blue-planet-report-2015': {
    title_en: 'WWF Living Planet Report - Ocean',
    title_zh: 'WWF 藍色星球報告',
    description_en: 'WWF Blue Planet report analyzing ocean ecosystem health',
    description_zh: 'WWF 藍色星球報告，分析海洋生態系統健康狀況'
  },
  'https://www.minderoo.org/plastic-waste-makers-index/': {
    title_en: 'Plastic Waste Makers Index',
    title_zh: '塑膠廢棄物製造者指數',
    description_en: 'Plastic waste makers index tracking global plastic producer accountability',
    description_zh: '塑膠廢棄物製造者指數，追蹤全球塑膠生產企業責任'
  },
  'https://www.surfrider.org/': {
    title_en: 'Surfrider Foundation',
    title_zh: '衝浪者基金會',
    description_en: 'Surfrider Foundation dedicated to beach protection and cleanup activities',
    description_zh: '衝浪者基金會，致力於海灘保護與淨灘活動'
  },
  'https://www.5gyres.org/': {
    title_en: '5 Gyres Institute',
    title_zh: '五大環流研究所',
    description_en: '5 Gyres Institute focusing on microplastic research and policy advocacy',
    description_zh: '五大環流研究所，專注於微塑膠研究與政策倡議'
  },
  'https://oceana.org/': {
    title_en: 'Oceana',
    title_zh: 'Oceana 國際海洋保護組織',
    description_en: 'International ocean protection organization promoting marine protection policies',
    description_zh: '國際海洋保護組織，推動海洋保護政策與法規'
  },
  'https://seashepherd.org/': {
    title_en: 'Sea Shepherd Conservation Society',
    title_zh: '海洋守護者協會',
    description_en: 'Sea Shepherd Conservation Society protecting marine life through direct action',
    description_zh: '海洋守護者協會，以直接行動保護海洋生物'
  },
  'https://e-info.org.tw/': {
    title_en: 'Taiwan Environmental Information Association',
    title_zh: '台灣環境資訊協會',
    description_en: 'Taiwan Environmental Information Center providing environmental news and education',
    description_zh: '台灣環境資訊中心，提供環境新聞與教育資源'
  },
  'https://www.sow.org.tw/': {
    title_en: 'Society of Wilderness',
    title_zh: '荒野保護協會',
    description_en: 'Taiwan Society of Wilderness promoting nature conservation and environmental education',
    description_zh: '台灣荒野保護協會，推動自然保育與環境教育'
  },
  'https://oceanhealthindex.org/': {
    title_en: 'Ocean Health Index',
    title_zh: '海洋健康指數',
    description_en: 'Ocean Health Index assessing global ocean ecosystem health',
    description_zh: '海洋健康指數，評估全球海洋生態系統健康狀況'
  },
  'https://www.omnicalculator.com/ecology/plastic-footprint': {
    title_en: 'Plastic Pollution Calculator',
    title_zh: '塑膠足跡計算器',
    description_en: 'Plastic footprint calculator measuring personal plastic use and environmental impact',
    description_zh: '塑膠足跡計算器，計算個人塑膠使用量與環境影響'
  },
  'https://www.marinetraffic.com/': {
    title_en: 'Marine Traffic',
    title_zh: '全球船舶追蹤系統',
    description_en: 'Global real-time vessel tracking system monitoring maritime traffic',
    description_zh: '全球船舶即時追蹤系統，監測海上交通與航運'
  },
  'https://www.litterati.org/': {
    title_en: 'Litterati',
    title_zh: 'Litterati 垃圾追蹤 App',
    description_en: 'Litterati app using crowdsourcing to track and clean up litter',
    description_zh: '垃圾追蹤 App，透過群眾力量記錄與清理垃圾'
  },
  'https://oceanservice.noaa.gov/education/': {
    title_en: 'NOAA Ocean Education',
    title_zh: 'NOAA 海洋教育資源',
    description_en: 'NOAA ocean education resources providing K-12 ocean science curriculum',
    description_zh: 'NOAA 海洋教育資源，提供 K-12 海洋科學課程'
  },
  'https://oceanliteracy.unesco.org/': {
    title_en: 'Ocean Literacy Portal',
    title_zh: 'UNESCO 海洋素養入口網站',
    description_en: 'UNESCO Ocean Literacy Portal promoting the seven principles of ocean literacy',
    description_zh: 'UNESCO 海洋素養入口網站，推廣海洋教育七大原則'
  },
  'https://www.plasticfreejuly.org/resources/': {
    title_en: 'Plastic Free July Resources',
    title_zh: '無塑七月活動資源',
    description_en: 'Plastic Free July resources providing plastic-free living guides and teaching materials',
    description_zh: '無塑七月活動資源，提供減塑生活指南與教學素材'
  },
  'https://www.oac.gov.tw/ch/home.jsp?id=232': {
    title_en: 'Taiwan Ocean Affairs Council - Ocean Education',
    title_zh: '海洋委員會海洋教育',
    description_en: 'Taiwan Ocean Affairs Council ocean education section providing local ocean education resources',
    description_zh: '台灣海洋委員會海洋教育專區，提供本土海洋教育資源'
  },
  'https://elearn.epa.gov.tw/': {
    title_en: 'Taiwan EPA Environmental Education Platform',
    title_zh: '環境教育終身學習網',
    description_en: 'Taiwan EPA environmental education learning platform with online courses and certification',
    description_zh: '台灣環保署環境教育學習平台，提供線上課程與認證'
  }
};

// 更新語句
const updateStmt = db.prepare(`
  UPDATE resource_links 
  SET title_en = ?, title_zh = ?, description_en = ?, description_zh = ?
  WHERE url = ?
`);

let updated = 0;

const updateAll = db.transaction(() => {
  for (const [url, trans] of Object.entries(translations)) {
    const result = updateStmt.run(
      trans.title_en,
      trans.title_zh,
      trans.description_en,
      trans.description_zh,
      url
    );
    if (result.changes > 0) {
      updated++;
      console.log(`  ✓ 更新: ${trans.title_en}`);
    }
  }
});

updateAll();

// 處理沒有匹配到的資源 - 用現有的 title/description 填充
const fillStmt = db.prepare(`
  UPDATE resource_links 
  SET 
    title_en = COALESCE(title_en, title),
    title_zh = COALESCE(title_zh, title),
    description_en = COALESCE(description_en, description),
    description_zh = COALESCE(description_zh, description)
  WHERE title_en IS NULL OR title_zh IS NULL
`);

const fillResult = fillStmt.run();
console.log(`  📝 填充未翻譯資源: ${fillResult.changes} 筆`);

console.log(`✅ 成功更新 ${updated} 筆資源的 i18n 欄位`);
console.log('🎉 資源 i18n 更新完成！');

db.close();
