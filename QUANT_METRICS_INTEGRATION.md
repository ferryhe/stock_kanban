# 量化指标集成 - 实现指南

## 概述
已将量化分析指标（来自 `stock_quant_work` 项目的外部分析）集成到 stock_kanban 项目中。系统支持每日自动加载更新的指标数据，如果前端找不到对应的数据，则不显示。

## 实现的指标

### 核心指标
- **score** - 汇总集合分数（值越高越好）
- **rank** - 结合排名（1最优，值越小越好）
- **predictedReturn** - 20个交易日预测回报
- **risk.vol60** - 60日波动率 z-score
- **risk.maxdd252** - 252日最大回撤 z-score  
- **status.bucket** - 信号分类（HOLD、LONG、SHORT）

## 文件更改

### 后端 (Backend)

#### [server/stockService.ts](server/stockService.ts)
- 添加 `QuantMetrics` 接口定义
- 添加 `loadQuantMetrics()` 函数：
  - 从 `c:\Projects\stock_quant_work\outputs\kanban\latest.json` 加载数据
  - 1小时缓存机制
  - 自动处理文件不存在的情况
- 修改 `getStockAnalysis()` 函数：
  - 加载量化指标
  - 在返回的数据中附加 `quant` 字段

### 前端 (Frontend)

#### [client/src/lib/stockApi.ts](client/src/lib/stockApi.ts)
- 添加 `QuantMetrics` 接口
- 扩展 `StockData` 接口，添加可选的 `quant` 字段

#### [client/src/components/QuantMetricsDisplay.tsx](client/src/components/QuantMetricsDisplay.tsx)
新增组件，显示量化指标：
- Rank 和 Score 徽章（带颜色编码）
- Status Bucket 标签
- 风险指标（Vol60、MaxDD252）
- 预测回报
- 所有指标都有交互式信息提示

#### [client/src/components/StockCard.tsx](client/src/components/StockCard.tsx)
- 导入 `QuantMetricsDisplay` 组件
- 在股票卡底部集成量化指标显示
- 如果没有指标数据则不显示

#### [client/src/components/IndicatorTooltip.tsx](client/src/components/IndicatorTooltip.tsx)
添加新指标的解释和说明：
- `rank` - 集合排名说明
- `score` - 集合分数说明
- `predictedReturn` - 预测回报说明
- `vol60` - 60日波动率说明
- `maxdd252` - 252日最大回撤说明
- `bucket` - 信号分类说明

## 工作流程

### 日常更新流程
1. 在 `stock_quant_work` 项目中运行量化分析
2. 输出结果保存到 `data/quant-metrics.json`
3. 提交并推送到 git
4. 在 `stock_kanban` 项目中执行 `git pull` 拉取最新数据
5. 前端应用在下一次刷新时（或1小时缓存过期后）自动加载新数据
6. 如果某个股票在 JSON 中没有数据，该股票将不显示量化指标

### 数据流
```
stock_quant_work (分析)
    ↓
data/quant-metrics.json (本地存储)
    ↓
git pull (定期更新)
    ↓
loadQuantMetrics() (后端)
    ↓
getStockAnalysis() 返回包含 quant 字段的数据
    ↓
前端 API 客户端接收数据
    ↓
StockCard 组件显示 QuantMetricsDisplay
    ↓
用户看到量化指标（如果数据存在）
```

## 配置

JSON 数据来源：`data/quant-metrics.json`（项目相对路径）

该路径在服务器启动时自动配置，无需手动修改。

### 预期的 JSON 格式
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

## 特性

### 容错机制
- ✅ 如果 JSON 文件不存在，程序继续正常运行
- ✅ 如果某个股票在 JSON 中缺少，该股票的其他数据正常显示
- ✅ 1小时缓存机制减少文件系统访问

### UI/UX
- ✅ 颜色编码：排名越高越绿色，越低越灰色
- ✅ 交互式提示：用户可点击任何指标查看详细说明
- ✅ 响应式设计：适配移动和桌面
- ✅ 只有有数据时才显示指标部分

## 扩展性

要添加新指标：
1. 在 `QuantMetrics` 接口中添加字段
2. 在 `QuantMetricsDisplay` 组件中添加 UI 元素
3. 在 `IndicatorTooltip` 中添加解释文本
4. 确保 JSON 文件包含新字段

## 测试

要测试此功能：
1. 确保 `latest.json` 文件存在并包含有效数据
2. 运行前端应用：`npm run dev:client`
3. 查看股票卡 - 应该显示量化指标（如果数据可用）
4. 点击任何指标查看交互式提示

## 注意事项

- 如果修改了外部 JSON 文件，缓存会在1小时后更新
- 系统自动跳过无效的 ticker 条目
- 所有数值都经过格式化以提高可读性
- 风险指标是 z-score，可以是正数或负数（参见 Tooltip 说明）
