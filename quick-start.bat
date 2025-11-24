@echo off
chcp 65001 >nul
title Blue Earth Watch - Quick Start

echo ================================
echo   Blue Earth Watch Quick Start
echo ================================
echo.

REM Initialize database with sample data and sync external sources
echo Initializing database (seed + OWID / NOAA sync)...
cd /d %~dp0backend
call npm run clear-seed
call npm run sync
cd /d %~dp0
echo Database ready.
echo.

REM Start backend
echo Starting backend dev server...
start "Blue Earth Watch - Backend" cmd /k "cd /d %~dp0backend && npm run dev"

REM Give backend a head start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend dev server...
start "Blue Earth Watch - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================
echo   Development environment ready
echo ================================
echo.
echo Backend API: http://localhost:5875
echo 前端開發: http://localhost:5173
echo Frontend dev: http://localhost:5173
echo.
echo To stop services, close each terminal window.
echo.

pause
