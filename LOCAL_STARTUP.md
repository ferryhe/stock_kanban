# 🚀 本地启动指南

## 项目概述

这是一个全栈应用，包含：
- **前端**: React + TypeScript + Vite + Tailwind CSS
- **后端**: Express.js + Node.js
- **特性**: 股票监控、实时数据、量化指标

## 系统要求

- ✅ Node.js v24.12.0 或更高版本
- ✅ npm 或 yarn（推荐 npm）
- ✅ 磁盘空间：约 500MB（node_modules）
- ✅ 网络连接（用于 Yahoo Finance API 数据）

## 快速启动（3 步）

### 1️⃣ 安装依赖

```bash
cd c:\Projects\stock_kanban
npm install
```

**首次安装需要 2-5 分钟**，会自动下载所有依赖。

### 2️⃣ 启动后端服务器

打开**第一个终端**窗口：

```bash
npm run dev
```

你会看到类似的输出：
```
[Express] Server running on http://localhost:3000
[API] Stock data endpoints ready
[Quant] Loaded metrics for 10 tickers
```

### 3️⃣ 启动前端开发服务器

打开**第二个终端**窗口：

```bash
npm run dev:client
```

你会看到：
```
VITE v5.x.x  ready in 500 ms

➜  Local:   http://localhost:5000/
```

## 📱 访问应用

在浏览器中打开：**http://localhost:5000**

## 🎯 可用命令

| 命令 | 说明 | 端口 |
|------|------|------|
| `npm run dev` | 启动后端开发服务器 | 3000 |
| `npm run dev:client` | 启动前端开发服务器 | 5000 |
| `npm run build` | 构建生产版本 | - |
| `npm run start` | 启动生产服务器 | 3000 |
| `npm run check` | TypeScript 类型检查 | - |

## 🔧 项目结构

```
stock_kanban/
├── client/                    # 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   ├── lib/              # 工具函数
│   │   ├── pages/            # 页面
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── server/                    # 后端应用
│   ├── index.ts              # 入口点
│   ├── routes.ts             # API 路由
│   ├── stockService.ts       # 股票数据服务
│   └── storage.ts            # 数据存储
├── shared/                    # 共享代码
│   └── schema.ts             # 数据类型定义
├── data/                      # 量化指标数据
│   └── quant-metrics.json
├── package.json              # 依赖配置
└── tsconfig.json             # TypeScript 配置
```

## 📊 功能演示

启动后应该看到：

1. **首页** - 股票 Kanban 看板
2. **股票卡片** - 显示价格、变化、技术指标
3. **量化指标** - 显示评分、排名、风险指标（如果有数据）
4. **搜索功能** - 搜索股票
5. **看板功能** - 不同分类的看板

## 🌐 API 端点

### 获取股票数据
```
GET http://localhost:3000/api/stocks/ai_chips
```

### 获取市场概览
```
GET http://localhost:3000/api/market
```

### 搜索股票
```
GET http://localhost:3000/api/search?q=AAPL
```

### 获取股票图表
```
GET http://localhost:3000/api/chart/AAPL?interval=1mo
```

## 🚨 常见问题

### Q1: "npm command not found"

**原因**: PowerShell 执行策略限制

**解决**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q2: "ERR! code ERESOLVE" - 依赖冲突

**解决**:
```bash
npm install --legacy-peer-deps
```

### Q3: 端口 3000 或 5000 已被占用

**更改端口**:

后端：编辑 `server/index.ts`，修改监听端口
```typescript
const PORT = 3001; // 改为其他端口
```

前端：在命令行指定
```bash
npm run dev:client -- --port 5001
```

### Q4: "Cannot find module 'yahoo-finance2'"

**解决**:
```bash
npm install yahoo-finance2
```

### Q5: 无法加载量化指标

**检查**:
1. `data/quant-metrics.json` 文件是否存在
2. 查看后端日志中 `[Quant]` 开头的消息
3. 文件格式是否正确（JSON）

## 🔍 调试

### 查看后端日志

后端会输出所有 API 请求和错误：
```
[API] Fetching fresh data for AAPL, NVDA, ...
[Quant] Loaded metrics for 10 tickers
[Error] Failed to fetch INVALID_TICKER
```

### 查看前端日志

打开浏览器开发工具 (F12) → Console 标签

### 网络调试

打开浏览器开发工具 (F12) → Network 标签，查看 API 请求和响应

## 🌙 开发工作流

### 修改前端代码

1. 编辑 `client/src/` 中的文件
2. Vite 会自动热重载浏览器
3. 无需重启应用

### 修改后端代码

1. 编辑 `server/` 中的文件
2. 后端会自动重启（tsx watch 模式）
3. 刷新浏览器查看更新

### 修改类型定义

编辑 `shared/schema.ts` 后：
```bash
npm run check  # 检查类型错误
```

## 📦 构建生产版本

### 构建

```bash
npm run build
```

生成的文件在 `dist/` 目录

### 启动生产服务器

```bash
npm start
```

## 🔐 生产部署

部署前检查清单：

- [ ] 所有环境变量已配置
- [ ] API 密钥已设置（如需要）
- [ ] 数据库连接已配置（如需要）
- [ ] `npm run build` 成功完成
- [ ] `npm run check` 无错误
- [ ] 测试所有 API 端点

## 📚 更多文档

- [量化指标集成](QUANT_METRICS_INTEGRATION.md)
- [Git 工作流程](GIT_WORKFLOW.md)
- [迁移完成报告](SETUP_COMPLETE.md)

## 💡 实用技巧

### 快速清除缓存并重新安装

```bash
rm -r node_modules package-lock.json
npm install
```

### 检查 TypeScript 错误

```bash
npm run check
```

### 同时运行前后端

在根目录创建 `start-dev.bat`：

```batch
@echo off
start cmd /k "npm run dev"
start cmd /k "npm run dev:client"
```

然后直接双击运行。

## 🎮 测试应用

启动后可以：

1. ✅ 查看多个预设看板（AI & Chips、Nuclear/Energy 等）
2. ✅ 搜索任何股票代码
3. ✅ 查看技术指标（RSI、MACD、Bollinger Bands 等）
4. ✅ 查看量化指标（Rank、Score、Risk Metrics 等）
5. ✅ 自定义看板和关注列表

## 🆘 获取帮助

如果遇到问题：

1. 查看后端日志（终端输出）
2. 查看前端日志（浏览器 F12）
3. 检查 `QUANT_METRICS_INTEGRATION.md`
4. 检查 `GIT_WORKFLOW.md`

## ✨ 就这么简单！

```bash
# 终端 1
npm install && npm run dev

# 终端 2
npm run dev:client

# 浏览器
http://localhost:5000
```

享受开发！🚀
