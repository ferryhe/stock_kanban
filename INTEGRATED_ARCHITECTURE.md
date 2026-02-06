# 虚拟交易系统集成架构设计

> **架构决策变更：** 将虚拟交易功能集成到 stock_kanban 项目中，而非创建独立服务

## 概述

基于项目的实际重合度（指标数据、前端展示、用户管理），决定将虚拟交易功能直接集成到现有的 stock_kanban 项目中，共享代码和基础设施。

---

# 第一部分：集成架构设计

## 1. 项目结构调整

### 1.1 更新后的目录结构

```
stock_kanban/  (现有项目扩展)
├── client/                    # 前端代码（现有）
│   └── src/
│       ├── components/        # UI组件
│       │   ├── backtest/      # 新增：回测相关组件
│       │   │   ├── BacktestConfig.tsx
│       │   │   ├── BacktestResults.tsx
│       │   │   ├── EquityCurveChart.tsx
│       │   │   └── PerformanceMetrics.tsx
│       │   ├── portfolio/     # 新增：投资组合组件
│       │   │   ├── PortfolioList.tsx
│       │   │   ├── PortfolioDetail.tsx
│       │   │   └── HoldingsTable.tsx
│       │   └── ... (现有组件)
│       ├── pages/             # 页面
│       │   ├── Dashboard.tsx  # 现有
│       │   ├── Backtest.tsx   # 新增
│       │   ├── Portfolio.tsx  # 新增
│       │   └── Compare.tsx    # 新增
│       └── lib/
│           ├── stockApi.ts    # 扩展现有API
│           ├── backtestApi.ts # 新增：回测API
│           └── portfolioApi.ts # 新增：投资组合API
│
├── server/                    # 后端代码（现有）
│   ├── routes.ts              # 扩展：添加回测和投资组合路由
│   ├── stockService.ts        # 现有：股票数据和指标
│   ├── backtestService.ts     # 新增：回测引擎
│   ├── portfolioService.ts    # 新增：投资组合管理
│   ├── tradingEngine.ts       # 新增：交易执行引擎
│   └── historicalDataService.ts # 新增：历史数据管理
│
├── shared/                    # 共享代码
│   ├── schema.ts              # 扩展：添加交易相关表
│   ├── types/                 # 新增：类型定义
│   │   ├── backtest.ts
│   │   ├── portfolio.ts
│   │   ├── signal.ts
│   │   └── trade.ts
│   └── indicators/            # 新增：指标库（从stockService提取）
│       ├── index.ts
│       ├── trend.ts           # RSI, MACD
│       ├── movingAverage.ts   # SMA, EMA
│       └── volatility.ts      # Bollinger Bands, ATR
│
├── data/                      # 数据文件（现有）
│   ├── quant-metrics-us.json  # 现有：单时间点信号
│   ├── quant-metrics-cn.json
│   ├── quant-metrics-hk.json
│   └── historical-signals/    # 新增：历史信号数据
│       ├── us/
│       │   ├── algorithm-a/
│       │   │   └── 2024-01.json  # 按月分片
│       │   ├── algorithm-b/
│       │   └── algorithm-c/
│       ├── cn/
│       └── hk/
│
└── scripts/                   # 脚本（现有）
    └── backfill-historical-signals.ts  # 新增：历史数据回填
```

### 1.2 集成优势

1. **共享用户管理**：复用现有的 users 表和认证系统
2. **共享指标计算**：复用 stockService.ts 中的指标函数
3. **共享前端组件**：复用 StockCard、IndicatorTooltip 等组件
4. **统一部署**：单一服务，降低运维复杂度
5. **数据一致性**：同一数据库，避免数据同步问题

### 1.3 模块边界

虽然集成到同一项目，但保持清晰的模块边界：

```typescript
// 模块职责划分
interface ModuleBoundaries {
  // 现有模块（保持不变）
  stockService: "实时行情、技术指标计算、看板数据";
  routes: "API路由、请求处理";
  storage: "文件存储";
  
  // 新增模块（回测和虚拟交易）
  backtestService: "回测引擎、回测任务管理";
  portfolioService: "投资组合管理、持仓计算";
  tradingEngine: "订单执行、交易成本模拟";
  historicalDataService: "历史信号数据读取、历史价格数据";
}
```

---

# 第二部分：历史信号数据接口设计

## 2. 历史信号数据方案

