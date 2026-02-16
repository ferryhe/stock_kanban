# 虚拟交易系统完整设计方案

> 本文档整合了整体架构设计、详细实施计划和技术规范

## 文档说明

本文档将原有的 DESIGN.md 和 IMPLEMENTATION_PLAN.md 整合为统一的完整设计方案，避免内容重复，便于理解和实施。

**推荐阅读顺序：**
1. 第一部分：整体架构与战略规划
2. 第二部分：回测模块详细设计（Phase 1 核心功能）
3. 第三部分：数据模型与存储方案
4. 第四部分：前端集成与用户体验
5. 附录：参考资料与实施路线图

---

# 第一部分：整体架构与战略规划

## 1. 项目定位与架构

### 1.1 推荐方案：三层分离架构

**建议：创建独立的 `stock_trading_sim` 后端服务**

```
stock_kanban (前端)  ←→  stock_trading_sim (交易后端-新)  ←→  stock_quant_work (量化引擎)
    展示数据              虚拟交易/回测/结算/策略                    生成信号
```

#### 职责划分

1. **stock_kanban** (现有项目)
   - 前端展示、看板管理、实时行情查看
   - 已实现基础技术指标计算（RSI, MACD, SMA, EMA, Bollinger Bands）
   - 展示量化信号和交易结果

2. **stock_quant_work** (现有项目)
   - 量化分析、策略计算、信号生成
   - 输出 JSON 格式的信号数据（quant-metrics-*.json）
   - 提供多种算法（Algorithm A/B/C...）

3. **stock_trading_sim** (新建项目)
   - **核心功能：回测引擎**（Phase 1 重点）
   - 虚拟交易执行与管理
   - 资金管理、收益计算、历史记录
   - 性能指标分析

### 1.2 现有系统分析

#### 已实现的技术指标（stock_kanban）

在 `server/stockService.ts` 中已实现以下指标计算：

```typescript
// 已实现的指标函数
- calculateRSI(prices, period=14): RSI 指标
- calculateSMA(prices, period): 简单移动平均
- calculateEMA(prices, period): 指数移动平均
- calculateMACD(prices): MACD 指标（含信号线）
- calculateBollingerBands(prices, period=20): 布林带
```

**结论：** 新系统可以复用这些现有实现，无需重复开发基础指标。

### 1.3 模块化架构设计（借鉴 QuantConnect Alpha Framework）

将系统分解为5个独立、可复用的模块：

```typescript
// 核心模块接口
interface TradingSystem {
  signalProvider: ISignalProvider;      // 信号读取
  portfolioBuilder: IPortfolioBuilder;  // 仓位构建
  executionEngine: IExecutionEngine;     // 执行引擎
  riskManager: IRiskManager;             // 风险管理
  backtestEngine: IBacktestEngine;       // 回测引擎（Phase 1 核心）
}
```

**模块化优势：**
- 减少代码重复，提高复用性
- 每个模块独立开发和测试
- 便于维护和扩展
- 支持并行开发

---

# 第二部分：回测模块详细设计（Phase 1 核心）

## 2. 回测引擎完整设计

### 2.1 为什么先做回测？

1. **用户核心需求**：评估算法表现是首要需求
2. **技术基础**：回测引擎包含大部分核心交易逻辑
3. **数据准备**：历史信号数据已经存在
4. **快速验证**：可以立即看到算法效果
5. **为实盘铺路**：回测引擎的模块可用于实盘

### 2.2 回测流程

```
┌─────────────────────────────────────────────────────────────┐
│                      回测引擎流程                            │
└─────────────────────────────────────────────────────────────┘

1. 初始化
   ├── 加载历史信号数据（从 quant-metrics-*.json）
   ├── 加载历史价格数据（从 Yahoo Finance）
   ├── 设置初始资金和参数
   └── 初始化各个模块

2. 时间循环（逐日回测）
   For each trading day:
   ├── a. 获取当日信号
   │   └── signalProvider.getSignals(algorithm, date)
   │
   ├── b. 构建目标仓位
   │   └── portfolioBuilder.buildTargetPositions(signals, portfolio, params)
   │
   ├── c. 生成订单
   │   └── 计算需要调整的仓位（买入/卖出）
   │
   ├── d. 风险检查（可选）
   │   └── riskManager.checkOrder(order, portfolio)
   │
   ├── e. 执行订单
   │   └── executionEngine.execute(orders, executionParams)
   │   └── 应用佣金和滑点
   │
   ├── f. 更新持仓
   │   └── portfolio.updatePositions(fills)
   │
   ├── g. 获取收盘价
   │   └── 更新持仓市值
   │
   └── h. 记录每日数据
       └── 保存当日资产、持仓、交易等

3. 结果分析
   ├── 计算性能指标
   ├── 生成资产曲线
   ├── 计算最大回撤
   └── 输出回测报告
```

