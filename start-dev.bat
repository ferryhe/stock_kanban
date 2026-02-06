@echo off
REM Use UTF-8 in console to avoid garbled output
chcp 65001 >nul
REM One-click start for stock_kanban
REM Starts backend + frontend dev servers

echo.
echo ====================================
echo    Stock Kanban Dev Startup Script
echo ====================================
echo.

REM Get script directory
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0

REM Check node_modules
if not exist "%SCRIPT_DIR%node_modules" (
    echo First run detected, installing dependencies...
    echo This may take 2-5 minutes, please wait...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo Dependency install failed!
        echo Try:
        echo   1. npm install --legacy-peer-deps
        echo   2. Ensure Node.js is installed correctly
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed.
    echo.
)

echo Starting app...
echo.
echo Info:
echo   - Backend: http://localhost:3000
echo   - Frontend: http://localhost:5000
echo   - Browser will open automatically
echo.
echo Press Ctrl+C to stop
echo.

REM Start backend (Windows doesn't support NODE_ENV=development in package.json)
start "Stock Kanban Backend" cmd /k "set NODE_ENV=development&& set PORT=3000&& npx tsx server/index.ts"
timeout /t 3

REM Start frontend
start "Stock Kanban Frontend" cmd /k "npm run dev:client"
timeout /t 3

REM Open browser
timeout /t 2 /nobreak
echo.
echo Opening browser...
start http://localhost:5000

echo.
echo Startup complete. Two terminal windows opened:
echo   - Window 1: Backend
echo   - Window 2: Frontend
echo.
echo If ports are in use, close other apps using them.
echo To stop, press Ctrl+C in the corresponding window.
echo.
pause
