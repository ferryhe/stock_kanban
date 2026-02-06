# 虚拟交易系统设计方案

## 概述

本文档针对基于 `stock_kanban` 和 `stock_quant_work` 的虚拟交易功能进行全面的技术设计和规划。

## 1. 项目定位与架构建议

### 1.1 推荐方案：分离式架构

**建议：创建独立的 `stock_trading_sim` 后端服务**

#### 理由：

1. **职责分离**
   - `stock_kanban`：前端展示、看板管理、实时行情查看
   - `stock_quant_work`：量化分析、策略计算、信号生成
   - `stock_trading_sim`（新）：虚拟交易、资金管理、收益计算、历史记录

2. **独立扩展性**
   - 交易系统有独立的业务逻辑和数据模型
   - 便于后期添加复杂交易规则（杠杆、期权、止损等）
   - 可独立部署和扩容

3. **数据流向清晰**
   ```
   stock_quant_work → 生成量化信号 → JSON文件
                    ↓
   stock_trading_sim → 读取信号 → 执行虚拟交易 → 存储交易记录
                    ↓
   stock_kanban → 读取交易数据 → 前端展示
   ```

### 1.2 项目结构建议

```
stock_trading_sim/  (新建独立仓库)
├── src/
│   ├── models/           # 数据模型
│   │   ├── strategy.ts   # 策略定义
│   │   ├── portfolio.ts  # 投资组合
│   │   ├── trade.ts      # 交易记录
│   │   └── performance.ts # 收益统计
│   ├── services/
│   │   ├── signal_reader.ts    # 读取量化信号
│   │   ├── trading_engine.ts   # 交易引擎
│   │   ├── settlement.ts       # 每日结算
│   │   └── performance.ts      # 收益计算
│   ├── strategies/       # 策略实现
│   │   ├── base.ts       # 基础策略类
│   │   ├── signal_follow.ts    # 信号跟随策略
│   │   ├── momentum.ts         # 动量策略
│   │   └── mean_reversion.ts  # 均值回归策略
│   ├── api/              # API接口
│   │   ├── routes.ts
│   │   └── controllers.ts
│   └── jobs/             # 定时任务
│       └── daily_settlement.ts
├── database/
│   ├── schema.sql        # 数据库结构
│   └── migrations/
└── config/
    └── strategies.yaml   # 策略配置
```

## 2. 多策略支持与对比

### 2.1 策略架构设计

#### 基础策略接口

```typescript
interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  
  // 策略方法
  shouldBuy(signal: Signal, portfolio: Portfolio): Decision;
  shouldSell(holding: Holding, signal: Signal): Decision;
  calculatePosition(signal: Signal, availableCash: number): number;
}
```

#### 预设策略方案

1. **信号跟随策略（Signal Following）**
   - 直接执行量化信号（BUY/SELL/HOLD）
   - 参数：仓位比例、最大持仓数

2. **趋势跟踪策略（Trend Following）**
   - 基于信号 + 技术指标确认
   - 参数：RSI阈值、MACD确认

3. **均值回归策略（Mean Reversion）**
   - 反向操作，超卖买入、超买卖出
   - 参数：偏离度阈值

4. **组合优化策略（Portfolio Optimization）**
   - 基于风险调整后收益优化配置
   - 参数：最大风险、目标收益

### 2.2 策略对比维度

#### 性能指标

```typescript
interface StrategyPerformance {
  // 收益指标
  totalReturn: number;           // 总收益率
  annualizedReturn: number;      // 年化收益率
  dailyReturns: number[];        // 每日收益序列
  cumulativeReturns: number[];   // 累计收益曲线
  
  // 风险指标
  volatility: number;            // 波动率
  maxDrawdown: number;           // 最大回撤
  sharpeRatio: number;           // 夏普比率
  sortinoRatio: number;          // 索提诺比率
  calmarRatio: number;           // 卡尔玛比率
  
  // 交易指标
  totalTrades: number;           // 总交易次数
  winRate: number;               // 胜率
  avgWin: number;                // 平均盈利
  avgLoss: number;               // 平均亏损
  profitFactor: number;          // 盈亏比
  
  // 时间序列
  equityCurve: TimeSeries[];     // 资产曲线
  drawdownCurve: TimeSeries[];   // 回撤曲线
}
```

#### 对比展示方案

1. **表格对比**
   - 并排显示各策略关键指标
   - 支持排序和筛选

2. **图表对比**
   - 多策略资产曲线叠加
   - 收益率热力图
   - 风险-收益散点图

