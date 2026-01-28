# 网站更新问题修复总结 / Website Update Issue Fix Summary

## 问题描述 / Problem Description

用户反映在服务器上重启服务并运行 `.sh` 脚本后，最近的更新（指标解释和信号显示）在刷新网页后没有显示。

User reported that after restarting the service on the server and running the `.sh` script, recent updates (indicator explanations and signal display) were not showing up after refreshing the webpage.

## 根本原因分析 / Root Cause Analysis

### 1. Docker 镜像缓存问题
Docker 的构建过程默认使用缓存层，当更新代码后，如果不强制重建，Docker 可能会使用旧的缓存层，导致新代码没有被包含在镜像中。

Docker's build process uses cached layers by default. Without forcing a rebuild, Docker may use old cached layers, resulting in new code not being included in the image.

### 2. 浏览器缓存问题
浏览器会缓存静态资源（JS、CSS文件）。如果文件名不变，浏览器会继续使用缓存的旧文件，即使服务器上已经更新。

Browsers cache static resources (JS, CSS files). If filenames don't change, browsers continue using cached old files even though the server has updated.

### 3. 缺少缓存控制头
生产环境的静态文件服务没有正确设置 Cache-Control 头，导致浏览器和代理服务器可能过度缓存文件。

The static file server in production didn't properly set Cache-Control headers, causing browsers and proxy servers to potentially over-cache files.

## 解决方案 / Solution

### 1. 强制 Docker 镜像重建 (Force Docker Image Rebuild)

**修改的文件：**
- `deploy/docker-deploy.sh`
- `deploy/docker-deploy-simple.sh`

**改动：**
```bash
# 原来 / Before:
docker build -t stock-kanban:latest .

# 修改后 / After:
docker build --no-cache -t stock-kanban:latest .
```

**效果：**
`--no-cache` 标志强制 Docker 从头重建所有层，确保所有最新代码都被包含在镜像中。

The `--no-cache` flag forces Docker to rebuild all layers from scratch, ensuring all latest code is included in the image.

### 2. 启用文件名哈希（Cache Busting）

**修改的文件：**
- `vite.config.ts`

**改动：**
```typescript
build: {
  outDir: path.resolve(import.meta.dirname, "dist/public"),
  emptyOutDir: true,
  rollupOptions: {
    output: {
      // Add hash to filenames for cache busting
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash].[ext]'
    }
  }
}
```

**效果：**
每次构建时，JS/CSS 文件会包含内容哈希值（如 `index-yk1YeRUD.js`），内容改变时哈希值也改变，强制浏览器下载新文件。

Each build, JS/CSS files include content hashes (like `index-yk1YeRUD.js`). When content changes, the hash changes, forcing browsers to download new files.

### 3. 添加适当的缓存控制头 (Add Proper Cache Control Headers)

**修改的文件：**
- `server/static.ts`

**改动：**
```typescript
// Serve static files with proper cache control
app.use(express.static(distPath, {
  maxAge: 0,
  setHeaders: (res, filepath) => {
    // Cache hashed assets (JS/CSS with hash in filename) for 1 year
    if (filepath.match(/\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Don't cache index.html and other non-hashed files
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
```

**缓存策略：**
- **index.html**: 不缓存 (`no-cache`) - 始终获取最新版本
- **带哈希的资源** (`*.abc123.js`): 缓存1年 (`max-age=31536000`) - 因为哈希改变时文件名也改变
- **其他静态文件**: 不缓存

**Cache Strategy:**
- **index.html**: No cache - always fetch latest version
- **Hashed assets** (`*.abc123.js`): 1 year cache - because filename changes when hash changes
- **Other static files**: No cache

## 新增的文档和工具 / New Documentation and Tools

### 1. HOW_TO_UPDATE_WEBSITE.md
详细的网站更新指南，包括：
- 正确的更新步骤
- 常见问题解答
- 验证方法
- 快速命令参考

Comprehensive website update guide including:
- Correct update steps
- FAQ
- Verification methods
- Quick command reference

### 2. deploy/verify-deployment.sh
部署验证脚本，用于检查：
- 容器运行状态
- 镜像创建时间
- API 健康检查
- 网络配置
- 构建信息

Deployment verification script that checks:
- Container running status
- Image creation time
- API health check
- Network configuration
- Build information

