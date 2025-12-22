/**
 * 新增教育資源腳本
 * 執行: node src/scripts/addResources.js
 */
import getDatabase from '../database/db.js';

const db = getDatabase();

console.log('📚 正在新增教育資源...');

const resourceInsert = db.prepare(`
  INSERT OR IGNORE INTO resource_links (title, url, type, tags, language, description)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const newResources = [
  // 資料集
  [
    'NOAA Marine Debris Program',
    'https://marinedebris.noaa.gov/',
    'dataset',
    'marine-debris,noaa,data,usa',
    'en',
    'NOAA 海洋廢棄物計畫，提供美國海洋垃圾監測數據'
  ],
  [
    'Global Fishing Watch',
    'https://globalfishingwatch.org/',
    'dataset',
    'fishing,ocean,monitoring,satellite',
    'en',
    '全球漁業監測平台，追蹤漁船活動與海洋資源利用'
  ],
  [
    'Ocean Biodiversity Information System (OBIS)',
    'https://obis.org/',
    'dataset',
    'biodiversity,species,ocean,data',
    'en',
    '全球海洋生物多樣性資料庫，收錄超過 1 億筆海洋物種紀錄'
  ],
  [
    'EMODnet - European Marine Observation',
    'https://emodnet.ec.europa.eu/',
    'dataset',
    'europe,marine,chemistry,bathymetry',
    'en',
    '歐洲海洋觀測網，提供海洋化學、地形、生物等多元數據'
  ],
  [
    'Water Quality Portal (WQP)',
    'https://www.waterqualitydata.us/',
    'dataset',
    'water-quality,usa,monitoring,epa',
    'en',
    '美國水質監測入口網站，整合 EPA 與 USGS 水質數據'
  ],
  
  // 報告
  [
    'IPCC Ocean and Cryosphere Report',
    'https://www.ipcc.ch/srocc/',
    'report',
    'ipcc,climate,ocean,ice',
    'en',
    'IPCC 海洋與冰凍圈特別報告，分析氣候變遷對海洋的影響'
  ],
  [
    'UN Ocean Conference Reports',
    'https://www.un.org/en/conferences/ocean2022',
    'report',
    'un,sdg14,policy,ocean',
    'en',
    '聯合國海洋大會報告，推動 SDG14 海洋保育目標'
  ],
  [
    'WWF Living Planet Report - Ocean',
    'https://www.worldwildlife.org/publications/living-blue-planet-report-2015',
    'report',
    'wwf,biodiversity,ocean,wildlife',
    'en',
    'WWF 藍色星球報告，分析海洋生態系統健康狀況'
  ],
  [
    'Plastic Waste Makers Index',
    'https://www.minderoo.org/plastic-waste-makers-index/',
    'report',
    'plastic,producers,accountability,data',
    'en',
    '塑膠廢棄物製造者指數，追蹤全球塑膠生產企業責任'
  ],
  
  // NGO 組織
  [
    'Surfrider Foundation',
    'https://www.surfrider.org/',
    'ngo',
    'beach,cleanup,advocacy,usa',
    'en',
    '衝浪者基金會，致力於海灘保護與淨灘活動'
  ],
  [
    '5 Gyres Institute',
    'https://www.5gyres.org/',
    'ngo',
    'microplastic,research,advocacy',
    'en',
    '五大環流研究所，專注於微塑膠研究與政策倡議'
  ],
  [
    'Oceana',
    'https://oceana.org/',
    'ngo',
    'policy,advocacy,fishing,protection',
    'en',
    '國際海洋保護組織，推動海洋保護政策與法規'
  ],
  [
    'Sea Shepherd Conservation Society',
    'https://seashepherd.org/',
    'ngo',
    'conservation,direct-action,wildlife',
    'en',
    '海洋守護者協會，以直接行動保護海洋生物'
  ],
  [
    '台灣環境資訊協會',
    'https://e-info.org.tw/',
    'ngo',
    'taiwan,environment,news,education',
    'zh-TW',
    '台灣環境資訊中心，提供環境新聞與教育資源'
  ],
  [
    '荒野保護協會',
    'https://www.sow.org.tw/',
    'ngo',
    'taiwan,conservation,volunteer,nature',
    'zh-TW',
    '台灣荒野保護協會，推動自然保育與環境教育'
  ],
  
  // 工具
  [
    'Ocean Health Index',
    'https://oceanhealthindex.org/',
    'tool',
    'assessment,index,health,global',
    'en',
    '海洋健康指數，評估全球海洋生態系統健康狀況'
  ],
  [
    'Plastic Pollution Calculator',
    'https://www.omnicalculator.com/ecology/plastic-footprint',
    'tool',
    'calculator,footprint,plastic,personal',
    'en',
    '塑膠足跡計算器，計算個人塑膠使用量與環境影響'
  ],
  [
    'Marine Traffic',
    'https://www.marinetraffic.com/',
    'tool',
    'shipping,tracking,vessels,realtime',
    'en',
    '全球船舶即時追蹤系統，監測海上交通與航運'
  ],
  [
    'Litterati',
    'https://www.litterati.org/',
    'tool',
    'citizen-science,litter,app,community',
    'en',
    '垃圾追蹤 App，透過群眾力量記錄與清理垃圾'
  ],
  
  // 教學資源
  [
    'NOAA Ocean Education',
    'https://oceanservice.noaa.gov/education/',
    'teaching',
    'noaa,curriculum,k12,ocean',
    'en',
    'NOAA 海洋教育資源，提供 K-12 海洋科學課程'
  ],
  [
    'Ocean Literacy Portal',
    'https://oceanliteracy.unesco.org/',
    'teaching',
    'unesco,literacy,principles,education',
    'en',
    'UNESCO 海洋素養入口網站，推廣海洋教育七大原則'
  ],
  [
    'Plastic Free July Resources',
    'https://www.plasticfreejuly.org/resources/',
    'teaching',
    'plastic-free,challenge,tips,lifestyle',
    'en',
    '無塑七月活動資源，提供減塑生活指南與教學素材'
  ],
  [
    '海洋委員會海洋教育',
    'https://www.oac.gov.tw/ch/home.jsp?id=232',
    'teaching',
    'taiwan,government,ocean,education',
    'zh-TW',
    '台灣海洋委員會海洋教育專區，提供本土海洋教育資源'
  ],
  [
    '環境教育終身學習網',
    'https://elearn.epa.gov.tw/',
    'teaching',
    'taiwan,epa,elearning,certification',
    'zh-TW',
    '台灣環保署環境教育學習平台，提供線上課程與認證'
  ]
];

let inserted = 0;

const insertMany = db.transaction((resources) => {
  for (const resource of resources) {
    const result = resourceInsert.run(...resource);
    if (result.changes > 0) {
      inserted++;
    }
  }
});

insertMany(newResources);

console.log(`✅ 成功新增 ${inserted} 筆教育資源（共 ${newResources.length} 筆）`);
console.log('🎉 資源新增完成！');

db.close();
