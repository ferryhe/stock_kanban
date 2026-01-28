# 快速解决方案 / Quick Solution

## 问题：网站更新后看不到变化
## Problem: Website updates not visible

---

## ✅ 立即执行这些步骤 / Run These Steps Now:

```bash
# 1. 进入项目目录
cd /home/ec2-user/stock_kanban

# 2. 拉取最新代码
git pull origin main

# 3. 运行更新后的部署脚本（会自动强制重建Docker镜像）
bash deploy/docker-deploy-simple.sh

# 4. 验证部署成功
bash deploy/verify-deployment.sh
```

## 🌐 浏览器缓存清除

部署完成后，请清除浏览器缓存：

**Chrome/Edge**: `Ctrl + Shift + Delete` → 选择"缓存的图片和文件" → 清除数据

**Firefox**: `Ctrl + Shift + Delete` → 选择"缓存" → 清除当前历史记录

**Safari**: `⌘ + Option + E`

**或者直接使用无痕/隐私模式测试**

---

## 🔍 这次修复了什么？

1. ✅ **强制Docker重建** - 部署脚本现在使用 `--no-cache` 标志，确保每次都重新构建
2. ✅ **文件名哈希** - JS/CSS文件现在包含哈希值（如 `index-abc123.js`），内容改变时哈希也改变
3. ✅ **缓存控制** - 设置了正确的HTTP头部，确保浏览器不会缓存HTML文件

## 📖 详细文档

- **完整更新指南**: [HOW_TO_UPDATE_WEBSITE.md](HOW_TO_UPDATE_WEBSITE.md)
- **技术细节**: [FIX_SUMMARY.md](FIX_SUMMARY.md)

## ❓ 还是看不到更新？

1. 确认容器正在运行: `docker ps | grep stock-kanban-app`
2. 检查镜像创建时间: `docker images | grep stock-kanban`
3. 查看容器日志: `docker logs stock-kanban-app --tail 50`
4. 使用无痕模式打开网站测试
5. 如果使用了Caddy/Nginx代理，可能需要重启它们

## 💡 以后如何避免这个问题？

每次更新代码后，始终运行：
```bash
bash deploy/docker-deploy-simple.sh
```

这个脚本已经更新，会自动：
- 强制重建Docker镜像（不使用缓存）
- 生成新的文件哈希
- 确保最新代码被部署

---

## English Summary

### What Changed:
1. Deployment scripts now force Docker rebuild with `--no-cache`
2. JS/CSS files now have content hashes in filenames
3. Proper cache control headers are set

### How to Deploy Updates:
```bash
bash deploy/docker-deploy-simple.sh
```

### After Deployment:
- Clear browser cache or use incognito mode
- Run `bash deploy/verify-deployment.sh` to verify

For details, see [HOW_TO_UPDATE_WEBSITE.md](HOW_TO_UPDATE_WEBSITE.md)