3. **相关性分析**
   - 策略间收益相关性矩阵
   - 分散化效果评估

## 3. 历史数据存储方案

### 3.1 数据库设计

#### PostgreSQL Schema

```sql
-- 策略定义表
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 投资组合表
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID REFERENCES strategies(id),
    user_id UUID REFERENCES users(id),  -- 为未来用户管理预留
    name VARCHAR(100) NOT NULL,
    initial_cash DECIMAL(15, 2) NOT NULL,
    current_cash DECIMAL(15, 2) NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
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
    signal_source VARCHAR(50),  -- 触发信号来源
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 每日结算表
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
    win_rate DECIMAL(10, 6),
    total_trades INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, calculation_date)
);

-- 索引
CREATE INDEX idx_trades_portfolio_date ON trades(portfolio_id, executed_at);
CREATE INDEX idx_settlements_portfolio_date ON daily_settlements(portfolio_id, settlement_date);
CREATE INDEX idx_holdings_portfolio ON holdings(portfolio_id);
```

### 3.2 数据保留策略

1. **原始交易数据**：永久保留
2. **每日结算数据**：永久保留（压缩归档）
3. **分钟级快照**：保留最近30天
4. **实时计算结果**：缓存1小时

### 3.3 数据归档方案

```typescript
// 时序数据库（可选：TimescaleDB）
// 用于存储高频性能数据
interface PerformanceSnapshot {
  portfolio_id: string;
  timestamp: Date;
  total_value: number;
  metrics: PerformanceMetrics;
}
```

## 4. 用户管理前瞻性设计

### 4.1 用户系统扩展

#### 用户表扩展

```sql
-- 扩展现有 users 表
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';  -- user, admin, premium

-- 用户配置表
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    default_initial_cash DECIMAL(15, 2) DEFAULT 100000,
    risk_tolerance VARCHAR(20) DEFAULT 'medium',  -- low, medium, high
    preferred_strategies UUID[],  -- 偏好策略ID数组
    notification_settings JSONB,
    ui_preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 权限设计

#### 基础权限层级

1. **游客模式（Guest）**
   - 查看公开的策略表现
   - 使用预设策略进行回测

2. **注册用户（User）**
   - 创建个人投资组合
   - 保存自定义策略
   - 查看个人历史记录

3. **高级用户（Premium）**
   - 创建无限投资组合
   - 自定义策略参数
   - 导出详细报告
   - API访问权限

4. **管理员（Admin）**
   - 管理策略库
   - 查看系统统计
   - 用户管理

### 4.3 数据隔离

```typescript
interface DataAccessControl {
  // 多租户数据隔离
  portfolios: "user_scoped";  // 每个用户只能访问自己的组合
  strategies: "shared_read";  // 公共策略所有人可见
  trades: "user_scoped";      // 交易记录仅限用户自己
  performance: "user_scoped"; // 性能数据仅限用户自己
}
```

## 5. 系统架构与技术选型

### 5.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (stock_kanban)                  │
│  React + TypeScript + Tailwind + Recharts                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API / WebSocket
┌──────────────────────┴──────────────────────────────────────┐
│              Backend API (stock_trading_sim)                 │
│  Node.js + Express + TypeScript                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Trading Engine │  │ Settlement Job │  │ Signal Reader │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    Database Layer                            │
│  PostgreSQL (交易数据、用户数据)                             │
│  Redis (缓存、实时行情)                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              Quantitative Engine (stock_quant_work)          │
│  Python + Pandas + Sklearn                                   │
│  ├── 策略计算                                                │
│  ├── 信号生成                                                │
│  └── 输出 JSON (quant-metrics-*.json)                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 技术栈推荐

#### 后端（stock_trading_sim）

```typescript
// 核心技术栈
{
  "runtime": "Node.js 20+",
  "framework": "Express 5",
  "language": "TypeScript 5",
  "database": "PostgreSQL 16",
  "cache": "Redis 7",
  "orm": "Drizzle ORM",  // 与 stock_kanban 保持一致
  "validation": "Zod",
  "testing": "Vitest",
  "scheduler": "node-cron"
}
```

#### 前端扩展（stock_kanban）

```typescript
// 新增依赖
{
  "charting": "recharts",  // 已有
  "tables": "@tanstack/react-table",
  "forms": "react-hook-form",  // 已有
  "state": "@tanstack/react-query"  // 已有
}
```

### 5.3 API设计

#### RESTful API 端点

```typescript
// 策略管理
GET    /api/strategies              // 获取所有策略
GET    /api/strategies/:id          // 获取单个策略
POST   /api/strategies              // 创建策略
PUT    /api/strategies/:id          // 更新策略
DELETE /api/strategies/:id          // 删除策略

