# 🚀 EC2 部署快速清单

## 📋 前置准备（在你的本地计算机上）

### 第 1 阶段：准备应用代码

- [ ] 代码已推送到 GitHub
- [ ] `.env.production.example` 已创建
- [ ] `ecosystem.config.js` 已配置
- [ ] `npm run build` 能成功执行
- [ ] `dist/` 文件夹已生成

**关键命令**：
```bash
npm install
npm run build
```

### 第 2 阶段：准备 AWS 环境

- [ ] AWS 账户已创建
- [ ] EC2 t3-medium 实例已启动
- [ ] 选择 Ubuntu 22.04 LTS AMI
- [ ] SSH 密钥对已下载 (your-key.pem)
- [ ] 安全组已配置:
  - [ ] 入站 SSH (22) - 来自你的 IP
  - [ ] 入站 HTTP (80) - 来自 0.0.0.0/0
  - [ ] 入站 HTTPS (443) - 来自 0.0.0.0/0 (可选)
- [ ] 实例弹性 IP 已分配 (可选但推荐)
- [ ] 实例状态为 "running"

---

## 🔧 EC2 实例配置（在 EC2 上执行）

### 第 3 阶段：SSH 连接和初始化

**连接命令**：
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

**第一次连接后运行**：
```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 创建应用目录
mkdir -p ~/stock_kanban
cd ~/stock_kanban
```

- [ ] 能成功 SSH 连接到实例
- [ ] 系统已更新

### 第 4 阶段：安装依赖

**在 EC2 上运行**：
```bash
# 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version

# 安装 PM2 和 Nginx
sudo npm install -g pm2
sudo apt-get install -y nginx
sudo apt-get install -y git
```

- [ ] Node.js v22 已安装
- [ ] npm 已安装
- [ ] PM2 已全局安装
- [ ] Nginx 已安装
- [ ] Git 已安装

### 第 5 阶段：部署应用代码

**选择一种方式**：

#### 方式 A：从 GitHub 克隆（推荐）
```bash
cd ~/stock_kanban
git clone https://github.com/your-username/stock_kanban.git .
```

#### 方式 B：上传本地文件
```bash
# 在本地计算机上运行:
scp -r -i your-key.pem ./dist ubuntu@your-ec2-ip:~/stock_kanban/
scp -r -i your-key.pem ./data ubuntu@your-ec2-ip:~/stock_kanban/
scp -r -i your-key.pem ./deploy ubuntu@your-ec2-ip:~/stock_kanban/
scp -i your-key.pem package.json ubuntu@your-ec2-ip:~/stock_kanban/
scp -i your-key.pem ecosystem.config.js ubuntu@your-ec2-ip:~/stock_kanban/
```

**然后在 EC2 上**：
```bash
cd ~/stock_kanban
npm install --production
```

- [ ] 代码已获取到 EC2
- [ ] 依赖已安装 (`npm install --production`)
- [ ] `dist/` 文件夹存在
- [ ] `data/quant-metrics.json` 存在

### 第 6 阶段：环境配置

**在 EC2 上**：
```bash
cd ~/stock_kanban
# 复制环境文件
cp .env.production.example .env.production

# 编辑配置
nano .env.production
# 或使用 vi/vim
# vi .env.production
```

**需要配置的项**：
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

- [ ] `.env.production` 已创建
- [ ] 环境变量已正确配置
- [ ] NODE_ENV=production

### 第 7 阶段：启动应用

**在 EC2 上**：
```bash
cd ~/stock_kanban

# 启动 PM2 应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status
pm2 logs
```

**验证应用运行**：
```bash
curl http://localhost:3000/api/watchlists
# 应该返回 JSON 数据
```

- [ ] PM2 应用已启动
- [ ] `pm2 status` 显示 "online"
- [ ] 日志没有错误
- [ ] API 端点能访问 (curl 测试)

### 第 8 阶段：配置 Nginx

**在 EC2 上**：
```bash
# 复制 Nginx 配置
sudo cp deploy/nginx-stock-kanban.conf /etc/nginx/sites-available/stock-kanban

# 创建符号链接
sudo ln -s /etc/nginx/sites-available/stock-kanban /etc/nginx/sites-enabled/stock-kanban

# 删除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 查看状态
sudo systemctl status nginx
```

**验证 Nginx**：
```bash
# 查看是否监听 80 端口
sudo netstat -tlnp | grep nginx
# 或
sudo ss -tlnp | grep nginx
```

- [ ] Nginx 配置已复制
- [ ] Nginx 配置测试通过 (`sudo nginx -t`)
- [ ] Nginx 已启动
- [ ] Nginx 设置为开机自启

