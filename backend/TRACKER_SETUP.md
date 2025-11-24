# Tracker API 快速設置指南

## 📋 已完成項目

✅ **服務層 (trackerApiService.js)**
- OpenAQ 空氣品質服務
- Open-Meteo 海洋氣象服務
- Global Plastic Watch 塑膠熱點服務
- PPP 淨灘活動服務
- LRU 快取機制（10 分鐘）

✅ **控制器 (trackerController.js)**
- 6 個 API endpoints
- 統一的錯誤處理
- 參數驗證

✅ **路由 (routes/tracker.js)**
- 完整的路由設定
- 已整合到 app.js

✅ **文檔 (docs/TRACKER_API.md)**
- 完整的 API 使用說明
- 前端範例程式碼
- 錯誤處理指南

---

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

已包含必要套件：
- `axios` - HTTP 請求
- `lru-cache` - 快取機制

### 2. 設定環境變數

複製 `.env.example` 為 `.env`：

```bash
cp .env.example .env
```

**必須設定的金鑰：**

```env
# OpenAQ API Key (必填)
OPENAQ_API_KEY=your-openaq-api-key-here
```

**如何取得 OpenAQ API Key：**

1. 前往 https://openaq.org/
2. 註冊帳號
3. 在 Dashboard 取得 API Key
4. 將 Key 複製到 `.env` 檔案

**選填的金鑰：**

```env
# FreeWebApi SST (如果要用進階 SST 功能)
FREEWEBAPI_SST_KEY=your-key-here
```

### 3. 啟動伺服器

```bash
npm run dev
```

伺服器會在 `http://localhost:3000` 啟動。

### 4. 測試 API

執行測試腳本：

```bash
node test-tracker-api.js
```

或用瀏覽器/Postman 測試：

```
http://localhost:3000/api/tracker/air-quality?lat=25.0478&lng=121.5170
```

---

## 📡 API Endpoints 總覽

| Endpoint | 用途 | 需要金鑰 |
|----------|------|---------|
| `/api/tracker/air-quality` | 空氣品質查詢 | ✅ OpenAQ |
| `/api/tracker/sst` | 海表溫度（點位） | ❌ |
| `/api/tracker/marine` | 完整海況資料 | ❌ |
| `/api/tracker/sst/grid` | SST 網格（地圖） | ⚠️ 開發中 |
| `/api/tracker/plastic-sites` | 塑膠廢棄物熱點 | ❌ |
| `/api/tracker/cleanups` | 淨灘活動資料 | ⚠️ 需調整 |

---

## 🛠️ 前端整合

### React 範例

```typescript
// src/services/trackerApi.ts
const API_BASE = 'http://localhost:3000/api/tracker';

export async function getAirQuality(lat: number, lng: number) {
  const response = await fetch(
    `${API_BASE}/air-quality?lat=${lat}&lng=${lng}`
  );
  return response.json();
}

export async function getSST(lat: number, lng: number) {
  const response = await fetch(
    `${API_BASE}/sst?lat=${lat}&lng=${lng}&past_days=3&forecast_days=4`
  );
  return response.json();
}
```

### 使用範例（Tracker 地圖）

```typescript
// 點擊地圖時載入環境資料
async function handleMapClick(lat: number, lng: number) {
  const [air, sst] = await Promise.all([
    getAirQuality(lat, lng),
    getSST(lat, lng)
  ]);
  
  displayTrackerPanel({
    airQuality: air.sources[0]?.value,
    seaTemp: sst.hourly[0]?.sea_surface_temperature_c
  });
}
```

---

## ⚙️ 進階配置

### 調整快取時間

編輯 `src/services/trackerApiService.js`：

```javascript
const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 10 // 改成你想要的分鐘數
});
```

### 調整 Rate Limiting

編輯 `.env`：

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 分鐘
RATE_LIMIT_MAX_REQUESTS=100  # 最多 100 次請求
```

---

## 🔍 除錯技巧

### 檢查 API 是否可用

```bash
curl http://localhost:3000/api/tracker/sst?lat=25&lng=122
```

### 查看快取狀態

在控制器中加入：

```javascript
console.log('Cache size:', cache.size);
```

### 測試 OpenAQ 連線

```bash
curl -H "X-API-Key: YOUR_KEY" \
  "https://api.openaq.org/v3/locations?limit=1"
```

---

## 📝 待完成項目

### 🔴 高優先級

1. **SST 網格資料同步**
   - 建立 NOAA 資料同步排程
   - 設計資料庫 schema（`sst_daily_tiles` 表）
   - 實作網格查詢邏輯

2. **PPP API 整合**
   - 確認 PPP 的實際 endpoint URL
   - 調整 `pppService.getCleanupEvents()`
   - 測試資料格式轉換

### 🟡 中優先級

3. **錯誤監控**
   - 加入 Sentry 或類似工具
   - 記錄失敗的 API 請求

4. **效能優化**
   - 考慮使用 Redis 替代 LRU Cache
   - 加入請求批次處理

### 🟢 低優先級

5. **單元測試**
   - 為每個服務寫測試
   - 使用 Jest + Supertest

6. **API 文檔自動生成**
   - 整合 Swagger/OpenAPI
   - 自動產生互動式文檔

---

## 🐛 常見問題

### Q: OpenAQ API 返回 401 錯誤

**A:** 檢查 `.env` 的 `OPENAQ_API_KEY` 是否正確設定，且已重新啟動伺服器。

### Q: 空氣品質查詢返回空資料

**A:** 該區域可能沒有測站，嘗試增加 `radius` 參數：

```
/api/tracker/air-quality?lat=25&lng=121&radius=50000
```

### Q: 海表溫度查詢很慢

**A:** Open-Meteo API 對陸地座標查詢較慢，確保使用海洋座標。

### Q: 快取沒有生效

**A:** 檢查是否每次請求的參數都不同（浮點數精度問題），可以在前端先做四捨五入。

---

## 📚 參考文件

- [完整 API 文檔](./docs/TRACKER_API.md)
- [OpenAQ API 文檔](https://docs.openaq.org/)
- [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api)
- [Global Plastic Watch](https://globalplasticwatch.org/)
- [PPP Data Hub](https://data.preventingplasticpollution.com/)

---

## 📞 支援

如有問題，請參考：

1. `docs/TRACKER_API.md` - 完整使用文檔
2. `test-tracker-api.js` - 測試腳本範例
3. 控制器程式碼 - `src/controllers/trackerController.js`
