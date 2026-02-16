# 💻 Stock Kanban - Local Development Guide

**Updated**: 2026-02-08

在本地机器上进行 Stock Kanban 开发。

---

## Windows 本地开发（推荐）

### 快速启动

```powershell
start-dev.bat
```

这会自动打开两个终端：
- **后端终端**: Node.js API 服务器（localhost:3000）
- **前端终端**: Vite 开发服务器（localhost:5000）

### 手动启动

```bash
# 终端 1: 后端
npm install
npm run dev

# 终端 2: 前端
npm run dev:client
```

---

## Linux/macOS 本地开发

```bash
npm install
npm run dev
```

或者分开运行：

```bash
# 终端 1: 后端
npm install
npm run dev

# 终端 2: 前端（在另一个终端）
npm run dev:client
```

---

## 项目结构

```
stock_kanban/
├── client/               # React 前端应用
│   └── src/
├── server/               # Node.js/Express 后端
│   └── index.ts
├── shared/               # 共享代码
│   └── schema.ts        # 数据库模型（Drizzle ORM）
├── data/                 # 数据文件（中文名称映射等）
└── scripts/              # 工具脚本
```

---

## 可用命令

### 开发相关

```bash
# 本地开发（前端 + 后端）
npm run dev         # 后端开发模式
npm run dev:client  # 前端开发模式（Vite）

# 构建
npm run build       # 完整构建（前端 + 后端）

# 类型检查
npm check          # TypeScript 检查

# 生产启动
npm start          # 启动生产构建结果
```

### 数据库相关

```bash
# 准备 PostgreSQL（初次或需要时）
npm run db:prepare

# 生成/更新数据库模式
npm run db:push
```

### 工具脚本

```bash
# 性能基准测试
npm run benchmark:price-cache

# 验证 pgcrypto 扩展
npm run db:prepare
```

---

## 开发工作流

### 1. 首次设置

```bash
git clone <repo-url>
cd stock_kanban
npm install
npm run build
```

### 2. 启动开发服务器

**Windows:**
```bash
start-dev.bat
```

**Linux/macOS:**
```bash
# 终端 1
npm run dev

# 终端 2（另开一个）
npm run dev:client
```

### 3. 访问应用

- **前端**: http://localhost:5000
- **后端 API**: http://localhost:3000/api

### 4. 做改动

编辑代码 - Vite 和 Node 会自动热重载

### 5. 检查错误

```bash
npm check  # 类型检查
```

---

## IDE 配置

### VS Code 推荐扩展

- **TypeScript Vue Plugin (Volar)**
- **ESLint**
- **Prettier**
- **SQL Tools**（数据库调试）

### 推荐设置 (.vscode/settings.json)

```json
{
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}
```

---

## 故障排查

### 问题：127.0.0.1:3000 已被占用

```bash
# 查找占用进程
# Windows
Get-NetTCPConnection -LocalPort 3000

# Linux/macOS
lsof -i :3000

# 杀死进程
# Windows PowerShell
Get-Process -Name node | Stop-Process

# Linux/macOS
kill -9 <PID>
```

### 问题：npm 安装缓慢

```bash
# 清空缓存
npm cache clean --force

# 使用淘宝镜像（中国）
npm config set registry https://registry.npmmirror.com
```

### 问题：TypeScript 报错

```bash
npm check    # 查看错误列表
npm install  # 确保依赖完整
```

### 问题：数据库连接失败

开发环境可以不使用 PostgreSQL（内存模式）。如需要数据库：

```bash
# 对于开发，可使用本地 PostgreSQL
# 或通过 Docker:
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=stock_kanban \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16-alpine

# 设置 DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/stock_kanban"
npm run db:prepare
npm run db:push
```

---

## 常见开发任务

### 添加新 API 端点

1. 在 `server/index.ts` 中添加 路由处理器
2. 在 `shared/schema.ts` 中定义数据类型（如必要）
3. 前端通过 `/api/your-endpoint` 调用

### 修改数据库模型

1. 编辑 `shared/schema.ts`
2. 运行 `npm run db:push`
3. 重启后端服务

### 更新前端样式

使用 Tailwind CSS（已集成）。样式文件在 `client/src/`

### 添加新依赖

```bash
npm install package-name
npm run build  # 确保构建成功
```

---

## 性能优化

### 禁用不需要的日志

在开发环境中，设置：

```bash
export LOG_LEVEL=warn
npm run dev
```

### 前端开发优化

Vite 已配置热模块替换 (HMR)，无需手动刷新。

### 数据库性能

对于大量数据，可使用上下文本或分页查询预防加载缓慢。

---

## 提交前检查清单

- [ ] 代码通过 TypeScript 检查：`npm check`
- [ ] 没有 console.log（生产环保不使用）
- [ ] 有注释说明复杂逻辑
- [ ] 数据库改动已运行 `npm run db:push`
- [ ] 测试了主要功能流程
- [ ] Git 提交信息清晰

---

## 更多信息

- **设计文档**: [CONSOLIDATED_DESIGN](./CONSOLIDATED_DESIGN.md)
- **架构说明**: [INTEGRATED_ARCHITECTURE](./INTEGRATED_ARCHITECTURE.md)
- **部署指南**: [DEPLOYMENT_INDEX](./DEPLOYMENT_INDEX.md)

---

**Version**: 2.0  
**Last Updated**: 2026-02-08
