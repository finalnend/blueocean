/**
 * 資源 i18n 遷移腳本
 * 為 resource_links 表添加多語言支援欄位
 * 執行: node src/scripts/migrateResourcesI18n.js
 */
import getDatabase from '../database/db.js';

const db = getDatabase();

console.log('🔄 正在遷移資源表以支援 i18n...');

// 檢查欄位是否已存在
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
  } else {
    console.log(`  ✓ 欄位已存在: ${col.name}`);
  }
}

// 將現有資料遷移到新欄位
console.log('📦 遷移現有資料...');
const updateStmt = db.prepare(`
  UPDATE resource_links 
  SET title_en = CASE WHEN language = 'en' THEN title ELSE title_en END,
      title_zh = CASE WHEN language IN ('zh', 'zh-TW', 'zh-CN') THEN title ELSE title_zh END,
      description_en = CASE WHEN language = 'en' THEN description ELSE description_en END,
      description_zh = CASE WHEN language IN ('zh', 'zh-TW', 'zh-CN') THEN description ELSE description_zh END
  WHERE title_en IS NULL OR title_zh IS NULL
`);
updateStmt.run();

console.log('✅ 資源表 i18n 遷移完成！');

db.close();