### 2.3 核心模块接口定义

#### 2.3.1 信号提供模块

```typescript
interface ISignalProvider {
  /**
   * 获取指定算法的交易信号
   * @param algorithm - 算法标识（algorithm-a, algorithm-b, etc.）
   * @param date - 日期
   * @returns 信号列表
   */
  getSignals(algorithm: string, date: Date): Promise<Signal[]>;
  
  /**
   * 获取可用的算法列表
   */
  getAvailableAlgorithms(): Promise<string[]>;
}

interface Signal {
  ticker: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  algorithm: string;
  confidence?: number;      // 信号强度 0-1
  timestamp: Date;
  metadata?: {
    score?: number;
    rank?: number;
    predictedReturn?: number;
    risk?: {
      vol60?: number;
      maxdd252?: number;
    };
  };
}
```

#### 2.3.2 回测引擎接口

```typescript
interface IBacktestEngine {
  /**
   * 运行回测
   * @param config - 回测配置
   * @returns 回测结果
   */
  run(config: BacktestConfig): Promise<BacktestResult>;
}

interface BacktestConfig {
  algorithm: string;              // 算法标识
  startDate: Date;
  endDate: Date;
  initialCash: number;
  
  // 策略参数
  positionParams: {
    maxPositionPerStock: number;    // 单股最大仓位比例
    maxTotalPositions: number;       // 最大持仓数量
    minCashReserve: number;          // 最小现金储备比例
  };
  
  // 交易成本
  executionParams: {
    commission: CommissionModel;
    slippage: SlippageModel;
  };
  
  // 回测选项
  options: {
    benchmark?: string;           // 基准指数（如 SPY）
    rebalanceFrequency?: 'daily' | 'weekly' | 'monthly';
  };
}

interface BacktestResult {
  summary: PerformanceSummary;
  equityCurve: TimeSeries[];
  trades: Trade[];
  positions: DailyPosition[];
  metrics: PerformanceMetrics;
}
```

### 2.4 交易成本模拟（借鉴 Zipline）

#### 佣金模型

```typescript
interface CommissionModel {
  calculate(trade: Trade): number;
}

// 按股收费模型
class PerShareCommission implements CommissionModel {
  constructor(
    private costPerShare: number = 0.005,
    private minCost: number = 1.0
  ) {}
  
  calculate(trade: Trade): number {
    const cost = trade.shares * this.costPerShare;
    return Math.max(cost, this.minCost);
  }
}

// 按交易金额百分比收费
class PercentageCommission implements CommissionModel {
  constructor(
    private percentage: number = 0.001,  // 0.1%
    private minCost: number = 1.0
  ) {}
  
  calculate(trade: Trade): number {
    const cost = trade.shares * trade.price * this.percentage;
    return Math.max(cost, this.minCost);
  }
}
```

#### 滑点模型

```typescript
interface SlippageModel {
  calculateFillPrice(order: Order, marketData: MarketData): number;
}

// 固定滑点模型
class FixedSlippage implements SlippageModel {
  constructor(private slippageBps: number = 5) {}  // 5个基点
  
  calculateFillPrice(order: Order, marketData: MarketData): number {
    const basePrice = marketData.close;
    const slippageAmount = basePrice * (this.slippageBps / 10000);
    
    if (order.type === 'BUY') {
      return basePrice + slippageAmount;
    } else {
      return basePrice - slippageAmount;
    }
  }
}

// 基于成交量的滑点模型
class VolumeShareSlippage implements SlippageModel {
  constructor(
    private volumeLimit: number = 0.025,    // 最多占当日成交量的2.5%
    private priceImpact: number = 0.1       // 价格影响系数
  ) {}
  
  calculateFillPrice(order: Order, marketData: MarketData): number {
    const basePrice = marketData.close;
    const dailyVolume = marketData.volume;
    const volumeShare = order.shares / dailyVolume;
    
    if (volumeShare > this.volumeLimit) {
      const excessVolume = volumeShare - this.volumeLimit;
      const additionalSlippage = basePrice * excessVolume * this.priceImpact;
      
      if (order.type === 'BUY') {
        return basePrice + additionalSlippage;
      } else {
        return basePrice - additionalSlippage;
      }
    }
    
    const normalSlippage = basePrice * volumeShare * this.priceImpact * 0.5;
    
    if (order.type === 'BUY') {
      return basePrice + normalSlippage;
    } else {
      return basePrice - normalSlippage;
    }
  }
}
```

