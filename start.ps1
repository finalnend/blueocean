# Blue Earth Watch - Windows 啟動腳本
# 此腳本會自動啟動前後端伺服器

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Blue Earth Watch Launcher" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Node.js 是否已安裝
Write-Host "檢查環境..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 找不到 Node.js！請先安裝 Node.js 18 或更高版本" -ForegroundColor Red
    Write-Host "下載連結: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按 Enter 退出"
    exit 1
}

# 取得專案根目錄
$projectRoot = $PSScriptRoot

# 檢查後端資料夾
$backendPath = Join-Path $projectRoot "backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "✗ 找不到後端資料夾: $backendPath" -ForegroundColor Red
    Read-Host "按 Enter 退出"
    exit 1
}

# 檢查前端資料夾
$frontendPath = Join-Path $projectRoot "frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "✗ 找不到前端資料夾: $frontendPath" -ForegroundColor Red
    Read-Host "按 Enter 退出"
    exit 1
}

Write-Host ""
Write-Host "選擇啟動模式：" -ForegroundColor Cyan
Write-Host "1. 完整啟動（前端 + 後端）" -ForegroundColor White
Write-Host "2. 只啟動後端" -ForegroundColor White
Write-Host "3. 只啟動前端" -ForegroundColor White
Write-Host "4. 初始化專案（首次使用）" -ForegroundColor White
Write-Host "5. 同步外部資料" -ForegroundColor White
Write-Host "6. 退出" -ForegroundColor White
Write-Host ""

$choice = Read-Host "請輸入選項 (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "正在啟動完整服務..." -ForegroundColor Green
        Write-Host ""
        
        # 啟動後端
        Write-Host "啟動後端服務器..." -ForegroundColor Yellow
        $backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '後端服務器啟動中...' -ForegroundColor Cyan; npm run dev" -PassThru
        
        # 等待 3 秒讓後端啟動
        Start-Sleep -Seconds 3
        
        # 啟動前端
        Write-Host "啟動前端開發服務器..." -ForegroundColor Yellow
        $frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '前端服務器啟動中...' -ForegroundColor Cyan; npm run dev" -PassThru
        
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host "  服務已啟動！" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "後端 API: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "前端應用: http://localhost:5173" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "關閉此視窗不會停止服務器" -ForegroundColor Yellow
        Write-Host "若要停止服務，請關閉各自的終端視窗" -ForegroundColor Yellow
    }
    
    "2" {
        Write-Host ""
        Write-Host "啟動後端服務器..." -ForegroundColor Yellow
        Set-Location $backendPath
        npm run dev
    }
    
    "3" {
        Write-Host ""
        Write-Host "啟動前端開發服務器..." -ForegroundColor Yellow
        Set-Location $frontendPath
        npm run dev
    }
    
    "4" {
        Write-Host ""
        Write-Host "================================" -ForegroundColor Cyan
        Write-Host "  初始化專案" -ForegroundColor Cyan
        Write-Host "================================" -ForegroundColor Cyan
        Write-Host ""
        
        # 初始化後端
        Write-Host "1/5 安裝後端依賴..." -ForegroundColor Yellow
        Set-Location $backendPath
        
        if (Test-Path "package.json") {
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ 後端依賴安裝完成" -ForegroundColor Green
            } else {
                Write-Host "✗ 後端依賴安裝失敗" -ForegroundColor Red
                Read-Host "按 Enter 繼續"
            }
        } else {
            Write-Host "✗ 找不到 package.json" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "2/5 設定環境變數..." -ForegroundColor Yellow
        $envExample = Join-Path $backendPath ".env.example"
        $envFile = Join-Path $backendPath ".env"
        
        if ((Test-Path $envExample) -and -not (Test-Path $envFile)) {
            Copy-Item $envExample $envFile
            Write-Host "✓ 已創建 .env 檔案" -ForegroundColor Green
        } elseif (Test-Path $envFile) {
            Write-Host "✓ .env 檔案已存在" -ForegroundColor Green
        } else {
            Write-Host "✗ 找不到 .env.example" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "3/5 初始化資料庫..." -ForegroundColor Yellow
        npm run init-db
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ 資料庫初始化完成" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "4/5 植入種子資料..." -ForegroundColor Yellow
        npm run seed
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ 種子資料植入完成" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "5/5 安裝前端依賴..." -ForegroundColor Yellow
        Set-Location $frontendPath
        
        if (Test-Path "package.json") {
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ 前端依賴安裝完成" -ForegroundColor Green
            } else {
                Write-Host "✗ 前端依賴安裝失敗" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host "  初始化完成！" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "現在可以重新執行此腳本並選擇選項 1 啟動服務" -ForegroundColor Cyan
        Read-Host "按 Enter 退出"
    }
    
    "5" {
        Write-Host ""
        Write-Host "同步外部資料..." -ForegroundColor Yellow
        Set-Location $backendPath
        npm run sync
        Write-Host ""
        Read-Host "按 Enter 退出"
    }
    
    "6" {
        Write-Host "再見！" -ForegroundColor Cyan
        exit 0
    }
    
    default {
        Write-Host "無效的選項" -ForegroundColor Red
        Read-Host "按 Enter 退出"
        exit 1
    }
}

Write-Host ""
Read-Host "按 Enter 退出"