### 2.1 问题分析

**现状：**
- 现有信号数据（quant-metrics-*.json）只包含单个时间点的数据
- 回测需要连续的历史信号数据（多个交易日）

**需求：**
- 定义历史信号数据的存储格式
- 设计生成历史数据的接口
- 支持高效的时间范围查询

### 2.2 历史信号数据格式

#### 方案一：按月分片（推荐）

每个算法的信号数据按月存储，便于管理和查询。

**文件路径结构：**
```
data/historical-signals/
└── {market}/              # us, cn, hk
    └── {algorithm}/       # algorithm-a, algorithm-b, etc.
        └── {YYYY-MM}.json # 按月分片
```

**示例：** `data/historical-signals/us/algorithm-a/2024-01.json`

**文件格式：**
```json
{
  "metadata": {
    "market": "us",
    "algorithm": "algorithm-a",
    "year": 2024,
    "month": 1,
    "trading_days": 21,
    "total_signals": 450,
    "generated_at": "2024-02-01T00:00:00Z",
    "data_source": "stock_quant_work",
    "version": "1.0"
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
        },
        {
          "ticker": "MSFT",
          "signal": "HOLD",
          "score": 0.45,
          "rank": 15,
          "predictedReturn": 0.032,
          "confidence": 0.72,
          "risk": {
            "vol60": -0.523,
            "maxdd252": 0.421
          }
        }
        // ... 更多股票
      ]
    },
    {
      "date": "2024-01-03",
      "tickers": [
        // 下一个交易日的信号
      ]
    }
    // ... 更多交易日
  ]
}
```

#### 方案二：单文件全历史（不推荐）

所有历史数据在一个文件中，文件会变得很大，不便于管理。

### 2.3 数据生成接口定义

#### TypeScript 类型定义

```typescript
// shared/types/signal.ts

/**
 * 单个股票的信号数据
 */
export interface StockSignal {
  ticker: string;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'RISK_ALERT';
  score?: number;              // 综合评分 0-1
  rank?: number;               // 排名
  predictedReturn?: number;    // 预测收益率
  confidence?: number;         // 信号强度/置信度 0-1
  risk?: {
    vol60?: number;            // 60日波动率 z-score
    maxdd252?: number;         // 252日最大回撤 z-score
  };
}

/**
 * 单日信号数据
 */
export interface DailySignals {
  date: string;                // YYYY-MM-DD 格式
  tickers: StockSignal[];
}

/**
 * 历史信号文件元数据
 */
export interface HistoricalSignalMetadata {
  market: 'us' | 'cn' | 'hk';
  algorithm: string;           // algorithm-a, algorithm-b, etc.
  year: number;
  month: number;
  trading_days: number;        // 本月交易日数量
  total_signals: number;       // 本月总信号数
  generated_at: string;        // ISO 8601 时间戳
  data_source: string;         // 数据来源
  version: string;             // 数据格式版本
}

/**
 * 历史信号文件完整结构
 */
export interface HistoricalSignalFile {
  metadata: HistoricalSignalMetadata;
  signals: DailySignals[];
}

/**
 * 查询历史信号的参数
 */
export interface HistoricalSignalQuery {
  market: 'us' | 'cn' | 'hk';
  algorithm: string;
  startDate: Date;
  endDate: Date;
}

/**
 * 历史信号查询结果
 */
export interface HistoricalSignalResult {
  query: HistoricalSignalQuery;
  signals: DailySignals[];
  metadata: {
    totalDays: number;
    filesLoaded: string[];
  };
}
```

#### 历史数据服务接口

