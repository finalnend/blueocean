# Tracker API 前端整合完成

## ✅ 已完成的整合

### 1. 服務層 (`src/services/trackerService.js`)

建立了完整的前端 API 服務，包含：

- **基本查詢功能**
  - `getAirQuality()` - 空氣品質
  - `getSST()` - 海表溫度
  - `getMarineWeather()` - 海面天氣
  - `getPlasticSites()` - 塑膠熱點
  - `getCleanupEvents()` - 淨灘活動
  - `getSSTGrid()` - SST 網格

- **批次查詢功能**
  - `getLocationEnvironmentData()` - 單點完整環境資料
  - `getMapAreaData()` - 地圖範圍資料

- **輔助函數**
  - `getAirQualityLevel()` - 空氣品質等級判定
  - `getSSTWarning()` - 海表溫度警示
  - `getCoordinatesFromMapEvent()` - 地圖事件座標轉換

### 2. UI 組件 (`src/components/EnvironmentInfoPanel.jsx`)

建立了環境資訊顯示面板：

- 📍 **位置資訊顯示**
- 🌫️ **空氣品質卡片**
  - 自動判定等級（良好/中等/不健康/危險）
  - 顏色標示
  - 詳細資訊（測站名稱、國家、更新時間）
  
- 🌊 **海洋環境卡片**
  - 海表溫度顯示
  - 浪高資訊
  - 溫度警示
  - 24 小時趨勢圖

- 🌬️ **海面狀況**
  - 洋流速度

- ⚠️ **錯誤處理**
  - 優雅的錯誤提示

### 3. Tracker 頁面更新 (`src/pages/TrackerPage.jsx`)

整合了新的環境資料功能：

- **地圖點擊互動**
  - 點擊地圖任意位置
  - 自動查詢該位置的環境資料
  - 在右側面板顯示詳細資訊

- **響應式佈局**
  - 桌面版：地圖 2/3 + 面板 1/3
  - 可切換顯示/隱藏環境資訊面板

- **保留原有功能**
  - 污染資料顯示
  - 時間序列圖表
  - 區域篩選

---

## 🎯 使用方式

### 啟動後端（必須）

```bash
cd backend
npm run dev
```

確保後端運行在 `http://localhost:3000`（或你設定的 PORT）

### 啟動前端

```bash
cd frontend
npm run dev
```

### 設定環境變數

編輯 `frontend/.env`：

```env
VITE_API_URL=http://localhost:3000
```

### 測試功能

1. 開啟瀏覽器，前往 Tracker 頁面
2. 點擊右上角「顯示環境資訊」按鈕
3. 點擊地圖上的任意位置
4. 查看右側面板的環境資料

---

## 📸 功能展示

### 地圖點擊查詢流程

```
使用者點擊地圖
    ↓
取得點擊座標 (lat, lng)
    ↓
並行查詢三個 API:
  - 空氣品質 (OpenAQ)
  - 海表溫度 (Open-Meteo Marine)
  - 海面天氣 (Open-Meteo Marine)
    ↓
顯示在環境資訊面板
```

### 資料顯示範例

**空氣品質卡片：**
```
🌫️ 空氣品質
─────────────────
台北測站                [良好]
PM2.5: 15.3 µg/m³
國家: TW
更新時間: 2025-11-16 16:00
💡 空氣品質令人滿意
```

**海洋環境卡片：**
```
🌊 海洋環境
─────────────────
海表溫度
27.4°C          🌡️

浪高
1.2 m           🌊

溫度趨勢 (近 24 小時)
[簡易趨勢圖]
```

---

## 🔧 自訂與擴充

### 修改查詢參數

編輯 `src/services/trackerService.js`：

```javascript
// 修改搜尋半徑（預設 10km）
export async function getAirQuality(lat, lng, options = {}) {
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
    radius: options.radius || 20000, // 改成 20km
    parameter: options.parameter || 'pm25'
  });
  // ...
}
```

### 新增其他污染物

在 `EnvironmentInfoPanel.jsx` 中：

```javascript
// 目前支援的污染物
const parameters = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];

// 可以加入切換按鈕
<select onChange={(e) => setParameter(e.target.value)}>
  <option value="pm25">PM2.5</option>
  <option value="pm10">PM10</option>
  <option value="o3">臭氧</option>
</select>
```

