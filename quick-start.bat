@echo off
chcp 65001 >nul
title Blue Earth Watch - 快速啟動

echo ================================
echo   Blue Earth Watch 快速啟動
echo ================================
echo.

REM 初始化資料庫：清除 seed.js 示範資料並同步外部資料
echo 初始化資料庫（清除 seed 示範資料並同步 OWID / NOAA 最新資料）...
cd /d %~dp0backend
call npm run clear-seed
call npm run sync
cd /d %~dp0
echo 資料庫初始化與外部資料同步完成。
echo.

REM 啟動後端
echo 啟動後端開發伺服器...
start "Blue Earth Watch - 後端" cmd /k "cd /d %~dp0backend && npm run dev"

REM 等待 3 秒，讓後端先起來
timeout /t 3 /nobreak >nul

REM 啟動前端
echo 啟動前端開發伺服器...
start "Blue Earth Watch - 前端" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================
echo   開發環境已啟動！
echo ================================
echo.
echo 後端 API: http://localhost:3000
echo 前端開發: http://localhost:5173
echo.
echo 若要停止服務，請關閉各自的命令提示字元視窗。
echo.

pause