```typescript
// server/historicalDataService.ts

import { 
  HistoricalSignalQuery, 
  HistoricalSignalResult,
  DailySignals
} from '../shared/types/signal';

export class HistoricalSignalService {
  /**
   * 查询历史信号数据
   * @param query 查询参数
   * @returns 历史信号数据
   */
  async getHistoricalSignals(
    query: HistoricalSignalQuery
  ): Promise<HistoricalSignalResult> {
    const signals: DailySignals[] = [];
    const filesLoaded: string[] = [];
    
    // 计算需要加载的月份文件
    const monthsToLoad = this.getMonthsInRange(query.startDate, query.endDate);
    
    for (const month of monthsToLoad) {
      const filePath = this.getSignalFilePath(
        query.market, 
        query.algorithm, 
        month.year, 
        month.month
      );
      
      // 加载并解析文件
      const fileData = await this.loadSignalFile(filePath);
      
      if (fileData) {
        // 过滤日期范围
        const filteredSignals = fileData.signals.filter(day => {
          const dayDate = new Date(day.date);
          return dayDate >= query.startDate && dayDate <= query.endDate;
        });
        
        signals.push(...filteredSignals);
        filesLoaded.push(filePath);
      }
    }
    
    return {
      query,
      signals: signals.sort((a, b) => a.date.localeCompare(b.date)),
      metadata: {
        totalDays: signals.length,
        filesLoaded
      }
    };
  }
  
  /**
   * 获取指定日期的信号
   * @param market 市场
   * @param algorithm 算法
   * @param date 日期
   * @returns 当日信号数据
   */
  async getSignalsByDate(
    market: string,
    algorithm: string,
    date: Date
  ): Promise<DailySignals | null> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const dateStr = date.toISOString().split('T')[0];
    
    const filePath = this.getSignalFilePath(market, algorithm, year, month);
    const fileData = await this.loadSignalFile(filePath);
    
    if (!fileData) return null;
    
    return fileData.signals.find(day => day.date === dateStr) || null;
  }
  
  /**
   * 获取可用的算法列表
   */
  async getAvailableAlgorithms(market: string): Promise<string[]> {
    const basePath = `data/historical-signals/${market}`;
    // 读取目录列出所有算法
    // 实现略
    return [];
  }
  
  /**
   * 获取算法的数据时间范围
   */
  async getDataRange(
    market: string, 
    algorithm: string
  ): Promise<{ start: Date; end: Date } | null> {
    // 扫描所有月份文件，确定数据范围
    // 实现略
    return null;
  }
  
  // 私有辅助方法
  
  private getSignalFilePath(
    market: string, 
    algorithm: string, 
    year: number, 
    month: number
  ): string {
    const monthStr = month.toString().padStart(2, '0');
    return `data/historical-signals/${market}/${algorithm}/${year}-${monthStr}.json`;
  }
  
  private async loadSignalFile(
    filePath: string
  ): Promise<HistoricalSignalFile | null> {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`[HistoricalSignal] Failed to load ${filePath}:`, error);
      return null;
    }
  }
  
  private getMonthsInRange(startDate: Date, endDate: Date): Array<{year: number; month: number}> {
    const months: Array<{year: number; month: number}> = [];
    const current = new Date(startDate);
    current.setDate(1); // 设为月初
    
    while (current <= endDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }
}
```

### 2.4 数据生成流程

#### 从 stock_quant_work 生成历史数据

**建议流程：**

1. **stock_quant_work 修改输出格式**
   - 当前：生成单时间点的 quant-metrics-*.json
   - 新增：同时生成历史信号数据（按月）

2. **输出文件命名规则**
   ```python
   # Python 示例（在 stock_quant_work 中）
   import json
   from datetime import datetime
   
   def save_historical_signals(market, algorithm, year, month, signals):
       """
       保存历史信号数据
       
       Args:
           market: 'us', 'cn', or 'hk'
           algorithm: 算法标识
           year: 年份
           month: 月份
           signals: 信号数据列表（每日）
       """
       output_dir = f"../stock_kanban/data/historical-signals/{market}/{algorithm}"
       os.makedirs(output_dir, exist_ok=True)
       
       output_file = f"{output_dir}/{year}-{month:02d}.json"
       
       data = {
           "metadata": {
               "market": market,
               "algorithm": algorithm,
               "year": year,
               "month": month,
               "trading_days": len(signals),
               "total_signals": sum(len(day['tickers']) for day in signals),
               "generated_at": datetime.utcnow().isoformat() + "Z",
               "data_source": "stock_quant_work",
               "version": "1.0"
           },
           "signals": signals
       }
       
       with open(output_file, 'w') as f:
           json.dump(data, f, indent=2)
       
       print(f"Saved historical signals to {output_file}")
   ```

3. **回填历史数据脚本**
   
   如果已有历史计算结果，可以用脚本转换格式：

   ```typescript
   // scripts/backfill-historical-signals.ts
   
   import * as fs from 'fs';
   import * as path from 'path';
   
   /**
    * 回填历史信号数据
    * 将已有的历史数据转换为新格式
    */
   async function backfillHistoricalSignals() {
     // 读取原始历史数据（假设格式）
     // 转换为新格式
     // 保存为月度文件
     
     console.log('Historical signal backfill completed');
   }
   
   backfillHistoricalSignals().catch(console.error);
   ```