// 投资组合管理
GET    /api/portfolios              // 获取用户的所有组合
GET    /api/portfolios/:id          // 获取单个组合详情
POST   /api/portfolios              // 创建新组合
PUT    /api/portfolios/:id          // 更新组合
DELETE /api/portfolios/:id          // 删除组合

// 交易记录
GET    /api/portfolios/:id/trades   // 获取交易历史
POST   /api/portfolios/:id/trades   // 手动执行交易

// 持仓查询
GET    /api/portfolios/:id/holdings // 获取当前持仓

// 性能分析
GET    /api/portfolios/:id/performance        // 获取性能指标
GET    /api/portfolios/:id/equity-curve       // 获取资产曲线
GET    /api/portfolios/:id/drawdown-curve     // 获取回撤曲线

// 策略对比
POST   /api/compare/strategies       // 对比多个策略
GET    /api/compare/portfolios       // 对比多个组合

// 每日结算
GET    /api/portfolios/:id/settlements         // 获取结算历史
POST   /api/admin/trigger-settlement           // 手动触发结算
```

#### WebSocket 端点（可选）

```typescript
// 实时行情推送
ws://api/live-quotes

// 实时组合价值更新
ws://api/portfolios/:id/live
```

## 6. 交易规则细化

### 6.1 交易执行规则

#### 基础规则

```typescript
interface TradingRules {
  // 时间规则
  tradingHours: {
    us: { start: "09:30", end: "16:00", timezone: "America/New_York" },
    cn: { start: "09:30", end: "15:00", timezone: "Asia/Shanghai" },
    hk: { start: "09:30", end: "16:00", timezone: "Asia/Hong_Kong" }
  };
  
  // 仓位规则
  maxPositionPerStock: 0.2;      // 单股最大仓位20%
  minPositionSize: 100;           // 最小交易金额
  maxTotalPositions: 10;          // 最大持仓数量
  
  // 现金管理
  minCashReserve: 0.05;           // 最小现金储备5%
  maxLeverage: 1.0;               // 最大杠杆（1.0=不加杠杆）
  
  // 交易成本
  commission: {
    type: "percentage",           // 或 "fixed"
    rate: 0.0002,                 // 0.02%
    min: 1.0                      // 最小手续费
  };
  
