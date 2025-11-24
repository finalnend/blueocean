# Blue Earth Watch - Backend API

Node.js + Express 後端 API 服務

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env` 檔案並設定必要的環境變數。

### 3. 初始化資料庫

```bash
npm run init-db
```

### 4. 植入種子資料（可選）

```bash
npm run seed
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

伺服器將在 http://localhost:3000 啟動。

## API 端點

### 污染資料 API

- `GET /api/pollution/summary` - 取得污染摘要
  - Query 參數: `region`, `type`, `year`
  
- `GET /api/pollution/map` - 取得地圖資料
  - Query 參數: `type`, `from`, `to`, `bbox`
  
- `GET /api/pollution/timeseries` - 取得時間序列
  - Query 參數: `type`, `region`, `lat`, `lng`, `radius`
  
- `GET /api/pollution/types` - 取得污染類型列表

### 遊戲 API

- `POST /api/game/score` - 提交遊戲分數
  - Body: `{ nickname, score, cleanup_rate, duration }`
  
- `GET /api/game/leaderboard` - 取得排行榜
  - Query 參數: `period` (all/week/day), `limit`
  
- `GET /api/game/stats` - 取得遊戲統計
  
- `GET /api/game/personal/:nickname` - 取得個人最佳紀錄

### 資源 API

- `GET /api/resources` - 取得資源列表
  - Query 參數: `type`, `tag`, `language`, `search`
  
- `GET /api/resources/:id` - 取得單一資源
  
- `GET /api/resources/types` - 取得資源類型
  
- `GET /api/resources/tags` - 取得熱門標籤
  
- `POST /api/resources` - 新增資源（需要權限）

### 健康檢查

- `GET /health` - 伺服器健康狀態

## 專案結構

```
backend/
├── src/
│   ├── routes/          # API 路由
│   ├── controllers/     # 控制器
│   ├── models/          # 資料模型
│   ├── services/        # 業務邏輯與外部服務
│   ├── middleware/      # 中介層
│   ├── utils/           # 工具函數
│   ├── database/        # 資料庫設定與遷移
│   └── app.js           # 主應用程式
├── database/            # SQLite 資料庫檔案
├── package.json
└── .env
```

## 資料庫架構

### users
使用者資料表

### pollution_data
污染資料表，儲存從各種來源收集的污染數據

### game_scores
遊戲分數表

### resource_links
教育資源連結表

### data_cache
快取表，儲存從外部 API 取得的資料

## 外部資料整合

專案整合以下資料源：

1. **Our World in Data** - 全球塑膠污染數據
2. **UNEP Global Plastic Watch** - 聯合國環境署塑膠監測
3. **Copernicus Climate Data** - 歐盟氣候變遷資料

詳見 `src/services/externalDataService.js`

## 開發指令

- `npm run dev` - 啟動開發伺服器（使用 nodemon）
- `npm start` - 啟動生產伺服器
- `npm run init-db` - 初始化資料庫
- `npm run seed` - 植入種子資料
- `npm test` - 執行測試

## 注意事項

1. 確保 Node.js 版本 >= 18
2. 開發環境使用 SQLite，生產環境建議使用 PostgreSQL
3. API 有 rate limiting 保護，預設 15 分鐘 100 次請求
4. 外部 API 資料會快取以減少請求次數

## 授權

MIT
