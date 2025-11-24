# Blue Earth Watch - 數據來源說明

## 📊 數據真實性聲明

本專案使用的所有污染數據均**基於真實的科學研究和國際組織報告**，確保教育內容的準確性和可信度。

---

## 🌍 數據來源詳情

### 1. Our World in Data (OWID) 塑膠廢棄物數據

**狀態**: ✅ 真實數據（基於同行評審研究）

**數據基礎**:
- **Geyer, R., et al. (2017)** - "Production, use, and fate of all plastics ever made"
  - 期刊: *Science Advances*, Vol. 3, No. 7
  - DOI: 10.1126/sciadv.1700782
  - 研究範圍: 1950-2015 年全球塑膠生產與廢棄物

- **Jambeck, J.R., et al. (2015)** - "Plastic waste inputs from land into the ocean"
  - 期刊: *Science*, Vol. 347, Issue 6223
  - DOI: 10.1126/science.1260352
  - 研究範圍: 192 個沿海國家的塑膠廢棄物管理

- **OECD (2022)** - "Global Plastics Outlook"
  - 來源: 經濟合作暨發展組織
  - 網址: https://www.oecd.org/environment/plastics/
  - 內容: 全球塑膠生命週期評估

**數據內容**:
- 全球各國塑膠廢棄物年產量（百萬噸）
- 管理不善的塑膠廢棄物估計量
- 2019-2021 年數據估計

**實作位置**: `backend/src/services/owidDataParser.js`

---

### 2. UNEP (聯合國環境規劃署) 海洋污染數據

**狀態**: ✅ 基於 UNEP 報告的示例數據

**數據基礎**:
- **UNEP (2021)** - "From Pollution to Solution: A Global Assessment of Marine Litter and Plastic Pollution"
  - 來源: 聯合國環境規劃署
  - 網址: https://www.unep.org/resources/pollution-solution-global-assessment-marine-litter-and-plastic-pollution
  - 內容: 全球海洋塑膠污染評估

**數據內容**:
- 主要海洋垃圾帶位置（太平洋、印度洋、大西洋、地中海）
- 塑膠污染濃度估計（kg/km²）
- 基於 UNEP 報告的典型污染水平

**實作位置**: `backend/src/database/seed.js` (第 15-29 行)

**注意**: 這些是基於 UNEP 研究的**示例數據點**，用於展示污染分布模式。真實的海洋監測數據需要實時衛星和船舶採樣。

---

### 3. 東南亞沿海污染數據

**狀態**: ✅ 基於 OWID/Jambeck 研究的區域數據

**數據基礎**:
- Jambeck et al. (2015) 的研究顯示東南亞國家是主要的海洋塑膠污染來源
- 數據反映該區域的高塑膠廢棄物流入率

**數據內容**:
- 泰國、菲律賓、新加坡沿海污染濃度
- 基於各國廢棄物管理研究的估計值

**實作位置**: `backend/src/database/seed.js` (第 32-34 行)

---

### 4. 微塑膠污染數據

**狀態**: ✅ 基於研究的示例數據

**數據基礎**:
- 多項海洋微塑膠研究 (2015-2022)
- 典型海域的微塑膠顆粒濃度範圍

**數據內容**:
- 加勒比海、北海微塑膠濃度
- 單位: 顆粒/立方公尺 (particles/m³)

**實作位置**: `backend/src/database/seed.js` (第 37-38 行)

---

## 📈 數據更新機制

### 自動同步
- **頻率**: 每日凌晨 2:00
- **內容**: 從 OWID 研究彙編同步最新數據
- **實作**: `backend/src/scripts/syncData.js`

### 手動同步
```bash
cd backend
npm run sync
```

---

## 🔬 數據驗證標準

本專案遵循以下數據品質標準：

1. **同行評審**: 所有核心數據必須來自同行評審的科學期刊
2. **來源追溯**: 每個數據點都標註原始研究來源
3. **時效性**: 使用 2015-2022 年間的最新研究
4. **透明度**: 清楚標示數據是「真實記錄」還是「基於研究的示例」
5. **教育導向**: 數據用於教育目的，呈現全球污染的真實規模

---

## ⚠️ 重要說明

### 種子數據的性質
`backend/src/database/seed.js` 中的數據是：
- ✅ **基於真實研究**: 數值範圍和分布模式反映實際研究發現
- ✅ **教育示例**: 展示全球塑膠污染的典型情況
- ⚠️ **非即時監測**: 不是實時衛星或感測器數據
- ✅ **科學準確**: 符合學術研究報告的數量級和趨勢

### 實時數據的限制
真正的即時海洋污染監測需要：
- 衛星遙測系統（如 ESA Copernicus）
- 海洋浮標和船舶採樣
- 商業 API 存取權限（通常需要授權）

本專案使用基於**同行評審研究的彙編數據**，這在教育和認知提升方面**同樣有效且更加可靠**。

---

## 📚 延伸閱讀

### 推薦資源
1. **Our World in Data - Plastic Pollution**
   - https://ourworldindata.org/plastic-pollution
   - 全球塑膠污染的綜合資料與視覺化

2. **UNEP - Beat Plastic Pollution**
   - https://www.unep.org/beat-plastic-pollution
   - 聯合國的塑膠污染解決方案

3. **Ocean Cleanup**
   - https://theoceancleanup.com/
   - 海洋清理技術與進展

4. **Science Direct - Marine Pollution Bulletin**
   - https://www.sciencedirect.com/journal/marine-pollution-bulletin
   - 海洋污染研究期刊

---

## 🎓 引用建議

如果您在學術或教育場合使用本專案的數據，請引用原始研究：

```
Geyer, R., Jambeck, J. R., & Law, K. L. (2017). Production, use, and fate of 
all plastics ever made. Science Advances, 3(7), e1700782.

Jambeck, J. R., et al. (2015). Plastic waste inputs from land into the ocean. 
Science, 347(6223), 1260-1263.

UNEP (2021). From Pollution to Solution: A Global Assessment of Marine Litter 
and Plastic Pollution. Nairobi.
```

---

## ✅ 結論

**Blue Earth Watch 的數據是真實可靠的教育資源**，基於：
- ✅ 同行評審的科學期刊
- ✅ 國際組織的官方報告
- ✅ 透明的數據來源追溯
- ✅ 符合 SDG 13 & 14 教育目標

本專案**不是**：
- ❌ 虛假或編造的數據
- ❌ 商業級的實時監測系統
- ❌ 替代專業研究的工具

本專案**是**：
- ✅ 基於科學研究的教育平台
- ✅ 提升氣候意識的工具
- ✅ 啟發環保行動的起點

---

*最後更新: 2024-11-16*  
*維護者: Blue Earth Watch 開發團隊*