### 2.5 API 端点设计

```typescript
// server/routes.ts 中添加

// 获取可用算法列表
app.get("/api/signals/algorithms", async (req, res) => {
  const market = req.query.market as string || 'us';
  const algorithms = await historicalSignalService.getAvailableAlgorithms(market);
  res.json(algorithms);
});

// 获取算法的数据时间范围
app.get("/api/signals/range/:algorithm", async (req, res) => {
  const { algorithm } = req.params;
  const market = req.query.market as string || 'us';
  const range = await historicalSignalService.getDataRange(market, algorithm);
  
  if (!range) {
    return res.status(404).json({ error: 'Algorithm not found' });
  }
  
  res.json(range);
});

// 查询历史信号数据
app.post("/api/signals/query", async (req, res) => {
  const { market, algorithm, startDate, endDate } = req.body;
  
  const result = await historicalSignalService.getHistoricalSignals({
    market,
    algorithm,
    startDate: new Date(startDate),
    endDate: new Date(endDate)
  });
  
  res.json(result);
});
```

---

# 第三部分：回测功能集成

## 3. 回测引擎实现

### 3.1 回测服务（server/backtestService.ts）

```typescript
import { HistoricalSignalService } from './historicalDataService';

export class BacktestService {
  constructor(
    private historicalSignalService: HistoricalSignalService,
    private priceService: PriceService
  ) {}
  
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    // 1. 获取历史信号数据
    const signals = await this.historicalSignalService.getHistoricalSignals({
      market: config.market,
      algorithm: config.algorithm,
      startDate: config.startDate,
      endDate: config.endDate
    });
    
    // 2. 初始化投资组合
    const portfolio = this.initializePortfolio(config.initialCash);
    
    // 3. 逐日回测
    const results = await this.simulateTrading(signals, portfolio, config);
    
    // 4. 计算性能指标
    const metrics = this.calculateMetrics(results);
    
    // 5. 保存回测结果到数据库
    await this.saveBacktestResult(config, results, metrics);
    
    return {
      summary: this.createSummary(metrics),
      equityCurve: results.equityCurve,
      trades: results.trades,
      metrics
    };
  }
  
  // 实现细节...
}
```

### 3.2 数据库扩展

在现有的 `shared/schema.ts` 中添加回测相关表：

```typescript
// shared/schema.ts

import { pgTable, uuid, varchar, decimal, timestamp, jsonb, date } from "drizzle-orm/pg-core";

// 策略表
export const strategies = pgTable("strategies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  algorithm: varchar("algorithm", { length: 50 }).notNull(),
  description: text("description"),
  parameters: jsonb("parameters").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true)
});

// 投资组合表
export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  strategyId: uuid("strategy_id").references(() => strategies.id),
  userId: uuid("user_id").references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'backtest' or 'live'
  initialCash: decimal("initial_cash", { precision: 15, scale: 2 }).notNull(),
  currentCash: decimal("current_cash", { precision: 15, scale: 2 }).notNull(),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
  backtestStartDate: date("backtest_start_date"),
  backtestEndDate: date("backtest_end_date"),
  backtestStatus: varchar("backtest_status", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// 其他表（holdings, trades, daily_settlements, strategy_performance）...
```

---

# 第四部分：前端集成

## 4. 前端页面和组件

### 4.1 回测配置页面

```typescript
// client/src/pages/Backtest.tsx

import { useState } from 'react';
import { BacktestConfig } from '../components/backtest/BacktestConfig';
import { useBacktest } from '../lib/backtestApi';

export function BacktestPage() {
  const [config, setConfig] = useState(null);
  const { runBacktest, isLoading } = useBacktest();
  
  const handleRun = async (config) => {
    const result = await runBacktest(config);
    // 导航到结果页面
    navigate(`/backtest/${result.id}/results`);
  };
  
  return (
    <div className="container">
      <h1>回测配置</h1>
      <BacktestConfig onSubmit={handleRun} isLoading={isLoading} />
    </div>
  );
}
```

### 4.2 API 客户端

