# AWS EC2 部署完全指南

## 🎯 架构概览

```
EC2 Instance (t3-medium)
├── Node.js 应用
│   ├── API 服务器 (Port 3000)
│   └── PM2 进程管理
├── Nginx (反向代理)
│   ├── 静态文件服务 (前端)
│   └── API 代理转发
└── 数据文件
    └── data/quant-metrics.json
```

## 📋 前置要求

- AWS 账户
- EC2 实例 (t3-medium, Ubuntu 22.04 LTS)
- SSH 访问权限
- 安全组已配置 (允许 80, 443, 22 端口)

## 🚀 部署步骤

### 第 1 步：启动 EC2 实例

1. 在 AWS 控制台创建 EC2 实例
2. 选择 **t3-medium** 类型
3. 选择 **Ubuntu 22.04 LTS** AMI
4. 配置安全组：
   - 入站规则：
     - SSH (22) - 来自你的 IP
     - HTTP (80) - 来自 0.0.0.0/0
     - HTTPS (443) - 来自 0.0.0.0/0 (可选)
5. 分配 20GB+ EBS 存储
6. 启动实例，保存密钥对文件 (.pem)

### 第 2 步：连接到 EC2 实例

```bash
# 使用 SSH 连接
# 格式: ssh -i your-key.pem ec2-user@your-ec2-ip
# Ubuntu AMI 用户名是 'ubuntu'

ssh -i your-key.pem ubuntu@your-ec2-public-ip

# 例如:
ssh -i ~/Downloads/stock-kanban.pem ubuntu@3.98.174.50
```

### 第 3 步：运行自动部署脚本

在 EC2 实例上运行：

```bash
# 选项 A: 使用 curl 直接运行脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/main/deploy/ec2-setup.sh | bash

# 或选项 B: 手动下载后运行
wget https://raw.githubusercontent.com/your-repo/main/deploy/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

或者按照以下手动步骤：

### 第 3 步（手动）：手动部署

```bash
# 1. 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 2. 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 PM2 和 Nginx
sudo npm install -g pm2
sudo apt-get install -y nginx

# 4. 创建应用目录
mkdir -p ~/stock_kanban
cd ~/stock_kanban

# 5. 克隆项目 (使用你的 repo URL)
git clone https://github.com/your-username/stock_kanban.git .
# 或如果已有代码，直接上传文件

# 6. 安装依赖
npm install --production

# 7. 复制环境配置
cp .env.production.example .env.production
# 编辑 .env.production 并设置正确的值

# 8. 构建项目
npm run build
```

### 第 4 步：配置 PM2

```bash
# 1. 启动应用
pm2 start ecosystem.config.js --env production

# 2. 查看应用状态
pm2 status
pm2 logs

# 3. 设置开机自启
pm2 startup
# 复制输出的命令并运行
pm2 save
```

### 第 5 步：配置 Nginx 反向代理

```bash
# 1. 复制 Nginx 配置
sudo cp deploy/nginx-stock-kanban.conf /etc/nginx/sites-available/stock-kanban

# 2. 创建符号链接
sudo ln -s /etc/nginx/sites-available/stock-kanban /etc/nginx/sites-enabled/stock-kanban

# 3. 删除默认配置 (可选)
sudo rm /etc/nginx/sites-enabled/default

# 4. 测试 Nginx 配置
sudo nginx -t

# 5. 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 6. 查看状态
sudo systemctl status nginx
```

### 第 6 步：配置 SSL/TLS (可选但推荐)

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 1. 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 2. 获取证书
sudo certbot --nginx -d your-domain.com

# 3. 设置自动续期
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 第 7 步：配置定期数据更新

编辑 crontab 以定期更新量化指标：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天早上 9 点更新）
0 9 * * * cd /home/ubuntu/stock_kanban && git pull && pm2 restart all
```

或使用 GitHub Actions 自动推送更新。

## ✅ 验证部署

```bash
# 1. 检查 Node.js 应用
curl http://localhost:3000/api/watchlists

# 2. 检查 Nginx
curl http://your-ec2-ip/

# 3. 查看 PM2 日志
pm2 logs stock-kanban-api

# 4. 查看 Nginx 日志
sudo tail -f /var/log/nginx/stock_kanban_access.log
sudo tail -f /var/log/nginx/stock_kanban_error.log
```

