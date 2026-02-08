# Stock Kanban - 股票监控应用

一个用于股票监控与量化分析的看板应用，聚合技术指标与量化指标，帮助快速筛选和对比标的。

## 主要功能

- 实时行情与基础指标展示
- 常用技术指标（RSI / MACD / Bollinger / SMA20）
- 量化指标与风险指标（Rank / Score / Predicted Return / vol60 / maxdd252 / Signal）
- 多看板管理与自定义股票列表
- 指标点击解释与交互式说明

## 量化指标说明

量化数据存放在 `data/quant-metrics-<market>.json`（如 `quant-metrics-us.json` / `quant-metrics-cn.json` / `quant-metrics-hk.json`），文件结构为 `{ metadata, data }`。

- `score`：综合评分（0~1，越小排名越靠前；基于多模型排名结果）
- `rank`：排名名次（1 为最好）
- `predictedReturn`：未来 20 个交易日的预测收益
- `risk.vol60`：60 日波动率 z-score（越高越波动）
- `risk.maxdd252`：252 日最大回撤 z-score（越低/越负回撤越大）
- `signal`：交易信号（BUY / SELL / HOLD / RISK_ALERT）

## 量化数据元信息

- `metadata.generated_at_utc`：生成时间（UTC，ISO 字符串）
- `metadata.generated_at_local`：生成时的本地时间（ISO 字符串）
- `metadata.timezone`：生成时使用的 IANA 时区
- `metadata.data_date`：数据截面时间
- `metadata.config_file`：配置文件名
- `metadata.total_stocks`：`data` 中记录条数

排行榜页会优先使用 `metadata.generated_at_utc`，并按用户浏览器时区显示生成时间。

## 数据文件

- `data/quant-metrics-us.json`：量化指标数据（美股）
- `data/quant-metrics-cn.json`：量化指标数据（A 股）
- `data/quant-metrics-hk.json`：量化指标数据（港股）
- `data/README.md`：数据文件字段说明

## 本地 Linux 运行

1. `npm install`
2. `npm run dev`

默认会在 `PORT=5000` 启动（API + 前端一体）。

## 本地 Windows 运行

方式一（推荐）：
1. `npm install`
2. `start-dev.bat`

方式二（手动打开两个终端）：
1. 终端 A：`$env:NODE_ENV="development"; npx tsx server/index.ts`
2. 终端 B：`npm run dev:client`

## 云端 Linux 运行（非 Docker）

1. `git pull`
2. `npm install --production`
3. `npm run build`
4. `NODE_ENV=production PORT=3000 npm run start`

## 云端 git pull 后的 sh 运行方法（Docker）

在服务器上执行：

```bash
bash deploy/docker-deploy-simple.sh
```

该脚本会自动拉取最新代码并重建/重启容器。

## 技术栈

- React + TypeScript + Vite
- Tailwind CSS + Framer Motion

## 文档

- `data/README.md`

## 许可

MIT License

## Backtest Persistence (PostgreSQL)

- Backtest results are persisted when `DATABASE_URL` is configured.
- Without `DATABASE_URL`, the app falls back to in-memory backtest storage.
- Run `npm run db:prepare` before `npm run db:push` on a fresh PostgreSQL database.
- User isolation header: `x-user-id` (frontend defaults to `demo-user`)
- Backtest history API (paginated): `GET /api/backtests/history?page=1&pageSize=20&algorithm=us&status=completed&runDateFrom=YYYY-MM-DD&runDateTo=YYYY-MM-DD`
- Frontend history page: `/backtest/history`
- Compare page adds:
  - drawdown curve
  - correlation matrix
  - monthly return heatmap
  - CSV/PDF export workflow
- Price cache benchmark: `npm run benchmark:price-cache`
- Linux deployment guide: `LINUX_FRONTEND_PGSQL_CONFIG.md`
- UI operation guide: `BACKTEST_UI_OPERATION_GUIDE.md`
