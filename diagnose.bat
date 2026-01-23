@echo off
REM 环境诊断脚本
REM 检查项目是否可以启动

echo.
echo ====================================
echo  Stock Kanban 环境诊断
echo ====================================
echo.

setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0

REM 检查 Node.js
echo [1/6] 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%a in ('node --version') do echo ✅ Node.js: %%a
) else (
    echo ❌ 找不到 Node.js！请先安装 Node.js
    goto error
)

REM 检查 npm
echo [2/6] 检查 npm...
where npm >nul 2>&1
if %errorlevel% equ 0 (
    REM npm version 无法在这里正常输出，跳过
    echo ✅ npm: 已安装
) else (
    echo ❌ 找不到 npm！
    goto error
)

REM 检查关键文件
echo [3/6] 检查项目文件...
if exist "%SCRIPT_DIR%package.json" (
    echo ✅ package.json: 存在
) else (
    echo ❌ package.json: 未找到
    goto error
)

if exist "%SCRIPT_DIR%server\index.ts" (
    echo ✅ server/index.ts: 存在
) else (
    echo ❌ server/index.ts: 未找到
    goto error
)

if exist "%SCRIPT_DIR%client\index.html" (
    echo ✅ client/index.html: 存在
) else (
    echo ❌ client/index.html: 未找到
    goto error
)

REM 检查数据文件
echo [4/6] 检查量化指标数据...
if exist "%SCRIPT_DIR%data\quant-metrics.json" (
    echo ✅ data/quant-metrics.json: 存在
) else (
    echo ⚠️  data/quant-metrics.json: 未找到 (可选)
)

REM 检查 node_modules
echo [5/6] 检查依赖包...
if exist "%SCRIPT_DIR%node_modules" (
    echo ✅ node_modules: 存在
    set modules_ok=1
) else (
    echo ⚠️  node_modules: 未找到
    echo    需要运行: npm install
    set modules_ok=0
)

REM 检查端口
echo [6/6] 检查端口可用性...

REM 检查 3000 端口
netstat -an | find ":3000 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  端口 3000: 已被占用
) else (
    echo ✅ 端口 3000: 可用
)

REM 检查 5000 端口
netstat -an | find ":5000 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  端口 5000: 已被占用
) else (
    echo ✅ 端口 5000: 可用
)

echo.
echo ====================================
echo  诊断结果
echo ====================================
echo.

if %modules_ok% equ 1 (
    echo ✨ 环境准备完成！可以启动应用
    echo.
    echo 快速启动：
    echo   1. 双击 start-dev.bat 一键启动
    echo   或
    echo   2. 打开两个终端：
    echo      - 终端 1: npm run dev
    echo      - 终端 2: npm run dev:client
    echo.
    echo 然后访问: http://localhost:5000
    echo.
) else (
    echo ⚠️  需要安装依赖
    echo.
    echo 运行以下命令安装依赖：
    echo   npm install
    echo.
    echo 如果出错，尝试：
    echo   npm install --legacy-peer-deps
    echo.
)

echo 更多信息请查看: LOCAL_STARTUP.md
echo.
pause
exit /b 0

:error
echo.
echo ❌ 环境检查失败！
echo.
echo 请检查：
echo   1. Node.js 是否已安装
echo   2. 项目文件是否完整
echo   3. 当前目录是否正确
echo.
pause
exit /b 1
