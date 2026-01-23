# 📈 Stock Kanban - 股票监控应用

![Status](https://img.shields.io/badge/status-ready%20to%20run-brightgreen)
![Node](https://img.shields.io/badge/node-v24.12.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 快速开始

### ⚡ 本地开发
```bash
# Windows: 双击这个文件
start-dev.bat

# 或手动启动
npm install
npm run dev          # 终端 1 - 后端
npm run dev:client   # 终端 2 - 前端

# 访问应用
http://localhost:5000
```

### 🐳 Docker + Caddy 部署（推荐）
已有 Caddy 的云环境最佳选择！
```bash
# 云端自动部署
bash deploy/docker-deploy.sh

# 或手动步骤
git clone https://github.com/your-username/stock_kanban.git
cd stock_kanban
docker-compose up -d
# 更新 Caddy 配置（见下方）
```

👉 **[Docker + Caddy 完全指南 →](deploy/DOCKER_CADDY_DEPLOYMENT.md)**

### ☁️ AWS EC2 原生部署
不使用 Docker，直接用 PM2 和 Nginx 的方案
```bash
chmod +x deploy/ec2-setup.sh
./deploy/ec2-setup.sh
```

👉 **[本地启动详细指南 →](START_NOW.md)**  
👉 **[EC2 原生部署指南 →](deploy/EC2_DEPLOYMENT.md)**

## 📋 项目概述

一个全功能的股票监控和分析平台，集成了技术指标和量化分析。

### ✨ 主要特性

- 📊 **实时股票数据** - 来自 Yahoo Finance
- 📈 **技术指标** - RSI、MACD、Bollinger Bands、SMA20 等
- 🎯 **量化分析** - Ensemble Score、Rank、风险指标、预测回报
- 🎨 **Kanban 看板** - 多个预设关注列表
- 🔍 **股票搜索** - 快速查找任何股票
- 📱 **响应式设计** - 适配所有设备
- ⚡ **实时更新** - 动态加载最新数据

## 🏗️ 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式
- **Framer Motion** - 动画
- **React Query** - 数据管理

### 后端
- **Express.js** - 服务器框架
- **Node.js** - 运行环境
- **Yahoo Finance 2** - 股票数据 API
- **TypeScript** - 类型安全

## 📂 项目结构

```
stock_kanban/
├── client/                   # 前端应用 (React)
│   ├── src/
│   │   ├── components/      # 可复用组件
│   │   ├── lib/            # 工具函数
│   │   ├── pages/          # 页面
│   │   ├── hooks/          # 自定义 Hook
│   │   └── App.tsx
│   └── index.html
├── server/                   # 后端应用 (Express)
│   ├── index.ts            # 入口点
│   ├── routes.ts           # API 路由
│   ├── stockService.ts     # 股票数据服务
│   └── storage.ts          # 数据存储
├── shared/                   # 共享代码
│   └── schema.ts           # 数据类型
├── data/                     # 数据文件
│   └── quant-metrics.json  # 量化指标数据
├── scripts/                  # 工具脚本
├── package.json            # 依赖配置
└── tsconfig.json           # TypeScript 配置
```

## 🚀 可用命令

```bash
# 开发环境
npm run dev              # 启动后端开发服务器
npm run dev:client       # 启动前端开发服务器
npm run build           # 构建生产版本
npm run start           # 启动生产服务器
npm run check           # 类型检查

# 更新数据
./scripts/update-quant-metrics.bat  # Windows
./scripts/update-quant-metrics.sh   # Linux/Mac
```

## 📊 API 端点

```
GET  /api/stocks/:watchlistId     # 获取看板股票
GET  /api/market                  # 获取市场概览
GET  /api/search?q=AAPL          # 搜索股票
GET  /api/chart/:ticker           # 获取图表数据
GET  /api/watchlists              # 获取所有看板
```

## 🎯 量化指标

集成来自 `stock_quant_work` 项目的分析：

- **Score** - 汇总集合分数
- **Rank** - 排名（1 最优）
- **Predicted Return** - 20 天预测回报
- **Risk Metrics**:
  - `vol60` - 60 日波动率 z-score
  - `maxdd252` - 252 日最大回撤 z-score
- **Status Bucket** - 信号分类 (HOLD/LONG/SHORT)

📝 参考：[QUANT_METRICS_INTEGRATION.md](QUANT_METRICS_INTEGRATION.md)

## 🌐 环境要求

- Node.js v18.0.0 或更高版本
- npm v8.0.0 或更高版本
- 网络连接（用于获取股票数据）

## 📖 文档

| 文档 | 说明 |
|------|------|
| [START_NOW.md](START_NOW.md) | 立即开始（推荐首先阅读） |
| [QUICK_START.md](QUICK_START.md) | 5 分钟快速开始 |
| [LOCAL_STARTUP.md](LOCAL_STARTUP.md) | 完整本地启动指南 |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Git 工作流和数据同步 |
| [QUANT_METRICS_INTEGRATION.md](QUANT_METRICS_INTEGRATION.md) | 量化指标集成详情 |
| [SETUP_COMPLETE.md](SETUP_COMPLETE.md) | 完成状态报告 |

## 🔧 开发工作流

1. **编辑代码** - 所有文件都支持热重载
2. **查看更改** - 浏览器和后端会自动更新
3. **运行测试** - `npm run check` 检查类型
4. **构建生产** - `npm run build` 生成最终版本

## 📊 看板示例

### 预设看板
- 🔥 **AI & Chips** - NVDA, AMD, TSM, PLTR
- ⚛️ **Nuclear/Energy** - OKLO, SMR, CCJ
- 📉 **Market Indices** - SPY, QQQ, IWM
- 👀 **High Volatility** - UVIX, SVIX

### 自定义看板
支持添加自己的股票关注列表，数据存储在浏览器本地。

## 🐛 故障排除

### 常见问题

**Q: npm 无法识别？**
```powershell
# 检查 Node.js
node --version

# 重启终端或 VS Code
```

**Q: 端口被占用？**
```bash
# 更改前端端口
npm run dev:client -- --port 5001

# 或关闭占用端口的应用
```

**Q: 无法加载股票数据？**
- 检查网络连接
- 检查 Yahoo Finance API 是否可用
- 查看后端日志中的错误信息

**Q: 没有显示量化指标？**
- 确保 `data/quant-metrics.json` 存在
- 检查文件格式是否正确
- 查看后端日志 `[Quant]` 消息

更多帮助见 [LOCAL_STARTUP.md](LOCAL_STARTUP.md#常见问题)

## 📈 截图

*应用启动后的样子*

```
http://localhost:5000

┌─────────────────────────────────────────┐
│  Stock Kanban - 股票监控应用             │
├─────────────────────────────────────────┤
│                                         │
│  看板选择:                               │
│  [🔥 AI & Chips] [⚛️ Nuclear] ...      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ NVDA  $135.20  +2.5%            │   │
│  │ NVIDIA Corporation              │   │
│  │ [Rank 1] [Score 0.85]           │   │
│  │ Risk: Vol60: -0.98 MaxDD: 0.10  │   │
│  │ Pred.Return: 3.56%              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ... 更多股票卡 ...                    │
│                                         │
└─────────────────────────────────────────┘
```

## 🎓 学习资源

- [React 官方文档](https://react.dev)
- [Express.js 官方文档](https://expressjs.com)
- [TypeScript 官方文档](https://www.typescriptlang.org)
- [Tailwind CSS 官方文档](https://tailwindcss.com)
- [Docker 官方文档](https://docs.docker.com)
- [Caddy 官方文档](https://caddyserver.com/docs)

## 🌐 部署方案对比

| 方案 | 适用场景 | 优点 |
|------|--------|------|
| **本地开发** | 功能开发、测试 | 快速迭代 |
| **Docker + Caddy** ✅ | 已有 Caddy 的云环境 | 统一管理、自动 SSL |
| **EC2 原生** | 独立 EC2 实例 | 完整控制 |

**推荐**: 如果已有 Caddy 环境，用 Docker 部署最简洁！

## 📝 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献

欢迎提出问题和建议！

## 📞 支持

遇到问题？

1. **本地开发**: [LOCAL_STARTUP.md](LOCAL_STARTUP.md)
2. **Docker 部署**: [DOCKER_CADDY_DEPLOYMENT.md](deploy/DOCKER_CADDY_DEPLOYMENT.md) ⭐
3. **EC2 部署**: [EC2_DEPLOYMENT.md](deploy/EC2_DEPLOYMENT.md)

## 🎉 现在就开始吧！

```bash
# 本地开发 (最快)
npm install && npm run dev  # 终端 1
npm run dev:client          # 终端 2

# 云端 Docker 部署 (推荐) ⭐
bash deploy/docker-deploy.sh

# 查看日志
docker logs -f stock-kanban-app
```

👉 **[快速启动 →](START_NOW.md)** | **[Docker 部署 →](deploy/DOCKER_CADDY_DEPLOYMENT.md)**

---

**最后更新**: 2026-01-23  
**状态**: ✅ 生产就绪 (Docker + Caddy)  
**维护者**: 你
