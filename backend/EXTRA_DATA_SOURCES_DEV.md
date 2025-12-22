# Blue Earth Watch — 額外資料來源整合開發文件

本文件涵蓋：資料來源清單、API 使用方式、欄位映射、快取與排程、在現有程式結構下的落地步驟。

適用：`backend/`（Node.js + Express + SQLite）

---

## 0. 背景與現況

### 0.1 已在專案內使用的真實來源（不重複）

| 來源 | source 值 | type 值 | 說明 |
|------|-----------|---------|------|
| OWID | `Our World in Data` | `plastic` | grapher CSV 端點抓塑膠廢棄物 |
| NOAA ArcGIS | `NOAA_NCEI_Microplastics` | `microplastic` | NCEI Microplastics FeatureServer |

### 0.2 本次新增的資料來源

#### 歐美來源

| 來源 | source 值 | type 值 | 服務檔案 |
|------|-----------|---------|----------|
| Water Quality Portal | `WQP` | `water_quality` | `wqpService.js` |
| US EPA ECHO | `EPA_ECHO` | `pollution_source` | `echoService.js` |
| EMODnet Chemistry | `EMODnet_Chemistry` | `chemistry` | `emodnetChemService.js` |
| ICES DOME | `ICES_DOME` | `contaminant` / `*_contaminant` | `icesDomeService.js` |

#### 亞太來源

| 來源 | source 值 | type 值 | 服務檔案 |
|------|-----------|---------|----------|
| 台灣環境部 | `MOENV (TW)` | `water_quality` | `moenvService.js` |
| 澳洲 NPI | `NPI (AU)` | `emission` / `water_emission` | `npiService.js` |
| 太平洋 SPREP | `SPREP (Pacific)` | `marine_layer` / `coral_reef` / etc. | `sprepService.js` |

---

## 1. 資料模型與同步方式

### 1.1 DB 表結構

```sql
-- pollution_data：核心污染資料表
CREATE TABLE pollution_data (
  id INTEGER PRIMARY KEY,
  source VARCHAR(100) NOT NULL,    -- 資料來源識別
  type VARCHAR(50) NOT NULL,       -- 資料類型
  lat REAL,                        -- 緯度
  lng REAL,                        -- 經度
  value REAL NOT NULL,             -- 測值
  unit VARCHAR(50),                -- 單位
  recorded_at DATE NOT NULL,       -- 採樣/記錄日期
  meta TEXT,                       -- JSON 格式的額外資訊
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- data_cache：外部 API 快取表
CREATE TABLE data_cache (
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  cache_data TEXT NOT NULL,
  expires_at DATETIME NOT NULL
);
```

### 1.2 排程同步

每天 02:00 UTC 執行（`syncData.js`）：

```
OWID → External Data (WQP/ECHO/EMODnet/ICES) → NOAA Microplastics
```

---

## 2. 各資料來源 API 規格

### A) Water Quality Portal (WQP)

**API 端點：**
- Result: `https://www.waterqualitydata.us/data/Result/search`
- Station: `https://www.waterqualitydata.us/data/Station/search`

**查詢參數：**
```javascript
{
  mimeType: 'csv',
  bBox: '-82,24,-65,45',  // 近岸 bbox
  startDateLo: '2024-01-01',
  startDateHi: '2024-12-31',
  characteristicName: 'Nitrogen;Phosphorus;Mercury',
  sampleMedia: 'Water'
}
```

**欄位映射：**
| WQP 欄位 | pollution_data 欄位 |
|----------|---------------------|
| LatitudeMeasure | lat |
| LongitudeMeasure | lng |
| ResultMeasureValue | value |
| MeasureUnitCode | unit |
| ActivityStartDate | recorded_at |
| CharacteristicName | meta.characteristicName |

---

### B) US EPA ECHO

**API 端點：**
- `https://echodata.epa.gov/echo/cwa_rest_services.get_facilities`

**查詢參數：**
```javascript
{
  output: 'JSON',
  p_st: 'CA',        // 州代碼
  p_med: 'W',        // Water media
  p_ptype: 'NPD',    // NPDES permits
  responseset: 500
}
```

**欄位映射：**
| ECHO 欄位 | pollution_data 欄位 |
|-----------|---------------------|
| FacLat | lat |
| FacLong | lng |
| 1 (固定) | value |
| 'facility' | unit |
| 同步日期 | recorded_at |
| FacName, SourceID | meta |

---

### C) EMODnet Chemistry

**服務端點：**
- ERDDAP: `https://erddap.emodnet-chemistry.eu/erddap/tabledap/`
- WFS: `https://geo.emodnet-chemistry.eu/geoserver/emodnet/wfs`

**ERDDAP 查詢格式：**
```
/tabledap/{datasetId}.json?latitude,longitude,time,value,parameter
  &latitude>=35&latitude<=45
  &longitude>=-6&longitude<=16
```