### 2.5 性能指标计算

```typescript
interface PerformanceMetrics {
  // 收益指标
  totalReturn: number;              // 总收益率
  annualizedReturn: number;         // 年化收益率
  dailyReturns: number[];           // 每日收益序列
  
  // 风险指标
  volatility: number;               // 波动率（年化）
  maxDrawdown: number;              // 最大回撤
  maxDrawdownDuration: number;      // 最大回撤持续天数
  
  // 风险调整收益指标
  sharpeRatio: number;              // 夏普比率
  sortinoRatio: number;             // 索提诺比率
  calmarRatio: number;              // 卡尔玛比率
  
  // 交易指标
  totalTrades: number;              // 总交易次数
  winningTrades: number;            // 盈利交易次数
  losingTrades: number;             // 亏损交易次数
  winRate: number;                  // 胜率
  avgWin: number;                   // 平均盈利
  avgLoss: number;                  // 平均亏损
  profitFactor: number;             // 盈亏比
  
  // 基准对比
  alpha?: number;                   // Alpha
  beta?: number;                    // Beta
}
```

---

# 第三部分：数据模型与存储方案

## 3. 数据库设计（统一管理）

所有数据存储在 PostgreSQL 中，与现有 stock_kanban 的 users 表共用同一数据库。

### 3.1 核心表结构

```sql
-- 策略定义表
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    algorithm_id VARCHAR(50) NOT NULL,  -- algorithm-a, algorithm-b, etc.
    description TEXT,
    parameters JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 投资组合表（支持回测和实时）
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID REFERENCES strategies(id),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,      -- 'backtest' 或 'live'
    initial_cash DECIMAL(15, 2) NOT NULL,
    current_cash DECIMAL(15, 2) NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    
    -- 回测专用字段
    backtest_start_date DATE,
    backtest_end_date DATE,
    backtest_status VARCHAR(20),    -- 'running', 'completed', 'failed'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 持仓表
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id),
    ticker VARCHAR(20) NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL,
    avg_cost DECIMAL(15, 4) NOT NULL,
    current_price DECIMAL(15, 4),
    market_value DECIMAL(15, 2),
    unrealized_pnl DECIMAL(15, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, ticker)
);

-- 交易记录表
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id),
    ticker VARCHAR(20) NOT NULL,
    trade_type VARCHAR(10) NOT NULL,  -- BUY, SELL
    quantity DECIMAL(15, 4) NOT NULL,
    price DECIMAL(15, 4) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    commission DECIMAL(10, 2) DEFAULT 0,
    slippage DECIMAL(10, 2) DEFAULT 0,
    signal_source VARCHAR(50),  -- 触发信号来源
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 每日结算表（回测和实时都用）
CREATE TABLE daily_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id),
    settlement_date DATE NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    cash DECIMAL(15, 2) NOT NULL,
    holdings_value DECIMAL(15, 2) NOT NULL,
    daily_return DECIMAL(10, 6),
    cumulative_return DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, settlement_date)
);

-- 策略性能表（汇总统计）
CREATE TABLE strategy_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id),
    calculation_date DATE NOT NULL,
    total_return DECIMAL(10, 6),
    annualized_return DECIMAL(10, 6),
    volatility DECIMAL(10, 6),
    max_drawdown DECIMAL(10, 6),
    sharpe_ratio DECIMAL(10, 6),
    sortino_ratio DECIMAL(10, 6),
    calmar_ratio DECIMAL(10, 6),
    win_rate DECIMAL(10, 6),
    total_trades INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, calculation_date)
);

-- 索引
CREATE INDEX idx_trades_portfolio_date ON trades(portfolio_id, executed_at);
CREATE INDEX idx_settlements_portfolio_date ON daily_settlements(portfolio_id, settlement_date);
CREATE INDEX idx_holdings_portfolio ON holdings(portfolio_id);
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
CREATE INDEX idx_portfolios_type ON portfolios(type);
```

### 3.2 数据一致性设计

**原则：** 所有虚拟交易相关的数据统一在 stock_trading_sim 的数据库中管理，避免分散。

- 信号数据：继续使用 JSON 文件（由 stock_quant_work 生成）
- 价格数据：通过 API 获取（Yahoo Finance），回测时可缓存
- 交易数据：存储在 PostgreSQL 的 trades 表
- 性能数据：存储在 daily_settlements 和 strategy_performance 表

