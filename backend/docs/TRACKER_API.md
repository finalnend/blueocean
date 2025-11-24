# Tracker API 使用指南

## 概述

Tracker API 整合了多個外部環境監測資料源，為前端提供統一的介面：

- **OpenAQ**：空氣品質監測
- **Open-Meteo Marine**：海表溫度與海況
- **Global Plastic Watch**：塑膠廢棄物熱點
- **Preventing Plastic Pollution**：淨灘活動資料

所有 API 都包含 10 分鐘快取機制，減少外部 API 請求次數。

---

## API Endpoints

### 1. 空氣品質查詢

**Endpoint:** `GET /api/tracker/air-quality`

**用途：** 查詢指定座標附近的空氣品質測站與數值

**參數：**
- `lat` (必填): 緯度
- `lng` (必填): 經度
- `radius` (可選): 搜尋半徑（公尺，預設 10000）
- `parameter` (可選): 污染物類型，預設 `pm25`
  - 可選值：`pm25`, `pm10`, `o3`, `no2`, `so2`, `co`

**回應範例：**
```json
{
  "success": true,
  "parameter": "pm25",
  "unit": "µg/m³",
  "sources": [
    {
      "locationId": 8118,
      "name": "Taipei Station",
      "country": "TW",
      "coordinates": { "lat": 25.0478, "lng": 121.5170 },
      "value": 25.3,
      "datetime_utc": "2025-11-16T08:00:00Z"
    }
  ]
}
```

**前端使用範例：**
```typescript
async function loadAirQuality(lat: number, lng: number) {
  const response = await fetch(
    `/api/tracker/air-quality?lat=${lat}&lng=${lng}&parameter=pm25`
  );
  const data = await response.json();
  return data;
}
```

---

### 2. 海表溫度（點位查詢）

**Endpoint:** `GET /api/tracker/sst`

**用途：** 查詢指定座標的海表溫度時序資料（含歷史與預報）

**參數：**
- `lat` (必填): 緯度
- `lng` (必填): 經度
- `past_days` (可選): 查詢過去幾天，預設 3
- `forecast_days` (可選): 預報未來幾天，預設 4

**回應範例：**
```json
{
  "success": true,
  "location": { "lat": 25.0, "lng": 122.0 },
  "hourly": [
    {
      "time": "2025-11-13T00:00:00Z",
      "sea_surface_temperature_c": 27.4,
      "wave_height_m": 1.2
    },
    {
      "time": "2025-11-13T01:00:00Z",
      "sea_surface_temperature_c": 27.3,
      "wave_height_m": 1.3
    }
  ]
}
```

**前端使用範例：**
```typescript
async function loadSST(lat: number, lng: number) {
  const response = await fetch(
    `/api/tracker/sst?lat=${lat}&lng=${lng}&past_days=3&forecast_days=4`
  );
  const data = await response.json();
  
  // 繪製溫度趨勢圖
  const temps = data.hourly.map(h => ({
    time: new Date(h.time),
    value: h.sea_surface_temperature_c
  }));
  return temps;
}
```

---

### 3. 海面天氣（完整海況）

**Endpoint:** `GET /api/tracker/marine`

**用途：** 查詢指定座標的完整海況資料（SST、浪高、洋流等）

**參數：** 與 `/api/tracker/sst` 相同

**回應範例：**
```json
{
  "success": true,
  "location": { "lat": 25.0, "lng": 122.0 },
  "hourly": [
    {
      "time": "2025-11-13T00:00:00Z",
      "sea_surface_temperature_c": 27.4,
      "wave_height_m": 1.2,
      "ocean_current_velocity_ms": 0.35
    }
  ]
}
```

---

### 4. SST 網格資料（地圖圖層）

**Endpoint:** `GET /api/tracker/sst/grid`

**用途：** 取得大範圍的 SST 網格資料，用於地圖熱力圖渲染

**參數：**
- `bbox` (必填): 地理範圍 `minLon,minLat,maxLon,maxLat`
- `date` (可選): ISO 日期格式 (YYYY-MM-DD)，預設今天

**回應範例：**
```json
{
  "success": true,
  "date": "2025-11-16",
  "grid": {
    "cellSizeDeg": 1,
    "cells": [
      { "lat": 24.5, "lng": 121.5, "sst_c": 26.8 },
      { "lat": 24.5, "lng": 122.5, "sst_c": 27.1 }
    ]
  }
}
```

**前端使用範例（Leaflet Heatmap）：**
```typescript
async function loadSSTGrid(bounds: L.LatLngBounds) {
  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth()
  ].join(',');
  
  const response = await fetch(`/api/tracker/sst/grid?bbox=${bbox}`);
  const data = await response.json();
  
  // 轉換為 heatmap 資料格式
  const heatData = data.grid.cells.map(cell => [
    cell.lat,
    cell.lng,
    cell.sst_c / 30 // 正規化到 0-1
  ]);
  
  return heatData;
}
```

