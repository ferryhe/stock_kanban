@echo off
REM 量化指标更新脚本 (Windows)
REM 用途: 从 git 拉取最新的量化指标数据

echo 📊 更新量化指标数据...

REM 获取脚本所在目录
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set DATA_DIR=%PROJECT_DIR%\data

REM 确保 data 目录存在
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

echo ✅ 执行 git pull 以获取最新的 quant-metrics.json
cd /d "%PROJECT_DIR%"
git pull

if errorlevel 1 (
  echo ❌ git pull 失败，请检查网络连接
  exit /b 1
)

if exist "%DATA_DIR%\quant-metrics.json" (
  echo ✨ 量化指标数据已更新!
  echo 位置: %DATA_DIR%\quant-metrics.json
  echo 💡 提示: 缓存将在下次应用启动后更新（1小时自动刷新）
) else (
  echo ⚠️  警告: data\quant-metrics.json 文件未找到
)

pause
