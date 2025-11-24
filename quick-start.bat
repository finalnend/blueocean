@echo off
setlocal enableextensions
chcp 65001 >nul
title Blue Earth Watch - Quick Start

REM Setup paths (quote-safe for spaces)
set "PROJECT_ROOT=%~dp0"

echo ================================
echo   Blue Earth Watch Quick Start
echo ================================
echo.

REM Initialize database with sample data and sync external sources
echo Initializing database (seed + OWID / NOAA sync)...
pushd "%PROJECT_ROOT%backend" || goto :path_error
call npm run clear-seed
call npm run sync
popd
echo Database ready.
echo.

REM Start backend (set working dir via /D to avoid path errors with spaces)
echo Starting backend dev server...
start "Blue Earth Watch - Backend" /D "%PROJECT_ROOT%backend" "%COMSPEC%" /k "npm run dev"

REM Give backend a head start
timeout /t 3 /nobreak >nul

REM Start frontend (set working dir via /D to avoid path errors with spaces)
echo Starting frontend dev server...
start "Blue Earth Watch - Frontend" /D "%PROJECT_ROOT%frontend" "%COMSPEC%" /k "npm run dev"

echo.
echo ================================
echo   Development environment ready
echo ================================
echo.
echo Backend API: http://localhost:5875
echo Frontend dev: http://localhost:5173
echo.
echo To stop services, close each terminal window.
echo.

endlocal
pause
goto :eof

:path_error
echo Path error: %PROJECT_ROOT%backend not found.
pause