---

# 第四部分：前端集成与用户体验

## 4. 前端展示规划

### 4.1 新增页面

#### 1. 回测中心（/backtest）

**功能：**
- 配置回测参数（算法、时间范围、初始资金）
- 启动回测任务
- 查看回测进度
- 展示回测结果

**组件：**
- BacktestConfig（回测配置）
- BacktestRunner（回测执行器）
- BacktestResults（结果展示）

#### 2. 回测结果页（/backtest/:id/results）

**功能：**
- 资产曲线图
- 性能指标卡片
- 交易历史表格
- 回撤曲线图
- 与基准对比

**组件：**
- EquityCurveChart（资产曲线图）
- PerformanceMetrics（性能指标卡片）
- TradeHistory（交易历史）
- DrawdownChart（回撤图表）
- BenchmarkComparison（基准对比）

#### 3. 算法对比页（/compare）

**功能：**
- 选择多个算法进行回测对比
- 并排展示性能指标
- 多条资产曲线叠加
- 相关性分析

**组件：**
- AlgorithmSelector（算法选择器）
- ComparisonTable（对比表格）
- MultiLineChart（多线图表）
- CorrelationMatrix（相关性矩阵）

### 4.2 现有指标展示

当前 stock_kanban 前端已经展示以下技术指标：
- RSI (14)
- MACD
- Bollinger Bands
- SMA (20)

**建议：** 回测结果页面可以复用这些指标的展示组件。

### 4.3 可视化功能（借鉴 Backtrader）

参考 Backtrader 的可视化功能，提供：

- **价格走势与指标叠加**：在价格图上叠加 SMA、Bollinger Bands
- **买卖信号标记**：在图表上标记交易点位
- **成交量柱状图**：在价格图下方展示成交量
- **子图展示**：RSI、MACD 作为子图展示

使用 Recharts 库实现所有图表。

---

# 第五部分：实施路线图

## 5. 分阶段实施计划

> 进度回填规则：每次完成一个计划项，必须在本节打勾确认，并在对应 `docs/*REPORT.md` 记录完成日期与验证结果。  
> 最近回填：2026-02-08

### Phase 1: 回测核心功能（3-4周）⭐ **优先实施**

#### Week 1-2: 回测引擎基础
- [ ] 创建 stock_trading_sim 项目
- [x] 数据库设计与迁移（7个核心表）
- [x] 实现信号提供模块（读取 quant-metrics-*.json）
- [x] 实现价格数据提供模块（Yahoo Finance集成）
- [x] 基础 API 框架搭建

#### Week 3: 回测引擎核心逻辑
- [x] 实现回测引擎主循环
- [x] 实现仓位构建模块
- [x] 实现订单生成逻辑
- [x] 实现交易成本模拟（佣金+滑点）

#### Week 4: 前端集成与测试
- [x] 实现性能指标计算器
- [x] 前端：回测配置页面
- [x] 前端：回测结果展示页面
- [x] 前端：资产曲线图表（使用 Recharts）
- [x] API：回测执行和结果查询接口

**测试目标：** 能够运行单一算法的完整回测，查看资产曲线和性能指标

### Phase 2: 多算法对比与优化（2-3周）

#### Week 1: 多算法支持
- [x] 支持多算法并行回测
- [x] 算法策略对比页面
- [x] 相关性分析
- [x] 性能对比图表（多条资产曲线叠加）

#### Week 2-3: 优化与增强
- [x] 回测性能优化（缓存、并行计算）
- [x] 更多图表类型（回撤曲线、月度收益热力图）
- [x] 导出功能（CSV、PDF报告）

**测试目标：** 能够对比多个算法的回测表现

### Phase 3: 实时虚拟交易与用户系统（2-3周）

#### Week 1: 实时交易基础
- [x] 实时虚拟交易功能（非回测）
- [x] 每日自动结算定时任务
- [x] 实时持仓和收益展示

#### Week 2: 用户系统
- [ ] 用户注册/登录（复用现有 users 表）
- [ ] 用户偏好设置
- [x] 数据权限隔离
- [ ] 投资组合管理

#### Week 3: 风险管理
- [ ] 实现风险管理模块
- [ ] 实现仓位限制检查
- [ ] 止损/止盈功能（可选）

### Phase 4: 高级功能（持续迭代）

- [ ] 技术指标扩展（更多指标）
- [ ] 自定义策略参数
- [ ] 策略参数优化工具（网格搜索、遗传算法）
- [ ] 移动端适配
- [ ] 社区功能（策略分享）
- [ ] 实盘交易接口（长期规划）