### 加入塑膠熱點標記

在 `TrackerPage.jsx` 中：

```javascript
// 載入地圖範圍資料
useEffect(() => {
  const map = mapRef.current;
  if (map) {
    const bounds = map.getBounds();
    getMapAreaData(bounds).then(data => {
      // 在地圖上標記塑膠熱點
      data.plasticSites.sites.forEach(site => {
        L.marker([site.coordinates.lat, site.coordinates.lng])
          .bindPopup(`塑膠熱點<br>面積: ${site.area_m2}m²`)
          .addTo(map);
      });
    });
  }
}, []);
```

---

## 🐛 疑難排解

### 問題 1：點擊地圖沒有反應

**解決方法：**
1. 檢查瀏覽器 Console 是否有錯誤
2. 確認後端服務已啟動
3. 檢查 CORS 設定（後端 `.env` 的 `CORS_ORIGIN`）

### 問題 2：顯示「部分資料載入失敗」

**可能原因：**
- OpenAQ API Key 未設定或無效
- 該座標附近沒有測站（海洋區域通常沒有空氣品質測站）
- 網路問題

**解決方法：**
1. 檢查後端 `.env` 的 `OPENAQ_API_KEY`
2. 嘗試點擊陸地區域（如台北、東京、倫敦）
3. 查看後端 Console 的錯誤訊息

### 問題 3：海表溫度資料為空

**可能原因：**
- 點擊了陸地座標（Open-Meteo Marine 只支援海洋）
- API 暫時無法使用

**解決方法：**
1. 點擊海洋區域測試
2. 檢查後端是否能正常連接 Open-Meteo API

---

## 📊 API 呼叫統計

每次點擊地圖會觸發：

| API | 用途 | 快取 | 回應時間 |
|-----|------|------|---------|
| `/api/tracker/air-quality` | 空氣品質 | 10 分鐘 | ~1-2 秒 |
| `/api/tracker/sst` | 海表溫度 | 10 分鐘 | ~1-2 秒 |
| `/api/tracker/marine` | 海面天氣 | 10 分鐘 | ~1-2 秒 |

**總計**：並行查詢，總時間約 1-2 秒（取決於最慢的 API）

---

## 🚀 效能優化建議

### 1. 前端防抖動

避免使用者快速點擊造成大量請求：

```javascript
import { debounce } from 'lodash';

const handleMapClick = debounce(async (event) => {
  // 原有邏輯
}, 500); // 500ms 內只處理一次
```

### 2. 座標四捨五入

減少不必要的重複查詢：

```javascript
lat: lat.toFixed(2), // 改成 2 位小數（約 1km 精度）
lng: lng.toFixed(2)
```

### 3. 失敗重試

網路不穩定時自動重試：

```javascript
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## 📝 下一步建議

### 🔴 優先級 1

1. **取得 OpenAQ API Key**
   - 前往 https://openaq.org/ 註冊
   - 設定到後端 `.env`

2. **測試完整功能**
   - 點擊台灣、日本等地測試空氣品質
   - 點擊太平洋測試海洋資料

### 🟡 優先級 2

3. **加入塑膠熱點顯示**
   - 使用 `getMapAreaData()` 取得範圍內的塑膠熱點
   - 在地圖上標記紅色圖釘

4. **加入淨灘活動標記**
   - 顯示附近的淨灘活動
   - 點擊顯示活動詳情

### 🟢 優先級 3

5. **美化 UI**
   - 加入動畫效果
   - 改善 RWD 顯示
   - 自訂地圖樣式

6. **加入更多功能**
   - 收藏常用位置
   - 匯出環境報告
   - 分享功能

---

## ✨ 完成總結

你現在擁有：

✅ 完整的前端 Tracker API 服務  
✅ 互動式地圖點擊查詢  
✅ 美觀的環境資訊面板  
✅ 響應式佈局設計  
✅ 完整的錯誤處理  

**立即體驗**：
1. 啟動後端與前端
2. 前往 Tracker 頁面
3. 點擊「顯示環境資訊」
4. 點擊地圖任意位置查看環境資料

祝使用愉快！🌍✨
