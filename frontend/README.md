# Blue Earth Watch - Frontend

React + Vite 前端應用

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動開發伺服器

```bash
npm run dev
```

應用將在 http://localhost:5173 啟動。

### 3. 建置生產版本

```bash
npm run build
```

## 專案結構

```
frontend/
├── src/
│   ├── components/      # 共用元件
│   │   ├── Navbar.jsx
│   │   └── Footer.jsx
│   ├── pages/           # 頁面元件
│   │   ├── HomePage.jsx
│   │   ├── TrackerPage.jsx
│   │   ├── SimulatorPage.jsx
│   │   └── ResourcesPage.jsx
│   ├── services/        # API 服務
│   │   ├── api.js
│   │   ├── pollutionService.js
│   │   ├── gameService.js
│   │   └── resourceService.js
│   ├── utils/           # 工具函數
│   ├── styles/          # 樣式檔案
│   │   └── index.css
│   ├── App.jsx          # 主應用程式元件
│   └── main.jsx         # 應用入口
├── public/              # 靜態資源
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 技術棧

- **React 18** - UI 框架
- **Vite** - 建置工具
- **React Router** - 路由管理
- **Tailwind CSS** - CSS 框架
- **Leaflet** - 地圖元件
- **Chart.js** - 圖表元件
- **Axios** - HTTP 客戶端
- **Zustand** - 狀態管理（可選）

## 主要功能

### 1. 首頁 (HomePage)
- 專案介紹
- 全球污染統計
- 功能導覽
- SDGs 說明

### 2. 污染追蹤 (TrackerPage)
- 互動式 Leaflet 地圖
- 污染資料視覺化
- 篩選與搜尋功能
- 時間序列圖表

### 3. 清理遊戲 (SimulatorPage)
- Canvas 遊戲畫面
- 即時排行榜
- 分數提交系統
- 教育訊息展示

### 4. 教育資源 (ResourcesPage)
- 資源列表與篩選
- 分類與標籤系統
- 搜尋功能
- 外部連結

## 開發指令

- `npm run dev` - 啟動開發伺服器
- `npm run build` - 建置生產版本
- `npm run preview` - 預覽生產版本
- `npm run lint` - 執行 ESLint

## 環境變數

在根目錄建立 `.env` 檔案：

```env
VITE_API_URL=http://localhost:3000
```

## 樣式指南

專案使用 Tailwind CSS，並自訂了以下顏色主題：

- **ocean-blue**: 主要藍色系（海洋）
- **earth-green**: 輔助綠色系（地球）

共用樣式類別：
- `.card` - 卡片元件
- `.btn-primary` - 主要按鈕
- `.btn-secondary` - 次要按鈕
- `.btn-outline` - 外框按鈕

## 瀏覽器支援

- Chrome (最新)
- Firefox (最新)
- Safari (最新)
- Edge (最新)

## 注意事項

1. 確保後端 API 已啟動並運行在 http://localhost:3000
2. Leaflet 地圖需要網路連線以載入地圖圖磚
3. 遊戲功能目前為骨架，需進一步實作 Canvas 繪製邏輯

## 授權

MIT
