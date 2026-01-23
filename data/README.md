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
    "score": 0.85,
    "rank": 1.0,
    "signal": "hold",
    "predictedReturn": 0.05,
    "risk": {
      "vol60": -0.5,
      "maxdd252": 0.2
    },
    "status": {
      "bucket": "LONG"
    }
  }
]
```

## 字段说明

- `ticker` - 股票代码
- `score` - 汇总集合分数（值越高越好）
- `rank` - 排名（1最优）
- `signal` - 信号类型
- `predictedReturn` - 20天预测回报
- `risk.vol60` - 60日波动率 z-score
- `risk.maxdd252` - 252日最大回撤 z-score
- `status.bucket` - 信号分类（HOLD/LONG/SHORT）
