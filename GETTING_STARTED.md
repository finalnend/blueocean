# Blue Earth Watch - 快速啟動指南

## 系統需求

- Node.js 18.x 或更高版本
- npm 或 yarn
- Windows / macOS / Linux

## 完整安裝步驟

### 1. 安裝後端

```bash
# 進入後端目錄
cd backend

# 安裝依賴
npm install

# 複製環境變數範例檔案
cp .env.example .env

# 初始化資料庫
npm run init-db

# 植入範例資料
npm run seed

# 啟動後端伺服器
npm run dev
```

後端將在 http://localhost:3000 啟動。

### 2. 安裝前端

開啟新的終端視窗：

```bash
# 進入前端目錄
cd frontend

# 安裝依賴
npm install

# 啟動前端開發伺服器
npm run dev
```

前端將在 http://localhost:5173 啟動。

### 3. 訪問應用

在瀏覽器中開啟：http://localhost:5173

## 開發工作流程

### 後端開發

```bash
cd backend

# 開發模式（自動重啟）
npm run dev

# 重新初始化資料庫
npm run init-db

# 重新植入資料
npm run seed
```

### 前端開發

```bash
cd frontend

# 開發模式
npm run dev

# 建置生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 測試 API

### 使用 curl 測試

```bash
# 健康檢查
curl http://localhost:3000/health

# 取得污染摘要
curl "http://localhost:3000/api/pollution/summary?type=plastic&region=global"

# 取得地圖資料
curl "http://localhost:3000/api/pollution/map?type=plastic"

# 取得排行榜
curl "http://localhost:3000/api/game/leaderboard?period=week&limit=10"

# 取得教育資源
curl "http://localhost:3000/api/resources"
```

### 使用 Postman 或 Thunder Client

導入以下 API 端點進行測試：

**污染資料 API**
- GET http://localhost:3000/api/pollution/summary
- GET http://localhost:3000/api/pollution/map
- GET http://localhost:3000/api/pollution/timeseries

**遊戲 API**
- POST http://localhost:3000/api/game/score
- GET http://localhost:3000/api/game/leaderboard
- GET http://localhost:3000/api/game/stats

**資源 API**
- GET http://localhost:3000/api/resources
- GET http://localhost:3000/api/resources/types

## 常見問題排除

### 後端無法啟動

1. 確認 Node.js 版本：
```bash
node --version  # 應該 >= 18.0.0
```

2. 確認資料庫已初始化：
```bash
cd backend
npm run init-db
```

3. 檢查 .env 檔案是否存在

### 前端無法連接後端

1. 確認後端已啟動並運行在 port 3000
2. 檢查 Vite 的 proxy 設定（vite.config.js）
3. 檢查瀏覽器控制台的錯誤訊息

### 地圖無法顯示

1. 確認有網路連線（需要載入 OpenStreetMap 圖磚）
2. 檢查 Leaflet CSS 是否正確載入
3. 確認 API 有回傳地圖資料

### 資料庫錯誤

如果遇到資料庫錯誤，可以重新初始化：

```bash
cd backend
# 刪除舊資料庫（Windows）
Remove-Item database\blue-earth-watch.db
# 重新初始化
npm run init-db
npm run seed
```

## 下一步

### 功能增強建議

1. **Tracker 頁面**
   - 實作圖表元件（Chart.js 或 Recharts）
   - 加入時間範圍選擇器
   - 實作熱力圖視覺化

2. **Simulator 遊戲**
   - 完成 Canvas 遊戲邏輯
   - 實作碰撞檢測
   - 加入音效與動畫
   - 增加多個關卡

3. **外部資料整合**
   - 申請 UNEP API 金鑰
   - 實作 Copernicus API 串接
   - 設定定時任務自動更新資料

4. **使用者系統**
   - 實作註冊與登入
   - JWT 驗證
   - 個人檔案頁面

5. **進階功能**
   - 多語言支援（i18n）
   - 深色模式
   - PWA 支援
   - 社群分享功能

## 資源連結

- [專案 GitHub](https://github.com/your-username/blue-earth-watch)
- [React 官方文件](https://react.dev/)
- [Vite 官方文件](https://vitejs.dev/)
- [Express 官方文件](https://expressjs.com/)
- [Leaflet 官方文件](https://leafletjs.com/)
- [Tailwind CSS 官方文件](https://tailwindcss.com/)

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License