**使用方法 / Usage:**
```bash
bash deploy/verify-deployment.sh
```

### 3. 更新了 README.md
在 README 中添加了指向更新指南的链接，方便用户快速找到解决方案。

Added link to update guide in README for easy access to the solution.

## 如何使用 / How to Use

### 完整的更新流程 / Complete Update Process

```bash
# 1. 进入项目目录 / Go to project directory
cd /home/ec2-user/stock_kanban

# 2. 拉取最新代码 / Pull latest code
git pull origin main

# 3. 运行部署脚本（会自动强制重建）/ Run deployment script (auto force rebuild)
bash deploy/docker-deploy-simple.sh

# 4. 验证部署 / Verify deployment
bash deploy/verify-deployment.sh

# 5. 清除浏览器缓存或使用无痕模式测试
# Clear browser cache or test in incognito mode
```

## 技术细节 / Technical Details

### 缓存破坏机制 (Cache Busting Mechanism)

**之前 / Before:**
```
/assets/index.js      (文件名不变 / filename doesn't change)
/assets/index.css     (浏览器使用缓存 / browser uses cache)
```

**之后 / After:**
```
/assets/index-yk1YeRUD.js      (内容改变 -> 哈希改变 / content changes -> hash changes)
/assets/index-Dcn2P1zo.css     (新哈希 -> 浏览器下载新文件 / new hash -> browser downloads new file)
```

### HTTP 头部示例 (HTTP Header Examples)

**index.html:**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**index-yk1YeRUD.js:**
```
Cache-Control: public, max-age=31536000, immutable
```

这种策略的优势：
1. **index.html** 始终从服务器获取最新版本
2. **index.html** 引用最新的哈希文件名
3. 带哈希的资源可以安全地长期缓存
4. 更新时自动使用新文件

Advantages of this strategy:
1. **index.html** always fetches latest version from server
2. **index.html** references latest hashed filenames
3. Hashed assets can be safely cached long-term
4. Updates automatically use new files

## 验证更新 / Verify Updates

### 1. 检查镜像是否重新构建
```bash
docker images stock-kanban:latest
```
应该看到最新的创建时间 / Should see recent creation time

### 2. 检查文件哈希值
```bash
ls dist/public/assets/
```
应该看到新的哈希值 / Should see new hash values

### 3. 检查 HTTP 头部
```bash
curl -I http://localhost:3000/
```
应该看到 Cache-Control 头部 / Should see Cache-Control headers

### 4. 测试浏览器
使用无痕模式打开网站，确保没有使用旧缓存
Open website in incognito mode to ensure no old cache is used

## 预期效果 / Expected Results

✅ 代码更新后，运行部署脚本会强制重建 Docker 镜像
✅ 每次构建都会生成新的文件哈希值
✅ 浏览器会自动下载新的 JS/CSS 文件
✅ 用户刷新页面后可以立即看到更新

✅ After code updates, deployment script forces Docker image rebuild
✅ Each build generates new file hashes
✅ Browsers automatically download new JS/CSS files
✅ Users see updates immediately after page refresh

## 后续维护 / Future Maintenance

### 每次更新代码时 / When updating code:
1. 运行 `bash deploy/docker-deploy-simple.sh`（已包含 `--no-cache`）
2. 不需要手动清除 Docker 缓存
3. 文件哈希会自动更新

1. Run `bash deploy/docker-deploy-simple.sh` (already includes `--no-cache`)
2. No need to manually clear Docker cache
3. File hashes update automatically

### 如果需要快速部署 / For quick deployments:
可以临时去掉 `--no-cache` 以加快构建速度，但要确保代码更改会影响被缓存的层。

Can temporarily remove `--no-cache` for faster builds, but ensure code changes affect cached layers.

## 总结 / Summary

这次修复通过三个层面解决了网站更新不显示的问题：

1. **构建层面**: 强制 Docker 镜像重建
2. **资源层面**: 使用哈希文件名实现缓存破坏
3. **传输层面**: 设置正确的 HTTP 缓存头部

这些改动确保了代码更新能够及时、正确地传递到用户浏览器。

This fix addresses the website update visibility issue at three levels:

1. **Build level**: Force Docker image rebuild
2. **Asset level**: Cache busting with hashed filenames
3. **Transfer level**: Proper HTTP cache headers

These changes ensure code updates are delivered timely and correctly to user browsers.