```typescript
// client/src/lib/backtestApi.ts

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const response = await fetch('/api/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  
  if (!response.ok) {
    throw new Error('Backtest failed');
  }
  
  return response.json();
}

export async function getBacktestResult(id: string): Promise<BacktestResult> {
  const response = await fetch(`/api/backtest/${id}/results`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch backtest results');
  }
  
  return response.json();
}
```

---

# 第五部分：实施路线图（更新）

## 5. 分阶段实施

### Phase 1: 历史数据基础设施（1-2周）

**Week 1: 数据格式和服务**
- [ ] 定义历史信号数据TypeScript类型（shared/types/signal.ts）
- [ ] 实现 HistoricalSignalService（server/historicalDataService.ts）
- [ ] 创建数据目录结构（data/historical-signals/）
- [ ] 编写回填脚本（scripts/backfill-historical-signals.ts）

**Week 2: API 和测试数据**
- [ ] 添加历史信号查询API端点
- [ ] 准备测试数据（1-3个月的历史信号）
- [ ] 前端API客户端实现
- [ ] 单元测试

**完成标志：** 能够查询和获取历史信号数据

### Phase 2: 回测引擎核心（2-3周）

**Week 1: 数据库和模型**
- [ ] 扩展 shared/schema.ts（添加回测相关表）
- [ ] 数据库迁移
- [ ] 提取指标库到 shared/indicators/

**Week 2: 回测引擎**
- [ ] 实现 BacktestService（server/backtestService.ts）
- [ ] 实现 TradingEngine（server/tradingEngine.ts）
- [ ] 交易成本模拟（佣金+滑点）

**Week 3: API 和前端**
- [ ] 回测API端点
- [ ] 回测配置页面（client/src/pages/Backtest.tsx）
- [ ] 回测结果展示页面
- [ ] 资产曲线图表（复用Recharts）

**完成标志：** 能够配置并运行单一算法的完整回测

### Phase 3: 多算法对比和优化（2周）

- [ ] 多算法并行回测
- [ ] 算法对比页面
- [ ] 性能优化（缓存、异步处理）
- [ ] 更多图表和分析功能

### Phase 4: 实时虚拟交易（2-3周）

- [ ] 实时投资组合功能
- [ ] 每日自动结算
- [ ] 实时持仓展示
- [ ] 用户权限和数据隔离

---

# 第六部分：与 stock_quant_work 的协作

## 6. 数据生成协作方案

### 6.1 stock_quant_work 需要的改动

1. **输出格式扩展**
   - 保持现有单时间点输出（quant-metrics-*.json）
   - 新增历史信号输出（historical-signals/）

2. **按月生成历史文件**
   ```python
   # 伪代码示例
   def export_historical_signals(results_df, market, algorithm, year, month):
       # 将当月的信号数据转换为标准格式
       # 保存到 ../stock_kanban/data/historical-signals/{market}/{algorithm}/{year}-{month}.json
       pass
   ```

3. **建议添加命令行参数**
   ```bash
   # 生成历史数据
   python main.py --export-historical --market us --algorithm algorithm-a --year 2024 --month 1
   
   # 生成当前数据（现有功能）
   python main.py --export-current
   ```

### 6.2 初始数据准备

**选项1：回填历史数据**
- 如果 stock_quant_work 有历史计算结果，转换格式输出

**选项2：重新计算**
- 使用历史价格数据重新运行算法
- 生成完整的历史信号数据

**选项3：模拟数据（开发阶段）**
- 生成几个月的模拟信号数据用于开发和测试

---

# 总结

## 关键决策

1. ✅ **集成架构**：虚拟交易功能集成到 stock_kanban 项目中
2. ✅ **历史数据格式**：按月分片存储，JSON格式
3. ✅ **接口设计**：完整的TypeScript类型定义和服务接口
4. ✅ **实施优先级**：历史数据基础设施 → 回测引擎 → 多算法对比 → 实时交易

## 与 stock_quant_work 协作要点

- stock_quant_work 需要输出历史信号数据（按月JSON文件）
- 使用统一的数据格式和接口
- stock_kanban 提供查询API和前端展示

## 下一步行动

1. [ ] 评审本架构文档
2. [ ] stock_quant_work 修改输出格式
3. [ ] 准备测试数据（1-3个月）
4. [ ] 开始 Phase 1 实施（历史数据基础设施）

---

**文档版本：** v3.0（集成架构版）  
**最后更新：** 2026-02-06  
**状态：** 待评审
