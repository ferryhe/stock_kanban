# 虚拟交易系统设计方案 - 快速导读

> **最新：集成架构版本** - 将虚拟交易功能集成到 stock_kanban 项目中

## ⭐ 主文档

**[INTEGRATED_ARCHITECTURE.md](./INTEGRATED_ARCHITECTURE.md)** - 集成架构设计（v3.0）

**重大架构变更：** 基于项目重合度考虑（指标数据、前端展示、用户管理），决定将虚拟交易功能直接集成到现有 stock_kanban 项目中，而非创建独立服务。

---

## 核心变更

### 架构决策：集成 vs 独立

| 方面 | 独立服务 (v1.0) | 集成方案 (v3.0 ⭐ 当前) |
|------|----------------|-------------------|
| 部署 | 需要独立部署 | 单一服务 |
| 用户管理 | 需要同步 | 共享现有users表 |
| 指标计算 | 重复开发 | 复用stockService |
| 前端组件 | 重复开发 | 复用现有组件 |
| 数据库 | 需要数据同步 | 同一数据库 |
| 运维复杂度 | 高 | 低 |

**结论：** 集成方案更合适，降低复杂度，提高代码复用率。

---

## 项目结构（更新）

```
stock_kanban/  (现有项目扩展)
├── client/src/
│   ├── components/
│   │   ├── backtest/        # 新增：回测组件
│   │   ├── portfolio/       # 新增：投资组合组件
│   │   └── ... (现有组件复用)
│   ├── pages/
│   │   ├── Backtest.tsx     # 新增
│   │   ├── Portfolio.tsx    # 新增
│   │   └── Compare.tsx      # 新增
│   └── lib/
│       ├── backtestApi.ts   # 新增
│       └── portfolioApi.ts  # 新增
│
├── server/
│   ├── stockService.ts      # 现有：复用
│   ├── backtestService.ts   # 新增：回测引擎
│   ├── portfolioService.ts  # 新增
│   ├── tradingEngine.ts     # 新增
│   └── historicalDataService.ts  # 新增
│
├── shared/
│   ├── schema.ts            # 扩展：添加回测表
│   ├── types/               # 新增：类型定义
│   └── indicators/          # 新增：指标库（提取自stockService）
│
└── data/
    ├── quant-metrics-*.json  # 现有：单时间点
    └── historical-signals/   # 新增：历史信号数据
        ├── us/
        │   ├── algorithm-a/
        │   │   └── 2024-01.json  # 按月分片
        │   ├── algorithm-b/
        │   └── algorithm-c/
        ├── cn/
        └── hk/
```

---

## 历史信号数据接口（新增）

### 问题

**现状：** 现有信号数据（quant-metrics-*.json）只包含单个时间点
**需求：** 回测需要连续的历史信号数据

### 解决方案

#### 1. 数据格式：按月分片

```
data/historical-signals/{market}/{algorithm}/{YYYY-MM}.json
```

**示例：** `data/historical-signals/us/algorithm-a/2024-01.json`

```json
{
  "metadata": {
    "market": "us",
    "algorithm": "algorithm-a",
    "year": 2024,
    "month": 1,
    "trading_days": 21,
    "generated_at": "2024-02-01T00:00:00Z"
  },
  "signals": [
    {
      "date": "2024-01-02",
      "tickers": [
        {
          "ticker": "AAPL",
          "signal": "BUY",
          "score": 0.25,
          "rank": 8,
          "predictedReturn": 0.072,
          "confidence": 0.85,
          "risk": {
            "vol60": -1.196,
            "maxdd252": 0.683
          }
        }
      ]
    }
  ]
}
```

#### 2. TypeScript 接口

```typescript
// shared/types/signal.ts

export interface StockSignal {
  ticker: string;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'RISK_ALERT';
  score?: number;
  rank?: number;
  predictedReturn?: number;
  confidence?: number;
  risk?: {
    vol60?: number;
    maxdd252?: number;
  };
}

export interface DailySignals {
  date: string;  // YYYY-MM-DD
  tickers: StockSignal[];
}

export interface HistoricalSignalFile {
  metadata: HistoricalSignalMetadata;
  signals: DailySignals[];
}
```

