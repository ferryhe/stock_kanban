@echo off
REM 一键启动 stock_kanban 项目
REM 自动启动后端和前端开发服务器

echo.
echo ====================================
echo    Stock Kanban 开发环境启动脚本
echo ====================================
echo.

REM 获取脚本所在目录
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0

REM 检查 node_modules 是否存在
if not exist "%SCRIPT_DIR%node_modules" (
    echo 📦 检测到首次运行，正在安装依赖...
    echo 这可能需要 2-5 分钟，请稍候...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ❌ 依赖安装失败！
        echo 请尝试：
        echo   1. npm install --legacy-peer-deps
        echo   2. 确保 Node.js 已正确安装
        pause
        exit /b 1
    )
    echo.
    echo ✅ 依赖安装完成！
    echo.
)

echo 🚀 启动应用...
echo.
echo 信息：
echo   - 后端服务器: http://localhost:3000
echo   - 前端应用:   http://localhost:5000
echo   - 应用将在浏览器中自动打开
echo.
echo 按 Ctrl+C 停止运行
echo.

REM 启动后端
start "Stock Kanban Backend" cmd /k "npm run dev"
timeout /t 3

REM 启动前端
start "Stock Kanban Frontend" cmd /k "npm run dev:client"
timeout /t 3

REM 打开浏览器
timeout /t 2 /nobreak
echo.
echo 🌐 正在打开浏览器...
start http://localhost:5000

echo.
echo ✨ 启动完成！两个终端窗口已打开：
echo   - 第一个窗口：后端服务器
echo   - 第二个窗口：前端开发服务器
echo.
echo 💡 如果遇到端口被占用的问题，请关闭其他占用这些端口的应用
echo 💡 要停止应用，请在对应终端窗口按 Ctrl+C
echo.
pause