  // 风险控制
  stopLoss: {
    enabled: true,
    percentage: 0.1               // 10% 止损
  };
  takeProfit: {
    enabled: false,
    percentage: 0.2               // 20% 止盈
  };
}
```

#### 信号执行逻辑

```typescript
class SignalFollowingStrategy {
  async execute(signal: Signal, portfolio: Portfolio) {
    switch (signal.signal) {
      case "BUY":
        if (this.canBuy(signal, portfolio)) {
          const position = this.calculatePosition(signal, portfolio);
          await this.executeBuy(signal.ticker, position);
        }
        break;
        
      case "SELL":
        if (this.hasHolding(signal.ticker, portfolio)) {
          await this.executeSell(signal.ticker, "full");
        }
        break;
        
      case "HOLD":
        // 保持现有持仓，不操作
        break;
        
      case "RISK_ALERT":
        // 可选：降低仓位或全部清仓
        if (this.riskManagement.enabled) {
          await this.reducePosition(signal.ticker, 0.5);
        }
        break;
    }
  }
}
```

### 6.2 结算流程

#### 每日结算步骤

```typescript
async function dailySettlement() {
  // 1. 获取所有活跃组合
  const activePortfolios = await getActivePortfolios();
  
  for (const portfolio of activePortfolios) {
    // 2. 更新持仓市值
    await updateHoldingsPrices(portfolio);
    
    // 3. 计算总资产
    const totalValue = calculateTotalValue(portfolio);
    
    // 4. 计算当日收益
    const dailyReturn = calculateDailyReturn(portfolio, totalValue);
    
    // 5. 记录结算数据
    await saveDailySettlement({
      portfolio_id: portfolio.id,
      settlement_date: today(),
      total_value: totalValue,
      daily_return: dailyReturn,
      cumulative_return: calculateCumulativeReturn(portfolio)
    });
    
    // 6. 更新性能指标
    await updatePerformanceMetrics(portfolio);
    
    // 7. 检查并执行下一个交易日信号
    await processNextDaySignals(portfolio);
  }
}
```

## 7. 前端展示规划

### 7.1 新增页面

#### 1. 策略中心（/strategies）

**功能：**
- 展示所有可用策略
- 策略描述和参数说明
- 历史表现数据
- 创建/编辑自定义策略

**组件：**
- StrategyList（策略列表）
- StrategyCard（策略卡片）
- StrategyEditor（策略编辑器）
- BacktestRunner（回测运行器）

#### 2. 投资组合（/portfolios）

**功能：**
- 用户的所有投资组合
- 资产总览
- 当前持仓
- 待处理信号

**组件：**
- PortfolioList（组合列表）
- PortfolioSummary（组合概览）
- HoldingsTable（持仓表格）
- PendingSignals（待处理信号）

#### 3. 交易记录（/portfolios/:id/trades）

**功能：**
- 历史交易列表
- 交易详情
- 盈亏分析
- 导出功能

**组件：**
- TradeHistory（交易历史）
- TradeDetail（交易详情）
- PnLChart（盈亏图表）

#### 4. 性能分析（/portfolios/:id/performance）

**功能：**
- 资产曲线
- 收益率统计
- 风险指标
- 对比基准（如 SPY）

**组件：**
- EquityCurveChart（资产曲线图）
- PerformanceMetrics（性能指标卡片）
- DrawdownChart（回撤图表）
- ReturnsHeatmap（收益热力图）

#### 5. 策略对比（/compare）

**功能：**
- 多策略并排对比
- 相关性分析
- 回测时间范围选择
- 导出对比报告

**组件：**
- StrategyComparison（策略对比表格）
- MultiLineChart（多线图表）
- CorrelationMatrix（相关性矩阵）

### 7.2 UI/UX 设计要点

1. **响应式设计**
   - 移动端优先
   - 平板适配
   - 桌面端完整功能

2. **数据可视化**
   - 使用 Recharts 绘制图表
   - 交互式图表（缩放、工具提示）
   - 深色模式支持

3. **实时更新**
   - WebSocket 推送价格更新
   - React Query 自动刷新
   - 乐观更新 UI

## 8. 实施路线图

### Phase 1: MVP 基础功能（2-3周）

**Week 1-2: 后端核心**
- [ ] 创建 stock_trading_sim 项目
- [ ] 数据库设计与迁移
- [ ] 基础 API 框架搭建
- [ ] 信号读取服务
- [ ] 简单策略实现（信号跟随）

**Week 2-3: 前端集成**
- [ ] stock_kanban 添加投资组合页面
- [ ] 展示持仓和交易记录
- [ ] 基础性能图表
- [ ] 策略选择界面

**Week 3: 测试与优化**
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化
- [ ] 部署上线

### Phase 2: 多策略支持（2-3周）

- [ ] 实现3-5个预设策略
- [ ] 策略对比功能
- [ ] 性能指标完善
- [ ] 回测历史数据

### Phase 3: 用户系统（2周）

- [ ] 用户注册/登录
- [ ] 权限管理
- [ ] 用户偏好设置
- [ ] 数据隔离

### Phase 4: 高级功能（持续迭代）

- [ ] 自定义策略编辑器
- [ ] 实时行情推送
- [ ] 移动端 App
- [ ] 报告生成与导出
- [ ] 社区功能（策略分享）

## 9. 未考虑到的重要问题

### 9.1 数据质量与一致性

**问题：**
- 量化信号数据可能有延迟或缺失
- 实时行情数据的准确性
- 历史数据回填问题

**解决方案：**
- 实现数据验证层
- 信号数据版本管理
- 异常数据报警机制
- 数据源备份方案

### 9.2 交易成本与滑点

**问题：**
- 虚拟交易需要模拟真实交易成本
- 大额订单可能有滑点
- 流动性考虑

**解决方案：**
```typescript
interface TradeCostModel {
  commission: number;          // 佣金
  slippage: number;            // 滑点（基于交易量）
  marketImpact: number;        // 市场冲击
  bidAskSpread: number;        // 买卖价差
}
```

### 9.3 回测偏差（Backtest Bias）

**问题：**
- 前视偏差（Look-ahead bias）
- 幸存者偏差（Survivorship bias）
- 过拟合风险

**解决方案：**
- 严格的时间点数据隔离
- 使用 point-in-time 数据
- 样本外测试（Out-of-sample test）
- 滚动窗口验证

### 9.4 系统性能与扩展性

**问题：**
- 大量用户并发访问
- 历史数据快速增长
- 实时计算压力

**解决方案：**
```typescript
// 性能优化策略
interface PerformanceOptimization {
  caching: {
    redis: "实时数据",
    cdn: "静态资源",
    browserCache: "前端缓存"
  };
  
