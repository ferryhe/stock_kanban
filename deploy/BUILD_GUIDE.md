# 在本地构建生产版本

## 为 EC2 构建

在本地计算机上运行以下命令来构建生产版本：

```bash
# 1. 安装依赖（如果未安装）
npm install

# 2. 构建前端和后端
npm run build

# 3. 验证构建输出
ls -la dist/

# 应该看到:
# dist/
# ├── index.cjs          # Node.js 生产应用
# └── public/            # 前端静态文件
#     ├── index.html
#     ├── assets/
#     └── ...
```

## 部署构建到 EC2

### 选项 A：使用 Git（推荐）

```bash
# 1. 推送代码到 GitHub
git add -A
git commit -m "Deploy to EC2"
git push origin main

# 2. 在 EC2 上拉取并构建
ssh -i your-key.pem ubuntu@your-ec2-ip
cd ~/stock_kanban
git pull origin main
npm install --production
npm run build
pm2 restart all
```

### 选项 B：直接上传文件

```bash
# 1. 压缩本地构建
tar -czf dist.tar.gz dist/ node_modules/

# 2. 上传到 EC2
scp -i your-key.pem dist.tar.gz ubuntu@your-ec2-ip:~/stock_kanban/

# 3. 在 EC2 上解压
ssh -i your-key.pem ubuntu@your-ec2-ip
cd ~/stock_kanban
tar -xzf dist.tar.gz
pm2 restart all
```

### 选项 C：使用 rsync（增量同步，更快）

```bash
# 同步文件夹
rsync -avz --exclude='node_modules' --exclude='.git' \
  -e "ssh -i your-key.pem" \
  ./ ubuntu@your-ec2-ip:~/stock_kanban/

# 在 EC2 上
ssh -i your-key.pem ubuntu@your-ec2-ip
cd ~/stock_kanban
npm install --production
npm run build
pm2 restart all
```

## 构建优化选项

### 生产优化构建

编辑 `vite.config.ts`：

```typescript
build: {
  outDir: path.resolve(import.meta.dirname, "dist/public"),
  emptyOutDir: true,
  minify: 'terser',  // 使用 terser 压缩 (更小)
  sourcemap: false,   // 不生成 sourcemap (更小)
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
      }
    }
  }
}
```

### 检查构建大小

```bash
npm run build
du -sh dist/
du -sh dist/public/assets/
```

## 故障排除

### "dist 文件夹为空"

```bash
rm -rf dist/
npm run build
# 检查是否有错误
```

### "构建失败：TypeScript 错误"

```bash
npm run check  # 检查所有类型错误
# 修复错误后重试
npm run build
```

### "node_modules 损坏"

```bash
rm -rf node_modules package-lock.json
npm install --production
npm run build
```

## 部署后验证

在 EC2 上运行：

```bash
# 1. 检查应用是否运行
pm2 status

# 2. 检查日志
pm2 logs stock-kanban-api

# 3. 测试 API
curl http://localhost:3000/api/watchlists

# 4. 检查前端文件
ls -la dist/public/index.html
```

## 性能对比

| 类型 | 大小 | 下载时间 |
|------|------|---------|
| 开发版本 | 50-100MB | 5-10s |
| 生产版本 (压缩) | 5-10MB | <1s |
| 生产优化后 | 2-5MB | <0.5s |

---

**构建完成后，应用应该能在 EC2 上快速加载！** 🚀
