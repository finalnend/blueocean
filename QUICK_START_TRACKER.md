# Blue Earth Watch - Tracker API 快速測試指南

## 🚀 5 分鐘快速啟動

### 步驟 1：取得 OpenAQ API Key（2 分鐘）

1. 前往 https://openaq.org/
2. 點擊右上角「Sign Up」註冊帳號
3. 註冊後前往 Dashboard
4. 複製你的 API Key

### 步驟 2：設定後端（1 分鐘）

```bash
# 進入後端目錄
cd backend

# 複製環境變數範本
cp .env.example .env

# 編輯 .env，加入你的 API Key
# OPENAQ_API_KEY=your_actual_api_key_here
```

Windows 使用者可以用記事本開啟 `.env` 檔案：

```bash
notepad .env
```

### 步驟 3：啟動服務（2 分鐘）

**終端機 1 - 啟動後端：**

```bash
cd backend
npm install  # 第一次需要
npm run dev
```

等待看到：
```
╔═══════════════════════════════════════════╗
║   Blue Earth Watch API Server 🌍          ║
║   Port: 3000                              ║
╚═══════════════════════════════════════════╝
```

**終端機 2 - 啟動前端：**

```bash
cd frontend
npm install  # 第一次需要
npm run dev
```

等待看到：
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## 🧪 測試功能

### 1. 基本測試（後端）

開啟瀏覽器前往：

```
http://localhost:3000/api/tracker/sst?lat=25&lng=122
```

應該看到 JSON 回應：

```json
{
  "success": true,
  "location": { "lat": 25, "lng": 122 },
  "hourly": [...]
}
```

✅ **成功** → 後端正常運作  
❌ **失敗** → 檢查後端 Console 錯誤訊息

### 2. 前端整合測試

1. 開啟 http://localhost:5173/
2. 點擊導航列的「Tracker」
3. 點擊右上角「顯示環境資訊」按鈕
4. 點擊地圖上的**台北**（約 25.0°N, 121.5°E）

**預期結果：**

右側面板應該顯示：
- 📍 查詢位置（緯度、經度）
- 🌫️ 空氣品質（台北測站資料）
- 🌊 海洋環境（可能為空，因為是陸地）

### 3. 海洋資料測試

點擊地圖上的**太平洋**（約 25.0°N, 140.0°E）

**預期結果：**

- 📍 查詢位置
- 🌫️ 空氣品質（可能為空，海洋區域通常沒測站）
- 🌊 海洋環境（應該有海表溫度與浪高資料）

---

## ✅ 測試檢查清單

| 功能 | 測試方式 | 預期結果 | 狀態 |
|------|---------|---------|------|
| 後端啟動 | `npm run dev` | 顯示啟動訊息 | ☐ |
| 前端啟動 | `npm run dev` | Vite 啟動訊息 | ☐ |
| SST API | 瀏覽器測試 | JSON 回應 | ☐ |
| 地圖顯示 | 前往 Tracker 頁面 | 地圖正常顯示 | ☐ |
| 點擊功能 | 點擊地圖 | 右側顯示資料 | ☐ |
| 空氣品質 | 點擊台北 | 顯示 PM2.5 數據 | ☐ |
| 海洋資料 | 點擊太平洋 | 顯示海表溫度 | ☐ |

---

## 🐛 常見問題速查

### Q1: 後端啟動失敗

**錯誤訊息：** `Error: Cannot find module`

**解決方法：**
```bash
cd backend
rm -rf node_modules
npm install
npm run dev
```

### Q2: 前端無法連接後端

**錯誤訊息：** `Network Error` 或 `CORS Error`

**解決方法：**

1. 檢查 `backend/.env` 的 `CORS_ORIGIN`：
   ```env
   CORS_ORIGIN=http://localhost:5173
   ```

2. 檢查 `frontend/.env` 的 `VITE_API_URL`：
   ```env
   VITE_API_URL=http://localhost:3000
   ```

3. 重新啟動兩個服務

### Q3: 空氣品質顯示「載入失敗」

**可能原因：**
- OpenAQ API Key 無效
- 該區域沒有測站

**解決方法：**

1. 檢查後端 Console 是否有錯誤
2. 測試台北、東京、倫敦等大城市
3. 驗證 API Key：
   ```bash
   curl -H "X-API-Key: YOUR_KEY" \
     "https://api.openaq.org/v3/locations?limit=1"
   ```

### Q4: 海表溫度顯示為空

**可能原因：**
- 點擊了陸地座標

**解決方法：**
- 點擊海洋區域（太平洋、大西洋等）

---

## 📸 成功截圖參考

### 後端啟動成功

```
╔═══════════════════════════════════════════╗
║   Blue Earth Watch API Server 🌍          ║
║                                           ║
║   Port: 3000                              ║
║   Environment: development                ║
║                                           ║
║   API Base: http://localhost:3000/api    ║
╚═══════════════════════════════════════════╝
```

### 前端顯示成功

```
┌─────────────────────────────────┐
│  Blue Earth Watch               │
│  [Home] [Tracker] [Simulator]  │
└─────────────────────────────────┘

       [顯示環境資訊]

┌──────────────┬──────────┐
│              │ 📍 位置  │
│   🌍 地圖    │ 25.0°N   │
│              │ 121.5°E  │
│              │          │
│              │ 🌫️ 空氣  │
│              │ PM2.5:   │
│              │ 15.3 µg/m³│
└──────────────┴──────────┘
```

---

## 🎯 推薦測試座標

| 位置 | 緯度 | 經度 | 測試目的 |
|------|------|------|---------|
| 台北 | 25.0478 | 121.5170 | 空氣品質 ✅ |
| 東京 | 35.6762 | 139.6503 | 空氣品質 ✅ |
| 倫敦 | 51.5074 | -0.1278 | 空氣品質 ✅ |
| 太平洋 | 25.0 | 140.0 | 海洋資料 ✅ |
| 地中海 | 35.0 | 18.0 | 海洋資料 ✅ |

---

## 📝 下一步

測試成功後，你可以：

1. **閱讀完整文檔**
   - `backend/TRACKER_SETUP.md` - 後端詳細說明
   - `backend/docs/TRACKER_API.md` - API 使用指南
   - `frontend/TRACKER_INTEGRATION.md` - 前端整合說明

2. **進階功能**
   - 加入塑膠熱點標記
   - 顯示淨灘活動
   - 自訂地圖樣式

3. **優化與部署**
   - 效能優化
   - 生產環境設定
   - 部署到雲端

---

## 🆘 需要幫助？

**檢查清單：**

- [ ] 後端 `.env` 已設定 `OPENAQ_API_KEY`
- [ ] 兩個終端機都在運行（後端 + 前端）
- [ ] 瀏覽器 Console 沒有錯誤
- [ ] 測試了不同的座標（陸地 + 海洋）

**如果還是無法運作：**

1. 查看後端 Console 的錯誤訊息
2. 查看瀏覽器 DevTools Console
3. 檢查 `backend/docs/TRACKER_API.md` 的疑難排解章節

---

祝測試順利！🌍✨