## 📊 监控和维护

### 查看应用状态

```bash
# PM2 监控面板
pm2 monit

# 查看日志
pm2 logs stock-kanban-api

# 重启应用
pm2 restart stock-kanban-api

# 停止应用
pm2 stop stock-kanban-api

# 删除应用
pm2 delete stock-kanban-api
```

### 更新代码

```bash
cd ~/stock_kanban
git pull origin main
npm install --production
npm run build
pm2 restart stock-kanban-api
```

### 查看系统资源

```bash
# 内存和 CPU
free -h
top

# 磁盘空间
df -h

# 网络连接
netstat -tlnp | grep node
```

## 🔧 常见问题

### Q1: 502 Bad Gateway

**原因**: Node.js 应用未运行或崩溃

**解决**:
```bash
pm2 status
pm2 logs stock-kanban-api
# 检查日志找出错误，修复后重启
pm2 restart stock-kanban-api
```

### Q2: Port 3000 already in use

**原因**: 端口被占用

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3000
# 杀死进程或使用另一个端口
pm2 delete all && pm2 start ecosystem.config.js
```

### Q3: 静态文件 404 错误

**原因**: 前端构建文件不存在

**解决**:
```bash
npm run build
sudo systemctl reload nginx
```

### Q4: 无法连接到后端 API

**原因**: Nginx 代理配置错误

**解决**:
```bash
# 检查 Nginx 配置
sudo nginx -t
# 检查后端是否运行
pm2 status
curl http://localhost:3000/api/watchlists
```

### Q5: 日志文件过大

**清理日志**:
```bash
pm2 flush
# 或手动清理
rm logs/*.log
```

## 📈 性能优化

### EC2 配置优化（t3-medium）

```bash
# 检查 swap 空间
free -h

# 如果需要增加 swap（可选）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Node.js 性能调整

编辑 `ecosystem.config.js`：
```javascript
// 增加最大内存限制
max_memory_restart: "1G"
// 根据 CPU 核心数调整实例数
instances: 2  // t3-medium 有 2 个 vCPU
```

### Nginx 缓存优化

已在配置文件中包含：
- 静态文件 1 小时缓存
- HTML 禁用缓存（总是最新）
- 压缩响应 (gzip)

## 🔐 安全建议

1. **更新系统**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

2. **配置防火墙**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **使用 HTTPS**
   - 见上面的 SSL/TLS 配置

4. **定期备份**
   ```bash
   # 备份数据文件
   tar -czf stock_kanban_backup_$(date +%Y%m%d).tar.gz ~/stock_kanban/data/
   ```

5. **监控日志**
   ```bash
   sudo tail -f /var/log/nginx/stock_kanban_error.log
   pm2 logs
   ```

## 📡 CI/CD 自动部署 (可选)

### 使用 GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to EC2

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/stock_kanban
            git pull origin main
            npm install --production
            npm run build
            pm2 restart all
```

## 📝 部署检查清单

- [ ] EC2 实例已创建并运行
- [ ] SSH 连接正常
- [ ] Node.js 和 npm 已安装
- [ ] PM2 已安装和配置
- [ ] 项目代码已上传
- [ ] 依赖已安装 (`npm install --production`)
- [ ] 生产环境变量已配置 (`.env.production`)
- [ ] 项目已构建 (`npm run build`)
- [ ] PM2 应用已启动和配置自启
- [ ] Nginx 已配置和启动
- [ ] 静态文件可以访问
- [ ] API 端点可以访问
- [ ] SSL/TLS 已配置 (可选)
- [ ] 定期更新任务已配置
- [ ] 监控告警已设置 (可选)

## 🆘 获取帮助

如果遇到问题：

1. 检查日志：`pm2 logs` 和 Nginx 日志
2. 检查端口：`lsof -i -P -n`
3. 检查网络：`curl http://localhost:3000/api/watchlists`
4. 查看系统资源：`top` 和 `df -h`

---

**部署完成后**，应用应该在 `http://your-ec2-ip` 可访问 🎉

享受你的生产环境！ 🚀
