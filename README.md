# Stock Kanban - 股票监控应用

一个用于股票监控与量化分析的看板应用，聚合技术指标与量化指标，帮助快速筛选和对比标的。

## 主要功能

- 实时行情与基础指标展示
- 常用技术指标（RSI / MACD / Bollinger / SMA20）
- 量化指标与风险指标（Rank / Score / Predicted Return / vol60 / maxdd252 / Signal）
- 多看板管理与自定义股票列表
- 指标点击解释与交互式说明

## 量化指标说明

量化数据存放在 `data/quant-metrics.json`。

- `score`：综合评分（0~1，越小排名越靠前；基于多模型排名结果）
- `rank`：排名名次（1 为最好）
- `predictedReturn`：未来 20 个交易日的预测收益
- `risk.vol60`：60 日波动率 z-score（越高越波动）
- `risk.maxdd252`：252 日最大回撤 z-score（越低/越负回撤越大）
- `signal`：交易信号（BUY / SELL / HOLD / RISK_ALERT）

更多细节见：`QUANT_METRICS_INTEGRATION.md`

## 数据文件

- `data/quant-metrics.json`：量化指标数据
- `data/README.md`：数据文件字段说明

## 技术栈

- React + TypeScript + Vite
- Tailwind CSS + Framer Motion

## 文档

- `QUANT_METRICS_INTEGRATION.md`
- `data/README.md`

## 许可

MIT License
