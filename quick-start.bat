@echo off
chcp 65001 >nul
title Blue Earth Watch - 快速啟動

echo ================================
echo   Blue Earth Watch 快速啟動
echo ================================
echo.

REM 啟動後端
echo 啟動後端服務器...
start "Blue Earth Watch - 後端" cmd /k "cd /d %~dp0backend && npm run dev"

REM 等待 3 秒
timeout /t 3 /nobreak >nul

REM 啟動前端
echo 啟動前端服務器...
start "Blue Earth Watch - 前端" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================
echo   服務已啟動！
echo ================================
echo.
echo 後端 API: http://localhost:3000
echo 前端應用: http://localhost:5173
echo.
echo 若要停止服務，請關閉對應的命令提示字元視窗
echo.

pause
