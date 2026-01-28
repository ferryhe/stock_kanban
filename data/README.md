# 量化指标数据文件夹

本文件夹用于存放量化分析指标数据。

## 文件说明

- `quant-metrics.json` - 量化分析指标数据  
  - 由外部 `stock_quant_work` 项目生成  
  - 定期通过 `git pull` 更新  
  - 包含每支股票的评分、排名、风险指标等

## 使用流程

1. 在 `stock_quant_work` 项目中生成分析结果
2. 输出到 `quant-metrics.json`
3. 提交到 git
4. 在 `stock_kanban` 项目中执行 `git pull` 获取最新数据
5. 前端应用在下次刷新时自动加载最新数据（1 小时缓存）

## JSON 格式

```json
[
  {
    "ticker": "AAPL",
    "score": 0.18,
    "rank": 4.0,
    "predictedReturn": 0.052,
    "signal": "BUY",
    "risk": {
      "vol60": -0.35,
      "maxdd252": 0.22
    }
  }
]
```

## 字段说明

- `ticker` - 股票代码
- `score` - 综合评分（0~1，越小排名越靠前；基于多模型排名结果）
- `rank` - 排名名次（1 为最好，数值越小越好）
- `predictedReturn` - 未来 20 个交易日的预测收益
- `signal` - 交易信号（BUY / SELL / HOLD / RISK_ALERT；RISK_ALERT 表示缺少 risk 输入）
- `risk.vol60` - 60 日波动率 z-score（数值越高表示波动越大，风险越高）
- `risk.maxdd252` - 252 日最大回撤 z-score（数值越低/越负表示回撤越大，风险越高）