#### 3. 服务接口

```typescript
// server/historicalDataService.ts

class HistoricalSignalService {
  // 查询历史信号数据
  async getHistoricalSignals(query: {
    market: string;
    algorithm: string;
    startDate: Date;
    endDate: Date;
  }): Promise<HistoricalSignalResult>;
  
  // 获取指定日期的信号
  async getSignalsByDate(
    market: string, 
    algorithm: string, 
    date: Date
  ): Promise<DailySignals | null>;
  
  // 获取可用算法列表
  async getAvailableAlgorithms(market: string): Promise<string[]>;
}
```

#### 4. API 端点

```typescript
GET  /api/signals/algorithms?market=us
GET  /api/signals/range/:algorithm?market=us
POST /api/signals/query
     Body: { market, algorithm, startDate, endDate }
```

---

## 与 stock_quant_work 协作

### stock_quant_work 需要的改动

1. **保持现有输出**
   - 继续生成 quant-metrics-*.json（单时间点）

2. **新增历史数据输出**
   - 按月生成历史信号JSON文件
   - 输出到 ../stock_kanban/data/historical-signals/

3. **建议命令行参数**
   ```bash
   # 生成历史数据
   python main.py --export-historical --market us --algorithm algorithm-a --year 2024 --month 1
   
   # 生成当前数据（现有）
   python main.py --export-current
   ```

### 初始数据准备

**选项1：** 回填历史数据（如果有历史计算结果）  
**选项2：** 重新计算（使用历史价格数据）  
**选项3：** 模拟数据（开发测试用）

---

## 实施路线图（更新）

### Phase 1: 历史数据基础设施（1-2周）⭐ **优先**

**目标：** 建立历史信号数据的存储、查询和API

- [ ] 定义TypeScript类型（shared/types/signal.ts）
- [ ] 实现HistoricalSignalService
- [ ] 创建数据目录结构
- [ ] 添加API端点
- [ ] 准备测试数据（1-3个月）

**完成标志：** 能够查询和获取历史信号数据

### Phase 2: 回测引擎核心（2-3周）

- [ ] 扩展数据库schema（回测相关表）
- [ ] 提取指标库（shared/indicators/）
- [ ] 实现BacktestService
- [ ] 实现TradingEngine
- [ ] 前端回测页面

**完成标志：** 运行单一算法的完整回测

### Phase 3: 多算法对比（2周）

- [ ] 多算法并行回测
- [ ] 对比页面
- [ ] 性能优化

### Phase 4: 实时虚拟交易（2-3周）

- [ ] 实时投资组合
- [ ] 每日自动结算
- [ ] 用户权限

---

## 集成优势

1. ✅ **共享用户管理** - 复用现有users表和认证
2. ✅ **共享指标计算** - 复用stockService中的指标
3. ✅ **共享前端组件** - 复用StockCard、图表等
4. ✅ **统一部署** - 单一服务，降低运维
5. ✅ **数据一致性** - 同一数据库，避免同步

---

## 文档索引

**主要文档：**
- ⭐ **INTEGRATED_ARCHITECTURE.md** - 集成架构设计（当前版本）
- 📚 INDICATOR_ANALYSIS.md - 指标分析

**参考文档：**
- 📦 CONSOLIDATED_DESIGN.md - 原独立服务设计（归档）
- 📦 DESIGN.md - 原始设计（归档）
- 📦 IMPLEMENTATION_PLAN.md - 原实施计划（归档）

**框架参考：**
- docs/REFERENCE_Backtrader.md
- docs/REFERENCE_Zipline.md
- docs/REFERENCE_QuantConnect.md

---

## 下一步行动

1. ✅ 评审集成架构设计
2. ⬜ 与 stock_quant_work 协调历史数据输出
3. ⬜ 准备测试数据（1-3个月）
4. ⬜ 开始 Phase 1 实施

---

**文档版本：** v3.0（集成架构）  
**最后更新：** 2026-02-06