**欄位映射：**
| EMODnet 欄位 | pollution_data 欄位 |
|--------------|---------------------|
| latitude | lat |
| longitude | lng |
| value | value |
| time | recorded_at |
| parameter | meta.parameter |

---

### D) ICES DOME

**API 端點：**
- REST: `https://dome.ices.dk/api/contaminants/{medium}`
- WFS: `https://gis.ices.dk/geoserver/ICES/wfs`

**查詢參數：**
```javascript
{
  year: 2023,
  area: '27.4',  // ICES area code
  format: 'json'
}
```

**欄位映射：**
| ICES 欄位 | pollution_data 欄位 |
|-----------|---------------------|
| Latitude | lat |
| Longitude | lng |
| Value | value |
| MUNIT | unit |
| DATE | recorded_at |
| PARAM | meta.parameter |

---

## 3. 服務檔案結構

```
backend/src/services/
├── externalDataService.js    # 整合入口（已更新）
│
│   === 歐美來源 ===
├── wqpService.js             # WQP 水質資料
├── echoService.js            # EPA ECHO 污染源
├── emodnetChemService.js     # EMODnet 歐洲海洋化學
├── icesDomeService.js        # ICES DOME 污染物監測
│
│   === 亞太來源 ===
├── moenvService.js           # 台灣環境部 MOENV
├── npiService.js             # 澳洲 NPI 污染清冊
├── sprepService.js           # 太平洋 SPREP 環境資料
├── wfsClient.js              # 通用 WFS 客戶端（NPI/SPREP 共用）
│
│   === 既有 ===
├── owidDataParser.js         # OWID（既有）
└── trackerApiService.js      # Tracker API（既有）
```

---

## 4. 快取策略

所有新來源都使用 `data_cache` 表：

### 歐美來源

| 來源 | cache_key | stale window | TTL |
|------|-----------|--------------|-----|
| WQP | `wqp_sync_meta` | 24h | 7 days |
| ECHO | `echo_sync_meta` | 24h | 7 days |
| EMODnet | `emodnet_sync_meta` | 24h | 7 days |
| ICES | `ices_dome_sync_meta` | 24h | 7 days |

### 亞太來源

| 來源 | cache_key | stale window | TTL |
|------|-----------|--------------|-----|
| MOENV | `moenv_sync_meta` | 24h | 7 days |
| NPI | `npi_sync_meta` | 24h | 7 days |
| SPREP | `sprep_sync_meta` | 24h | 7 days |

---

## 5. 環境變數

```bash
# 亞太來源
MOENV_API_KEY=your-moenv-api-key    # 台灣環境部（必要）
NPI_WFS_BASE=https://data.gov.au/geoserver/npi/wfs  # 可選，有預設值
SPREP_WFS_BASE=https://geoserver.sprep.org/geoserver/pipap/ows  # 可選，有預設值
```

---

## 6. API 端點

### 亞太來源 API

```
GET /api/tracker/moenv-water?dataId=wqx_p_10&yearMonth=2024_01&limit=100
GET /api/tracker/npi-emissions?bbox=140,-40,155,-25&substance=Mercury&year=2022
GET /api/tracker/sprep-layer?layer=marine_protected&bbox=160,-20,180,0
```

---

## 7. 使用方式

### 手動同步

```bash
# 同步所有資料（包含新來源）
npm run sync

# 或在 Docker 環境
docker-compose exec backend node src/scripts/syncData.js
```

### 查詢資料來源統計

```sql
SELECT source, type, COUNT(*) as count
FROM pollution_data
GROUP BY source, type;
```

---

## 8. 驗收清單

- [x] 每個新來源都有獨立 `importXToDatabase()` 函式
- [x] 寫入 `pollution_data` 表，使用正確的 source/type
- [x] meta 內含查詢條件與原始來源 URL
- [x] 使用 `data_cache` 做同步節流
- [x] 整合到 `externalDataService.importExternalDataToDatabase()`
- [x] daily sync 會自動呼叫

---

## 9. 注意事項

1. **WQP 時效性**：USGS 資料可能有延遲，新於 2024-03-11 的資料可能不完整
2. **ECHO 資料屬性**：是「設施/許可」資料，不是即時濃度監測
3. **EMODnet/ICES**：參數/單位繁多，原始欄位保留在 meta
4. **API Rate Limit**：ECHO 查詢間隔 500ms，避免被封鎖
5. **MOENV**：需要 API Key，每日限制 5000 次/API
6. **NPI/SPREP**：WFS 服務，不需授權但建議做快取

---

## 10. 後續擴充

如需新增其他資料來源：

1. 在 `backend/src/services/` 建立新的 service 檔案
2. 實作 `importXToDatabase()` 函式
3. 在 `externalDataService.js` 的 `importExternalDataToDatabase()` 中加入呼叫
4. 更新本文件
