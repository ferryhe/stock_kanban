# ⚡ 快速开始 (5 分钟)

## 🎯 最快的启动方式

### 方式 1: 一键启动 (推荐 👍)

直接双击：
```
start-dev.bat
```

脚本会自动：
- ✅ 检查依赖并安装（如果需要）
- ✅ 启动后端服务器
- ✅ 启动前端开发服务器  
- ✅ 打开浏览器

### 方式 2: 手动启动

**第一步** - 打开 PowerShell/cmd，运行：
```powershell
cd c:\Projects\stock_kanban
npm install  # 首次运行需要
npm run dev
```

**第二步** - 打开第二个 PowerShell/cmd，运行：
```powershell
cd c:\Projects\stock_kanban
npm run dev:client
```

**第三步** - 在浏览器访问：
```
http://localhost:5000
```

## 🔍 检查环境

如果不确定环境是否正常，运行诊断脚本：
```
diagnose.bat
```

会自动检查：
- Node.js 是否安装
- npm 是否可用
- 项目文件是否完整
- 端口是否被占用
- 依赖是否已安装

## 📍 关键网址

| 项目 | 网址 |
|------|------|
| 应用 | http://localhost:5000 |
| API 基址 | http://localhost:3000 |
| Stock API | http://localhost:3000/api/stocks/ai_chips |

## ❌ 常见问题

| 问题 | 解决方案 |
|------|---------|
| npm: 无法识别 | 安装 Node.js，重启终端 |
| 端口被占用 | 关闭占用端口的应用，或改端口 |
| 依赖安装失败 | 运行 `npm install --legacy-peer-deps` |
| 无法加载股票数据 | 确保网络连接，检查 Yahoo Finance API |
| 没有显示量化指标 | 检查 `data/quant-metrics.json` 是否存在 |

## 📚 详细指南

更多信息请查看：[LOCAL_STARTUP.md](LOCAL_STARTUP.md)

---

**现在就试试吧！** 🚀
