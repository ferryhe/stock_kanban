# 量化指标数据文件夹

此文件夹用于存储量化分析指标数据。

## 文件说明

- `quant-metrics.json` - 量化分析指标数据
  - 由外部 `stock_quant_work` 项目生成
  - 定期通过 git pull 更新
  - 包含每支股票的评分、排名、风险指标等

## 使用流程

1. 在 `stock_quant_work` 项目中生成分析结果
2. 输出到 `quant-metrics.json`
3. 提交到 git
4. 在 `stock_kanban` 项目中执行 `git pull` 获取最新数据
5. 前端应用在下次刷新时自动加载新数据（1小时缓存）

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

- `ticker` - ????
- `score` - ?????rank_pct??????
- `rank` - ???1 ???
- `predictedReturn` - 20 ?????
- `signal` - ???BUY/SELL/HOLD/RISK_ALERT?RISK_ALERT ???? risk ???
- `risk.vol60` - 60 ???? z-score???????
- `risk.maxdd252` - 252 ????? z-score???/??????
