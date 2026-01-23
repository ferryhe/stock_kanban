@echo off
REM AWS EC2 部署辅助脚本 (Windows)
REM 此脚本帮助你将代码推送到 EC2 实例

echo.
echo ====================================
echo  Stock Kanban EC2 部署助手
echo ====================================
echo.

REM 获取脚本所在目录
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0

echo 请按照以下步骤部署到 EC2:
echo.
echo 1. 检查你是否有:
echo    - AWS EC2 实例 (t3-medium, Ubuntu 22.04)
echo    - SSH 密钥文件 (your-key.pem)
echo    - EC2 实例的公共 IP 地址
echo.

REM 检查是否有 git
where git >nul 2>&1
if %errorlevel% equ 0 (
    echo 2. Git 已安装，你可以推送到 GitHub 然后在 EC2 上拉取
    echo.
) else (
    echo ⚠️  Git 未安装。请先安装 Git 或手动上传文件到 EC2
    echo.
)

echo 3. 在 EC2 上运行以下命令:
echo.
echo    # SSH 连接到 EC2
echo    ssh -i your-key.pem ubuntu@your-ec2-public-ip
echo.
echo    # 克隆项目
echo    git clone https://github.com/your-username/stock_kanban.git
echo    cd stock_kanban
echo.
echo    # 或者如果已经克隆过:
echo    cd ~/stock_kanban
echo    git pull origin main
echo.
echo    # 运行部署脚本
echo    chmod +x deploy/ec2-setup.sh
echo    bash deploy/ec2-setup.sh
echo.

echo 4. 关键文件:
echo    - deploy/EC2_DEPLOYMENT.md   - 完整部署指南
echo    - deploy/ec2-setup.sh        - 自动部署脚本
echo    - ecosystem.config.js        - PM2 配置
echo    - deploy/nginx-stock-kanban.conf - Nginx 配置
echo    - .env.production.example    - 环境变量模板
echo.

echo 5. 构建和部署命令参考:
echo.
echo    npm install --production      # 安装生产依赖
echo    npm run build                 # 构建前端
echo    pm2 start ecosystem.config.js # 启动应用
echo    pm2 logs                      # 查看日志
echo.

echo ====================================
echo 更多详情请查看: deploy/EC2_DEPLOYMENT.md
echo ====================================
echo.

pause