### 第 9 阶段：访问应用

**在浏览器中打开**：
```
http://your-ec2-public-ip
```

应该看到 Stock Kanban 应用界面。

- [ ] 应用在浏览器中加载成功
- [ ] 能看到股票卡片
- [ ] 能搜索股票
- [ ] 能看到量化指标

---

## 📊 验证和测试

### 测试 API 端点

```bash
# 在 EC2 上测试
curl http://localhost:3000/api/watchlists
curl http://localhost:3000/api/stocks/ai_chips
curl http://localhost:3000/api/market
```

- [ ] `/api/watchlists` 返回看板列表
- [ ] `/api/stocks/ai_chips` 返回股票数据
- [ ] `/api/market` 返回市场数据
- [ ] `/api/search?q=AAPL` 返回搜索结果

### 监控应用

```bash
# 查看实时日志
pm2 logs stock-kanban-api

# 监控面板
pm2 monit

# 查看内存和 CPU 使用
top
free -h
df -h
```

- [ ] 应用内存使用正常 (< 500MB)
- [ ] CPU 使用率正常
- [ ] 磁盘空间充足 (> 5GB)
- [ ] 日志没有错误

### 测试重启和自启

```bash
# 测试重启
pm2 restart stock-kanban-api
sleep 2
# 检查状态
pm2 status

# 配置开机自启
pm2 startup
pm2 save

# 重启 EC2 实例来测试
sudo reboot
# 等待 2-3 分钟...
# SSH 重新连接并检查:
pm2 status
curl http://localhost:3000/api/watchlists
```

- [ ] PM2 应用重启成功
- [ ] 应用设置为开机自启
- [ ] EC2 重启后应用自动启动

---

## 🔐 安全配置（可选但推荐）

### SSL/TLS 证书

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书（需要域名）
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

- [ ] SSL 证书已获取 (如果有域名)
- [ ] HTTPS 正常工作
- [ ] 证书自动续期已配置

### 防火墙

```bash
# 启用防火墙
sudo ufw enable

# 允许必要的端口
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 查看规则
sudo ufw status
```

- [ ] UFW 防火墙已启用
- [ ] 必要的端口已开放

---

## 📝 后续维护

### 定期更新

```bash
# 周期性更新数据（编辑 crontab）
crontab -e

# 添加：
# 每天早上 9 点更新代码
0 9 * * * cd ~/stock_kanban && git pull && npm run build && pm2 restart all
```

- [ ] 更新任务已配置

### 监控和告警

推荐配置：
- AWS CloudWatch 监控
- PM2 Plus（可选）
- 日志聚合服务

- [ ] 监控告警已设置（可选）

### 备份

```bash
# 备份重要数据
tar -czf backup_$(date +%Y%m%d).tar.gz ~/stock_kanban/data/

# 上传到 S3 或其他存储
aws s3 cp backup_$(date +%Y%m%d).tar.gz s3://your-bucket/backups/
```

- [ ] 备份策略已制定

---

## ✅ 部署完成检查

```bash
# 完整验证
echo "1. 检查应用状态"
pm2 status

echo "2. 检查 Nginx 状态"
sudo systemctl status nginx

echo "3. 测试 API"
curl http://localhost:3000/api/watchlists

echo "4. 检查系统资源"
free -h
df -h

echo "5. 检查日志"
pm2 logs --lines 10
```

---

## 🎉 部署成功！

| 项目 | 地址 |
|------|------|
| 应用 URL | http://your-ec2-public-ip |
| API 地址 | http://your-ec2-public-ip/api |
| SSH 连接 | ssh -i your-key.pem ubuntu@your-ec2-public-ip |
| PM2 管理 | pm2 monit / pm2 logs |

---

## 📚 有用的命令

```bash
# PM2 命令
pm2 status                    # 查看状态
pm2 logs                      # 查看日志
pm2 restart stock-kanban-api  # 重启应用
pm2 stop stock-kanban-api     # 停止应用
pm2 delete stock-kanban-api   # 删除应用

# Nginx 命令
sudo systemctl status nginx   # 查看状态
sudo systemctl restart nginx  # 重启服务
sudo systemctl stop nginx     # 停止服务
sudo nginx -t                 # 测试配置

# 更新应用
cd ~/stock_kanban
git pull origin main
npm install --production
npm run build
pm2 restart all

# 查看日志
tail -f ~/stock_kanban/logs/api-error.log
tail -f /var/log/nginx/stock_kanban_access.log
```

---

**祝部署顺利！** 🚀✨

有任何问题，请参考 [EC2_DEPLOYMENT.md](EC2_DEPLOYMENT.md)
