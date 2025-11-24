# Blue Earth Watch - 啟動腳本使用說明

本專案提供多種啟動方式，選擇最適合您作業系統的方法。

## 🚀 快速啟動

### Windows 使用者

#### 方法 1: PowerShell 互動式腳本（推薦）
```powershell
# 在專案根目錄執行
.\start.ps1
```

特色：
- ✅ 互動式選單
- ✅ 支援完整啟動、單獨啟動、初始化
- ✅ 自動檢查 Node.js 環境
- ✅ 彩色輸出更易讀

#### 方法 2: 雙擊快速啟動
```
雙擊 quick-start.bat
```

特色：
- ✅ 一鍵啟動前後端
- ✅ 開啟獨立終端視窗
- ✅ 適合快速開發測試

### Linux / macOS 使用者

#### 方法 1: Bash 腳本（推薦）
```bash
# 第一次使用需要給予執行權限
chmod +x start.sh

# 執行腳本
./start.sh
```

特色：
- ✅ 互動式選單
- ✅ 自動檢測終端類型（gnome-terminal / Terminal.app / xterm）
- ✅ 彩色輸出

#### 方法 2: 手動啟動
```bash
# 啟動後端（終端 1）
cd backend
npm run dev

# 啟動前端（終端 2）
cd frontend
npm run dev
```

---

## 📋 啟動選項說明

### 選項 1: 完整啟動（前端 + 後端）
- 同時啟動前後端服務器
- 後端運行在 `http://localhost:3000`
- 前端運行在 `http://localhost:5173`
- 在不同的終端視窗中顯示日誌

### 選項 2: 只啟動後端
- 僅啟動 Express API 服務器
- 適合前端已經在運行的情況
- 或者用於 API 測試

### 選項 3: 只啟動前端
- 僅啟動 Vite 開發服務器
- 適合後端已經在運行的情況
- 或者用於 UI 開發

### 選項 4: 初始化專案（首次使用）
⚠️ **首次使用必須執行此選項！**

執行步驟：
1. 安裝後端依賴（npm install）
2. 複製 `.env.example` 到 `.env`
3. 初始化 SQLite 資料庫
4. 植入種子資料（範例污染資料、遊戲分數、教育資源）
5. 安裝前端依賴（npm install）

完成後即可選擇選項 1 啟動服務。

### 選項 5: 同步外部資料
- 手動觸發資料同步
- 從 Our World in Data 取得最新塑膠污染資料
- 更新資料庫

### 選項 6: 退出
- 關閉啟動腳本

---

## 🔧 故障排除

### 問題 1: "找不到 Node.js"
**解決方法：**
```bash
# 檢查 Node.js 是否已安裝
node --version

# 如果沒有，請下載安裝
# Windows: https://nodejs.org/
# Linux: sudo apt install nodejs npm
# macOS: brew install node
```

### 問題 2: "端口已被佔用"
**解決方法：**

**Windows PowerShell:**
```powershell
# 查看 3000 端口佔用
netstat -ano | findstr :3000

# 終止進程（將 PID 替換為實際的進程 ID）
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
# 查看端口佔用
lsof -i :3000

# 終止進程
kill -9 <PID>
```

### 問題 3: PowerShell 腳本無法執行
**錯誤訊息：** "無法載入檔案，因為這個系統上已停用指令碼執行"

**解決方法：**
```powershell
# 以管理員身份開啟 PowerShell，執行：
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# 然後重新執行啟動腳本
.\start.ps1
```

### 問題 4: Bash 腳本權限問題
**錯誤訊息：** "Permission denied"

**解決方法：**
```bash
# 給予執行權限
chmod +x start.sh

# 重新執行
./start.sh
```

### 問題 5: npm install 失敗
**解決方法：**
```bash
# 清除 npm 快取
npm cache clean --force

# 刪除 node_modules
rm -rf backend/node_modules frontend/node_modules

# 重新執行初始化
./start.sh  # 選擇選項 4
```

### 問題 6: 資料庫錯誤
**解決方法：**
```bash
# 刪除舊資料庫
rm backend/database/*.db

# 重新初始化
cd backend
npm run init-db
npm run seed
```

---

## 📝 手動啟動步驟（不使用腳本）

如果腳本無法正常運作，可以手動執行以下步驟：

### 首次設置

```bash
# 1. 後端設置
cd backend
npm install
cp .env.example .env
npm run init-db
npm run seed

# 2. 前端設置
cd ../frontend
npm install
```

### 啟動服務

**Windows (兩個命令提示字元)：**
```cmd
REM 終端 1 - 後端
cd backend
npm run dev

REM 終端 2 - 前端
cd frontend
npm run dev
```

**Linux/macOS (兩個終端)：**
```bash
# 終端 1 - 後端
cd backend
npm run dev

# 終端 2 - 前端
cd frontend
npm run dev
```

---

## 🌐 訪問應用

啟動成功後，在瀏覽器中訪問：

- **前端應用**: http://localhost:5173
- **後端 API**: http://localhost:3000
- **API 文檔**: http://localhost:3000/ （查看可用端點）

---

## 💡 開發小技巧

### 後台運行（Linux/macOS）
```bash
# 使用 nohup 在後台運行
cd backend && nohup npm run dev > backend.log 2>&1 &
cd frontend && nohup npm run dev > frontend.log 2>&1 &

# 查看日誌
tail -f backend/backend.log
tail -f frontend/frontend.log
```

### 使用 PM2（推薦用於生產環境）
```bash
# 安裝 PM2
npm install -g pm2

# 啟動服務
cd backend && pm2 start npm --name "blue-earth-api" -- run start
cd frontend && pm2 start npm --name "blue-earth-web" -- run preview

# 查看狀態
pm2 list
pm2 logs

# 停止服務
pm2 stop all
pm2 delete all
```

### 同時運行（使用 concurrently）
在根目錄建立 package.json：
```json
{
  "scripts": {
    "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm run dev\""
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

然後執行：
```bash
npm install
npm run dev
```

---

## 📞 需要幫助？

如果遇到問題：
1. 查看 [GETTING_STARTED.md](./GETTING_STARTED.md)
2. 查看 [README.md](./README.md)
3. 檢查終端中的錯誤訊息
4. 確認 Node.js 版本 >= 18

---

## ✅ 啟動檢查清單

- [ ] Node.js 已安裝（版本 >= 18）
- [ ] 已執行初始化（選項 4 或手動設置）
- [ ] 端口 3000 和 5173 未被佔用
- [ ] .env 檔案已設定
- [ ] 資料庫已初始化
- [ ] 前後端依賴已安裝

全部完成後即可正常啟動應用！🚀
