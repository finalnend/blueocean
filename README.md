# Blue Earth Watch 🌍

追蹤污染、啟發氣候行動的環境教育網站

## 專案概述

Blue Earth Watch 是一個互動式環境教育平台，致力於提升大眾對海洋污染和氣候變遷的認識。本專案對應聯合國永續發展目標（SDGs）：

- **SDG 13**: 氣候行動（Climate Action）
- **SDG 14**: 保育海洋生態（Life Below Water）

## 核心功能

### 1. 🗺️ Tracker - 污染追蹤地圖
- 即時互動地圖顯示全球海洋塑膠污染熱點
- 時間序列資料視覺化
- 區域與類型篩選功能

### 2. 🎮 Simulator - 虛擬清理遊戲
- 2D 海洋清理遊戲體驗
- 分數與排行榜系統
- 結合真實數據的教育訊息

### 3. 📚 Resources - 教育資源
- 科學報告與開放資料集連結
- 課堂教學活動指南
- NGO 與社群行動連結

## 技術架構

### 前端
- **框架**: React 18 + Vite
- **UI**: Tailwind CSS
- **地圖**: Leaflet.js
- **圖表**: Chart.js / Recharts
- **狀態管理**: React Context / Zustand

### 後端
- **運行環境**: Node.js 18+
- **框架**: Express.js
- **資料庫**: SQLite (開發) / PostgreSQL (生產)
- **驗證**: JWT
- **API**: RESTful

### 資料來源
本專案使用**真實的科學研究數據**：
- **Our World in Data** - 基於同行評審的研究彙編
- **UNEP** - 聯合國環境規劃署報告
- **Copernicus** - 歐盟氣候變遷監測服務
- **OECD** - 經濟合作暨發展組織環境數據

**📊 數據真實性聲明**: 詳見 [backend/DATA_SOURCES.md](backend/DATA_SOURCES.md)

## 專案結構

```
blue-earth-watch/
├── frontend/                 # React 前端應用
│   ├── src/
│   │   ├── components/      # 共用元件
│   │   ├── pages/           # 頁面元件
│   │   ├── services/        # API 服務
│   │   ├── utils/           # 工具函數
│   │   └── App.jsx
│   ├── public/
│   └── package.json
├── backend/                  # Express 後端應用
│   ├── src/
│   │   ├── routes/          # API 路由
│   │   ├── controllers/     # 控制器
│   │   ├── models/          # 資料模型
│   │   ├── services/        # 業務邏輯
│   │   └── app.js
│   ├── database/            # 資料庫檔案與遷移
│   └── package.json
└── README.md
```

## 快速開始

### 環境需求
- Node.js 18.x 或更高版本
- npm 或 yarn
- Git

### 安裝步驟

1. **複製專案**
```bash
git clone https://github.com/your-username/blue-earth-watch.git
cd blue-earth-watch
```

2. **設置後端**
```bash
cd backend
npm install
cp .env.example .env
# 編輯 .env 檔案設定環境變數
npm run init-db
npm run dev
```

3. **設置前端**
```bash
cd frontend
npm install
npm run dev
```

4. **訪問應用**
- 前端: http://localhost:5173
- 後端 API: http://localhost:3000

## 開發指南

### 後端 API 端點

- `GET /api/pollution/summary` - 取得污染摘要
- `GET /api/pollution/map` - 取得地圖資料
- `GET /api/pollution/timeseries` - 取得時間序列
- `POST /api/game/score` - 提交遊戲分數
- `GET /api/game/leaderboard` - 取得排行榜
- `GET /api/resources` - 取得教育資源列表

### 前端頁面路由

- `/` - 首頁
- `/tracker` - 污染追蹤地圖
- `/simulator` - 虛擬清理遊戲
- `/resources` - 教育資源

## 測試

### 後端測試
```bash
cd backend
npm test
```

### 前端測試
```bash
cd frontend
npm test
```

## 部署

詳見各資料夾內的 README 檔案。

## 貢獻指南

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 授權

本專案採用 MIT 授權 - 詳見 LICENSE 檔案

## 聯絡方式

專案連結: [https://github.com/your-username/blue-earth-watch](https://github.com/your-username/blue-earth-watch)

## 致謝

- Our World in Data
- UNEP Global Plastic Watch
- Copernicus Climate Change Service
- 所有為海洋保育努力的組織與個人
