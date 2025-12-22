/**
 * 新增教育資源腳本（支援 i18n）
 * 執行: node src/scripts/addResources.js
 */
import getDatabase from '../database/db.js';

const db = getDatabase();

console.log('📚 正在新增教育資源...');

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

const resourceInsert = db.prepare(`
  INSERT OR IGNORE INTO resource_links (title, url, type, tags, language, description, title_en, title_zh, description_en, description_zh)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 資源格式: [title, url, type, tags, language, description, title_en, title_zh, description_en, description_zh]
const newResources = [
  // ===== 資料集 =====
  [
    'NOAA Marine Debris Program',
    'https://marinedebris.noaa.gov/',
    'dataset',
    'marine-debris,noaa,data,usa',
    'en',
    'NOAA marine debris monitoring data',
    'NOAA Marine Debris Program',
    'NOAA 海洋廢棄物計畫',
    'NOAA marine debris monitoring program providing US marine debris data',
    'NOAA 海洋廢棄物計畫，提供美國海洋垃圾監測數據'
  ],
  [
    'Global Fishing Watch',
    'https://globalfishingwatch.org/',
    'dataset',
    'fishing,ocean,monitoring,satellite',
    'en',
    'Global fishing monitoring platform',
    'Global Fishing Watch',
    '全球漁業監測',
    'Global fishing monitoring platform tracking vessel activity and ocean resource use',
    '全球漁業監測平台，追蹤漁船活動與海洋資源利用'
  ],
  [
    'Ocean Biodiversity Information System (OBIS)',
    'https://obis.org/',
    'dataset',
    'biodiversity,species,ocean,data',
    'en',
    'Global ocean biodiversity database',
    'Ocean Biodiversity Information System (OBIS)',
    '海洋生物多樣性資訊系統 (OBIS)',
    'Global ocean biodiversity database with over 100 million marine species records',
    '全球海洋生物多樣性資料庫，收錄超過 1 億筆海洋物種紀錄'
  ],
  [
    'EMODnet - European Marine Observation',
    'https://emodnet.ec.europa.eu/',
    'dataset',
    'europe,marine,chemistry,bathymetry',
    'en',
    'European marine observation network',
    'EMODnet - European Marine Observation',
    'EMODnet - 歐洲海洋觀測網',
    'European marine observation network providing chemistry, bathymetry, and biology data',
    '歐洲海洋觀測網，提供海洋化學、地形、生物等多元數據'
  ],
  [
    'Water Quality Portal (WQP)',
    'https://www.waterqualitydata.us/',
    'dataset',
    'water-quality,usa,monitoring,epa',
    'en',
    'US water quality monitoring portal',
    'Water Quality Portal (WQP)',
    '美國水質監測入口網站 (WQP)',
    'US water quality monitoring portal integrating EPA and USGS water quality data',
    '美國水質監測入口網站，整合 EPA 與 USGS 水質數據'
  ],

  // ===== 報告 =====
  [
    'IPCC Ocean and Cryosphere Report',
    'https://www.ipcc.ch/srocc/',
    'report',
    'ipcc,climate,ocean,ice',
    'en',
    'IPCC special report on ocean and cryosphere',
    'IPCC Ocean and Cryosphere Report',
    'IPCC 海洋與冰凍圈特別報告',
    'IPCC special report analyzing climate change impacts on oceans',
    'IPCC 海洋與冰凍圈特別報告，分析氣候變遷對海洋的影響'
  ],
  [
    'UN Ocean Conference Reports',
    'https://www.un.org/en/conferences/ocean2022',
    'report',
    'un,sdg14,policy,ocean',
    'en',
    'UN Ocean Conference reports',
    'UN Ocean Conference Reports',
    '聯合國海洋大會報告',
    'UN Ocean Conference reports promoting SDG14 ocean conservation goals',
    '聯合國海洋大會報告，推動 SDG14 海洋保育目標'
  ],
  [
    'WWF Living Planet Report - Ocean',
    'https://www.worldwildlife.org/publications/living-blue-planet-report-2015',
    'report',
    'wwf,biodiversity,ocean,wildlife',
    'en',
    'WWF Blue Planet report',
    'WWF Living Planet Report - Ocean',
    'WWF 藍色星球報告',
    'WWF Blue Planet report analyzing ocean ecosystem health',
    'WWF 藍色星球報告，分析海洋生態系統健康狀況'
  ],
  [
    'Plastic Waste Makers Index',
    'https://www.minderoo.org/plastic-waste-makers-index/',
    'report',
    'plastic,producers,accountability,data',
    'en',
    'Plastic waste producers index',
    'Plastic Waste Makers Index',
    '塑膠廢棄物製造者指數',
    'Plastic waste makers index tracking global plastic producer accountability',
    '塑膠廢棄物製造者指數，追蹤全球塑膠生產企業責任'
  ],
  [
    'State of the Ocean Report',
    'https://stateoftheocean.ospar.org/',
    'report',
    'ospar,atlantic,assessment,europe',
    'en',
    'OSPAR ocean state assessment',
    'State of the Ocean Report',
    '海洋狀態報告',
    'OSPAR assessment of Northeast Atlantic ocean health and pollution',
    'OSPAR 東北大西洋海洋健康與污染評估報告'
  ],

  // ===== NGO 組織 =====
  [
    'Surfrider Foundation',
    'https://www.surfrider.org/',
    'ngo',
    'beach,cleanup,advocacy,usa',
    'en',
    'Beach protection and cleanup organization',
    'Surfrider Foundation',
    '衝浪者基金會',
    'Surfrider Foundation dedicated to beach protection and cleanup activities',
    '衝浪者基金會，致力於海灘保護與淨灘活動'
  ],
  [
    '5 Gyres Institute',
    'https://www.5gyres.org/',
    'ngo',
    'microplastic,research,advocacy',
    'en',
    'Microplastic research institute',
    '5 Gyres Institute',
    '五大環流研究所',
    '5 Gyres Institute focusing on microplastic research and policy advocacy',
    '五大環流研究所，專注於微塑膠研究與政策倡議'
  ],
  [
    'Oceana',
    'https://oceana.org/',
    'ngo',
    'policy,advocacy,fishing,protection',
    'en',
    'International ocean protection organization',
    'Oceana',
    'Oceana 國際海洋保護組織',
    'International ocean protection organization promoting marine protection policies',
    '國際海洋保護組織，推動海洋保護政策與法規'
  ],
  [
    'Sea Shepherd Conservation Society',
    'https://seashepherd.org/',
    'ngo',
    'conservation,direct-action,wildlife',
    'en',
    'Marine wildlife conservation society',
    'Sea Shepherd Conservation Society',
    '海洋守護者協會',
    'Sea Shepherd Conservation Society protecting marine life through direct action',
    '海洋守護者協會，以直接行動保護海洋生物'
  ],
  [
    'The Ocean Cleanup',
    'https://theoceancleanup.com/',
    'ngo',
    'cleanup,technology,plastic,innovation',
    'en',
    'Ocean plastic cleanup technology',
    'The Ocean Cleanup',
    '海洋清理計畫',
    'The Ocean Cleanup developing advanced technologies to rid oceans of plastic',
    '海洋清理計畫，開發先進技術清除海洋塑膠'
  ],
  [
    '台灣環境資訊協會',
    'https://e-info.org.tw/',
    'ngo',
    'taiwan,environment,news,education',
    'zh-TW',
    'Taiwan environmental information center',
    'Taiwan Environmental Information Association',
    '台灣環境資訊協會',
    'Taiwan Environmental Information Center providing environmental news and education',
    '台灣環境資訊中心，提供環境新聞與教育資源'
  ],
  [
    '荒野保護協會',
    'https://www.sow.org.tw/',
    'ngo',
    'taiwan,conservation,volunteer,nature',
    'zh-TW',
    'Taiwan wilderness conservation society',
    'Society of Wilderness',
    '荒野保護協會',
    'Taiwan Society of Wilderness promoting nature conservation and environmental education',
    '台灣荒野保護協會，推動自然保育與環境教育'
  ],

  // ===== 工具 =====
  [
    'Ocean Health Index',
    'https://oceanhealthindex.org/',
    'tool',
    'assessment,index,health,global',
    'en',
    'Global ocean health assessment index',
    'Ocean Health Index',
    '海洋健康指數',
    'Ocean Health Index assessing global ocean ecosystem health',
    '海洋健康指數，評估全球海洋生態系統健康狀況'
  ],
  [
    'Plastic Pollution Calculator',
    'https://www.omnicalculator.com/ecology/plastic-footprint',
    'tool',
    'calculator,footprint,plastic,personal',
    'en',
    'Personal plastic footprint calculator',
    'Plastic Pollution Calculator',
    '塑膠足跡計算器',
    'Plastic footprint calculator measuring personal plastic use and environmental impact',
    '塑膠足跡計算器，計算個人塑膠使用量與環境影響'
  ],
  [
    'Marine Traffic',
    'https://www.marinetraffic.com/',
    'tool',
    'shipping,tracking,vessels,realtime',
    'en',
    'Global vessel tracking system',
    'Marine Traffic',
    '全球船舶追蹤系統',
    'Global real-time vessel tracking system monitoring maritime traffic',
    '全球船舶即時追蹤系統，監測海上交通與航運'
  ],
  [
    'Litterati',
    'https://www.litterati.org/',
    'tool',
    'citizen-science,litter,app,community',
    'en',
    'Litter tracking app',
    'Litterati',
    'Litterati 垃圾追蹤 App',
    'Litterati app using crowdsourcing to track and clean up litter',
    '垃圾追蹤 App，透過群眾力量記錄與清理垃圾'
  ],
  [
    'Global Plastic Navigator',
    'https://plasticnavigator.wwf.de/',
    'tool',
    'wwf,plastic,policy,tracker',
    'en',
    'WWF plastic policy tracker',
    'Global Plastic Navigator',
    'WWF 全球塑膠導航',
    'WWF Global Plastic Navigator tracking plastic policies worldwide',
    'WWF 全球塑膠導航，追蹤全球塑膠政策進展'
  ],

  // ===== 教學資源 =====
  [
    'NOAA Ocean Education',
    'https://oceanservice.noaa.gov/education/',
    'teaching',
    'noaa,curriculum,k12,ocean',
    'en',
    'NOAA ocean education resources',
    'NOAA Ocean Education',
    'NOAA 海洋教育資源',
    'NOAA ocean education resources providing K-12 ocean science curriculum',
    'NOAA 海洋教育資源，提供 K-12 海洋科學課程'
  ],
  [
    'Ocean Literacy Portal',
    'https://oceanliteracy.unesco.org/',
    'teaching',
    'unesco,literacy,principles,education',
    'en',
    'UNESCO ocean literacy portal',
    'Ocean Literacy Portal',
    'UNESCO 海洋素養入口網站',
    'UNESCO Ocean Literacy Portal promoting the seven principles of ocean literacy',
    'UNESCO 海洋素養入口網站，推廣海洋教育七大原則'
  ],
  [
    'Plastic Free July Resources',
    'https://www.plasticfreejuly.org/resources/',
    'teaching',
    'plastic-free,challenge,tips,lifestyle',
    'en',
    'Plastic-free living resources',
    'Plastic Free July Resources',
    '無塑七月活動資源',
    'Plastic Free July resources providing plastic-free living guides and teaching materials',
    '無塑七月活動資源，提供減塑生活指南與教學素材'
  ],
  [
    'Smithsonian Ocean Portal',
    'https://ocean.si.edu/',
    'teaching',
    'smithsonian,education,science,museum',
    'en',
    'Smithsonian ocean education portal',
    'Smithsonian Ocean Portal',
    '史密森尼海洋入口網站',
    'Smithsonian Ocean Portal providing ocean science education and resources',
    '史密森尼海洋入口網站，提供海洋科學教育與資源'
  ],
  [
    '海洋委員會海洋教育',
    'https://www.oac.gov.tw/ch/home.jsp?id=232',
    'teaching',
    'taiwan,government,ocean,education',
    'zh-TW',
    'Taiwan Ocean Affairs Council education',
    'Taiwan Ocean Affairs Council - Ocean Education',
    '海洋委員會海洋教育',
    'Taiwan Ocean Affairs Council ocean education section providing local ocean education resources',
    '台灣海洋委員會海洋教育專區，提供本土海洋教育資源'
  ],
  [
    '環境教育終身學習網',
    'https://elearn.epa.gov.tw/',
    'teaching',
    'taiwan,epa,elearning,certification',
    'zh-TW',
    'Taiwan EPA environmental education platform',
    'Taiwan EPA Environmental Education Platform',
    '環境教育終身學習網',
    'Taiwan EPA environmental education learning platform with online courses and certification',
    '台灣環保署環境教育學習平台，提供線上課程與認證'
  ],
  [
    'Marine Conservation Institute',
    'https://marine-conservation.org/',
    'teaching',
    'conservation,mpa,science,advocacy',
    'en',
    'Marine conservation education',
    'Marine Conservation Institute',
    '海洋保育研究所',
    'Marine Conservation Institute providing conservation science and education resources',
    '海洋保育研究所，提供保育科學與教育資源'
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
