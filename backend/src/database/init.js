import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database/blue-earth-watch.db');

// 確保 database 目錄存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// 啟用外鍵約束
db.pragma('foreign_keys = ON');

console.log('🗄️  正在初始化資料庫...');

// 創建 Users 表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 創建 PollutionData 表
db.exec(`
  CREATE TABLE IF NOT EXISTS pollution_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    lat REAL,
    lng REAL,
    value REAL NOT NULL,
    unit VARCHAR(50),
    recorded_at DATE NOT NULL,
    meta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 為地理查詢建立索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_pollution_location 
  ON pollution_data(lat, lng);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_pollution_type_date 
  ON pollution_data(type, recorded_at);
`);

// 創建 GameScore 表
db.exec(`
  CREATE TABLE IF NOT EXISTS game_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    nickname VARCHAR(50),
    score INTEGER NOT NULL,
    cleanup_rate REAL,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_game_score 
  ON game_scores(score DESC, created_at DESC);
`);

// 創建 ResourceLink 表
db.exec(`
  CREATE TABLE IF NOT EXISTS resource_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    tags VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    description TEXT,
    added_by VARCHAR(50),
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_resource_type 
  ON resource_links(type);
`);

// 創建資料快取表（用於儲存從外部 API 取得的資料）
db.exec(`
  CREATE TABLE IF NOT EXISTS data_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_cache_key_expires 
  ON data_cache(cache_key, expires_at);
`);

console.log('✅ 資料庫初始化完成！');
console.log(`📍 資料庫位置: ${dbPath}`);

db.close();