  database: {
    indexing: "关键字段索引",
    partitioning: "按日期分区",
    archiving: "历史数据归档"
  };
  
  computation: {
    asyncJobs: "后台计算",
    batchProcessing: "批量处理",
    caching: "计算结果缓存"
  };
}
```

### 9.5 合规性与免责声明

**问题：**
- 虚拟交易不等于真实交易
- 历史表现不代表未来收益
- 可能涉及的法律风险

**解决方案：**
- 添加明确的免责声明
- 区分虚拟与真实交易
- 教育性质说明
- 不提供投资建议

```typescript
// 免责声明示例
const DISCLAIMER = `
本系统仅供学习和研究使用，不构成任何投资建议。
虚拟交易结果基于历史数据模拟，不代表真实交易表现。
实际投资存在风险，请谨慎决策并自行承担责任。
`;
```

### 9.6 国际化与多市场支持

**问题：**
- 不同市场有不同交易规则
- 时区处理复杂
- 货币换算

**解决方案：**
```typescript
interface MarketConfig {
  market: "US" | "CN" | "HK";
  currency: "USD" | "CNY" | "HKD";
  tradingHours: TradingHours;
  holidays: Date[];
  minTickSize: number;
  lotSize: number;
}
```

### 9.7 监控与告警

**问题：**
- 系统故障影响交易
- 数据异常未被发现
- 性能瓶颈

**解决方案：**
- 日志系统（Winston/Pino）
- 错误追踪（Sentry）
- 性能监控（Prometheus + Grafana）
- 告警机制（邮件/短信/Slack）

### 9.8 备份与灾难恢复

**问题：**
- 数据丢失风险
- 服务中断
- 误操作恢复

**解决方案：**
```typescript
interface DisasterRecovery {
  backup: {
    database: "每日全量 + 实时增量",
    frequency: "4小时一次",
    retention: "90天"
  };
  
  recovery: {
    rto: "1小时",  // 恢复时间目标
    rpo: "15分钟"  // 恢复点目标
  };
  
  redundancy: {
    database: "主从复制",
    application: "多实例部署",
    loadBalancer: "自动故障转移"
  };
}
```

## 10. 总结与建议

### 10.1 架构总结

**推荐方案：** 三层分离架构
1. **stock_kanban** - 前端展示层
2. **stock_trading_sim** - 虚拟交易后端（新建）
3. **stock_quant_work** - 量化分析引擎

### 10.2 优先级建议

**高优先级（立即实施）：**
1. 创建独立的 trading_sim 后端
2. 实现基础信号跟随策略
3. 完成核心数据库设计
4. 前端基础展示页面

**中优先级（后续迭代）：**
1. 多策略实现与对比
2. 性能指标完善
3. 历史数据回测

**低优先级（长期规划）：**
1. 用户系统完整实现
2. 移动端 App
3. 高级分析功能

### 10.3 风险提示

1. **数据依赖风险**：依赖 stock_quant_work 的数据质量
2. **计算复杂度**：多策略对比可能影响性能
3. **用户期望管理**：虚拟交易 ≠ 真实交易

### 10.4 下一步行动

1. **评审本设计文档**
2. **确定实施范围**（MVP vs. 完整方案）
3. **创建 stock_trading_sim 仓库**
4. **数据库迁移脚本编写**
5. **开始 Phase 1 开发**

---

## 附录

### A. 参考资料

- [Backtrader Documentation](https://www.backtrader.com/)
- [Zipline Algorithmic Trading](https://github.com/quantopian/zipline)
- [QuantConnect LEAN Engine](https://github.com/QuantConnect/Lean)

### B. 技术决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 项目定位 | 独立后端服务 | 职责分离，便于扩展 |
| 数据库 | PostgreSQL | 与现有技术栈一致 |
| ORM | Drizzle | 与 stock_kanban 保持一致 |
| 语言 | TypeScript | 类型安全，与前端共享类型 |

### C. 术语表

- **虚拟交易（Paper Trading）**：使用真实市场数据进行模拟交易
- **回测（Backtesting）**：使用历史数据测试策略表现
- **夏普比率（Sharpe Ratio）**：风险调整后的收益指标
- **最大回撤（Max Drawdown）**：资产从峰值到谷底的最大跌幅
- **滑点（Slippage）**：预期价格与实际成交价格的差异

---

**文档版本：** v1.0  
**最后更新：** 2026-02-06  
**作者：** GitHub Copilot Agent  
**状态：** 待评审