---

### 5. 塑膠廢棄物熱點

**Endpoint:** `GET /api/tracker/plastic-sites`

**用途：** 查詢指定範圍內的塑膠廢棄物堆放地點

**參數：**
- `bbox` (必填): 地理範圍 `minLon,minLat,maxLon,maxLat`
- `min_area` (可選): 最小面積（平方公尺），預設 0

**回應範例：**
```json
{
  "success": true,
  "bbox": [120, 22, 125, 26],
  "sites": [
    {
      "id": "gpw-123",
      "coordinates": { "lat": 23.5, "lng": 121.0 },
      "area_m2": 15000,
      "country": "TW",
      "confidence": 0.93,
      "last_updated": "2025-10-01"
    }
  ]
}
```

**前端使用範例（Leaflet Markers）：**
```typescript
async function loadPlasticSites(bounds: L.LatLngBounds) {
  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth()
  ].join(',');
  
  const response = await fetch(
    `/api/tracker/plastic-sites?bbox=${bbox}&min_area=1000`
  );
  const data = await response.json();
  
  // 在地圖上標記熱點
  data.sites.forEach(site => {
    L.marker([site.coordinates.lat, site.coordinates.lng], {
      icon: plasticIcon
    })
    .bindPopup(`
      <b>塑膠廢棄物場址</b><br>
      面積: ${(site.area_m2 / 1000).toFixed(1)} k㎡<br>
      信心度: ${(site.confidence * 100).toFixed(0)}%
    `)
    .addTo(map);
  });
}
```

---

### 6. 淨灘活動資料

**Endpoint:** `GET /api/tracker/cleanups`

**用途：** 查詢指定範圍與時間的淨灘活動記錄

**參數：**
- `bbox` (必填): 地理範圍 `minLon,minLat,maxLon,maxLat`
- `from` (可選): 開始日期 (YYYY-MM-DD)
- `to` (可選): 結束日期 (YYYY-MM-DD)
- `limit` (可選): 最多返回幾筆，預設 200

**回應範例：**
```json
{
  "success": true,
  "bbox": [120, 22, 125, 26],
  "events": [
    {
      "id": "ppp-ev-001",
      "name": "Tamsui River Cleanup",
      "coordinates": { "lat": 25.1745, "lng": 121.4419 },
      "date": "2024-06-12",
      "items_collected": 1340,
      "plastic_items": 980
    }
  ]
}
```

**前端使用範例（遊戲結束對照）：**
```typescript
async function compareCleanupResult(userScore: number) {
  const response = await fetch(
    `/api/tracker/cleanups?bbox=120,22,125,26&limit=50`
  );
  const data = await response.json();
  
  // 找出與玩家分數相近的淨灘活動
  const similar = data.events.find(
    event => Math.abs(event.items_collected - userScore) < 100
  );
  
  return {
    message: `你清除的垃圾量相當於 ${similar?.name} 的成果！`,
    items: similar?.items_collected
  };
}
```

---

## 批次查詢範例

前端可同時查詢多個 API 以獲得完整環境資訊：

```typescript
async function loadTrackerData(lat: number, lng: number) {
  const [airQuality, sst, plasticSites] = await Promise.all([
    fetch(`/api/tracker/air-quality?lat=${lat}&lng=${lng}`).then(r => r.json()),
    fetch(`/api/tracker/sst?lat=${lat}&lng=${lng}`).then(r => r.json()),
    fetch(`/api/tracker/plastic-sites?bbox=${lng-0.5},${lat-0.5},${lng+0.5},${lat+0.5}`).then(r => r.json())
  ]);

  return {
    air: airQuality,
    ocean: sst,
    plastic: plasticSites
  };
}
```

---

## 錯誤處理

所有 API 在失敗時會返回統一格式：

```json
{
  "success": false,
  "error": "錯誤訊息"
}
```

HTTP 狀態碼：
- `200` - 成功
- `400` - 參數錯誤
- `500` - 伺服器錯誤

建議前端處理方式：

```typescript
async function safeApiCall(url: string) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      console.error('API Error:', data.error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Network Error:', error);
    return null;
  }
}
```

---

## 注意事項

1. **API Key 配置**
   - 需在 `.env` 設定 `OPENAQ_API_KEY`
   - 其他 API（Open-Meteo）無需金鑰

2. **快取機制**
   - 所有資料快取 10 分鐘
   - 相同參數的重複請求會直接返回快取

3. **Rate Limiting**
   - 全域限制：15 分鐘內最多 100 次請求
   - 建議前端實作 debounce/throttle

4. **座標格式**
   - 緯度範圍：-90 ~ 90
   - 經度範圍：-180 ~ 180
   - bbox 格式：`minLon,minLat,maxLon,maxLat`

5. **開發中功能**
   - `/api/tracker/sst/grid` 需配合 NOAA 資料同步排程
   - `/api/tracker/cleanups` 的 PPP endpoint 需根據實際 API 調整