---

# 第六部分：技术指标整合方案

## 6. 指标统一管理

### 6.1 现有指标（stock_kanban）

在 `server/stockService.ts` 中已实现：

```typescript
// 现有实现位置：server/stockService.ts
calculateRSI(prices: number[], period: number = 14): number
calculateSMA(prices: number[], period: number): number
calculateEMA(prices: number[], period: number): number[]
calculateMACD(prices: number[]): { macd: number; signal: number }
calculateBollingerBands(prices: number[], period: number = 20): { upper: number; lower: number }
```

### 6.2 指标复用策略

**方案：** 将 stock_kanban 的指标计算函数提取为独立的共享库

```typescript
// 新建 shared/indicators.ts
export class TechnicalIndicators {
  static calculateRSI(prices: number[], period: number = 14): number {
    // 复制 stock_kanban 的实现
  }
  
  static calculateSMA(prices: number[], period: number): number {
    // 复制 stock_kanban 的实现
  }
  
  static calculateEMA(prices: number[], period: number): number[] {
    // 复制 stock_kanban 的实现
  }
  
  static calculateMACD(prices: number[]): { macd: number; signal: number } {
    // 复制 stock_kanban 的实现
  }
  
  static calculateBollingerBands(prices: number[], period: number = 20): { upper: number; lower: number } {
    // 复制 stock_kanban 的实现
  }
}
```

**使用场景：**
- stock_kanban：实时计算并展示
- stock_trading_sim：回测中计算和记录

### 6.3 可扩展指标（从 Backtrader 借鉴）

参考 Backtrader 的指标库，可以扩展：

- **趋势指标**：ADX、Parabolic SAR、Ichimoku
- **动量指标**：Stochastic、CCI、Williams %R
- **成交量指标**：OBV、VWAP、Accumulation/Distribution
- **波动率指标**：ATR、Keltner Channels

**实施建议：** Phase 2 或 Phase 4 根据需要逐步添加。

---

# 附录

## A. 参考资料

本项目设计参考了以下三个成熟的量化交易框架。每个框架都有详细的介绍文档：

1. **[Backtrader](./docs/REFERENCE_Backtrader.md)** - Python量化回测框架
   - 易于学习的 Pythonic API
   - 丰富的技术指标库（100+）
   - 完整的交易模拟和性能分析
   - 可视化功能强大

2. **[Zipline](./docs/REFERENCE_Zipline.md)** - 机构级Python量化引擎
   - 严格的时间点数据管理（Point-in-Time）
   - 强大的 Pipeline API 用于因子计算
   - 防止前视偏差和幸存者偏差
   - Quantopian 的核心技术

3. **[QuantConnect LEAN](./docs/REFERENCE_QuantConnect.md)** - 云端量化交易平台
   - 多资产类别支持（股票、期货、期权、外汇、加密货币）
   - 回测与实盘统一接口
   - 模块化的 Alpha Framework
   - 分钟级和 Tick 级数据支持

## B. 技术决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 项目定位 | 独立后端服务 | 职责分离，便于扩展 |
| 优先功能 | 回测引擎 | 核心需求，技术基础 |
| 数据库 | PostgreSQL | 与现有技术栈一致 |
| ORM | Drizzle | 与 stock_kanban 保持一致 |
| 语言 | TypeScript | 类型安全，与前端共享类型 |
| 指标计算 | 复用现有实现 | 避免重复开发 |
| 数据管理 | 统一数据库 | 避免数据分散 |

## C. 常见问题解答

**Q1: IMPLEMENTATION_PLAN.md 的内容都保留吗？**
A: 是的，本文档整合了 IMPLEMENTATION_PLAN.md 的核心内容，避免重复。原文档可以归档或删除。

**Q2: 回测和实时交易用同一个数据库吗？**
A: 是的，使用同一个数据库，通过 portfolios 表的 `type` 字段区分（'backtest' 或 'live'）。

**Q3: 现有的指标计算需要重写吗？**
A: 不需要。stock_kanban 已经实现了核心指标，可以提取为共享库复用。

**Q4: Phase 1 完成后能做什么？**
A: 可以配置并运行单一算法的完整回测，查看资产曲线和性能指标（夏普比率、最大回撤等）。

**Q5: 前端需要大改吗？**
A: 不需要大改。新增几个页面（回测配置、结果展示），可以复用现有的图表组件。

---

**文档版本：** v2.0（整合版）  
**最后更新：** 2026-02-06  
**状态：** 待审核
