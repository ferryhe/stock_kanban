# 虚拟交易系统实施计划

> 基于参考框架学习成果的详细实施方案

## 概述

根据对 Backtrader、Zipline 和 QuantConnect LEAN 三大量化框架的学习研究，本文档详细规划虚拟交易系统的实施方案，重点关注：

1. **回测功能**：核心功能模块
2. **交易处理**：订单管理、执行和结算
3. **技术指标**：可复用的量化指标库
4. **模块化设计**：减少代码量，提高复用性

## 一、模块化架构设计（借鉴 QuantConnect Alpha Framework）

### 1.1 核心模块划分

参考 QuantConnect LEAN 的 Alpha Framework，将系统分解为独立、可复用的模块：

```typescript
// 模块化架构
interface TradingSystem {
  // 1. 信号模块（Alpha Model）
  signalProvider: ISignalProvider;
  
  // 2. 仓位构建模块（Portfolio Construction）
  portfolioBuilder: IPortfolioBuilder;
  
  // 3. 执行模块（Execution Model）
  executionEngine: IExecutionEngine;
  
  // 4. 风险管理模块（Risk Management）
  riskManager: IRiskManager;
  
  // 5. 回测引擎（Backtesting Engine）
  backtestEngine: IBacktestEngine;
}
```

### 1.2 模块接口定义

#### 1.2.1 信号提供模块

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

#### 1.2.2 仓位构建模块

```typescript
interface IPortfolioBuilder {
  /**
   * 根据信号计算目标仓位
   * @param signals - 交易信号列表
   * @param portfolio - 当前投资组合
   * @param params - 仓位参数
   * @returns 目标仓位列表
   */
  buildTargetPositions(
    signals: Signal[],
    portfolio: Portfolio,
    params: PositionParams
  ): TargetPosition[];
}

interface PositionParams {
  maxPositionPerStock: number;    // 单股最大仓位比例
  maxTotalPositions: number;       // 最大持仓数量
  minCashReserve: number;          // 最小现金储备比例
  positionSizingMethod: 'equal' | 'signal_weighted' | 'risk_parity';
}

interface TargetPosition {
  ticker: string;
  targetWeight: number;    // 目标权重
  targetValue: number;     // 目标金额
  targetShares: number;    // 目标股数
}
```

#### 1.2.3 执行引擎模块

```typescript
interface IExecutionEngine {
  /**
   * 执行交易订单
   * @param orders - 订单列表
   * @param executionParams - 执行参数
   * @returns 成交记录
   */
  execute(
    orders: Order[],
    executionParams: ExecutionParams
  ): Promise<Fill[]>;
}

interface ExecutionParams {
  slippageModel: SlippageModel;
  commissionModel: CommissionModel;
  executionTime: 'open' | 'close' | 'intraday';
}

interface Fill {
  orderId: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  shares: number;
  fillPrice: number;
  commission: number;
  slippage: number;
  timestamp: Date;
}
```

#### 1.2.4 风险管理模块

```typescript
interface IRiskManager {
  /**
   * 检查订单是否符合风险规则
   * @param order - 订单
   * @param portfolio - 投资组合
   * @returns 是否允许执行
   */
  checkOrder(order: Order, portfolio: Portfolio): RiskCheckResult;
  
  /**
   * 计算组合风险指标
   */
  calculateRisk(portfolio: Portfolio): RiskMetrics;
}

interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  adjustedOrder?: Order;  // 调整后的订单
}

interface RiskMetrics {
  portfolioVolatility: number;
  portfolioBeta: number;
  concentrationRisk: number;      // 集中度风险
  sectorExposure: Record<string, number>;
}
```

#### 1.2.5 回测引擎模块

```typescript
interface IBacktestEngine {
  /**
   * 运行回测
   * @param config - 回测配置
   * @returns 回测结果
   */
  run(config: BacktestConfig): Promise<BacktestResult>;
  
  /**
   * 获取回测进度
   */
  getProgress(): BacktestProgress;
}

interface BacktestConfig {
  algorithm: string;              // 算法标识
  startDate: Date;
  endDate: Date;
  initialCash: number;
  
  // 策略参数
  positionParams: PositionParams;
  executionParams: ExecutionParams;
  
  // 回测选项
  options: {
    benchmark?: string;           // 基准指数（如 SPY）
    rebalanceFrequency?: 'daily' | 'weekly' | 'monthly';
    saveDetailedLog?: boolean;
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

### 1.3 模块化设计的优势

通过模块化设计，可以：

1. **减少代码量**：每个模块独立开发和测试
2. **提高复用性**：模块可以在不同策略中复用
3. **便于维护**：修改某个模块不影响其他模块
4. **易于扩展**：新增功能只需实现对应接口
5. **支持测试**：每个模块可独立单元测试

## 二、回测功能详细设计

### 2.1 回测流程

```
┌─────────────────────────────────────────────────────────────┐
│                      回测引擎流程                            │
└─────────────────────────────────────────────────────────────┘

1. 初始化
   ├── 加载历史信号数据（从 quant-metrics-*.json）
   ├── 加载历史价格数据（从 Yahoo Finance 或其他源）
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
   ├── d. 风险检查
   │   └── riskManager.checkOrder(order, portfolio)
   │
   ├── e. 执行订单
   │   └── executionEngine.execute(orders, executionParams)
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

### 2.2 回测引擎实现

```typescript
class BacktestEngine implements IBacktestEngine {
  constructor(
    private signalProvider: ISignalProvider,
    private portfolioBuilder: IPortfolioBuilder,
    private executionEngine: IExecutionEngine,
    private riskManager: IRiskManager,
    private priceProvider: IPriceProvider
  ) {}
  
  async run(config: BacktestConfig): Promise<BacktestResult> {
    // 1. 初始化
    const portfolio = this.initializePortfolio(config.initialCash);
    const results: BacktestResult = {
      summary: {} as PerformanceSummary,
      equityCurve: [],
      trades: [],
      positions: [],
      metrics: {} as PerformanceMetrics
    };
    
    // 2. 获取回测时间范围内的所有交易日
    const tradingDays = this.getTradingDays(config.startDate, config.endDate);
    
    // 3. 逐日回测
    for (const date of tradingDays) {
      // a. 获取当日信号
      const signals = await this.signalProvider.getSignals(config.algorithm, date);
      
      // b. 构建目标仓位
      const targetPositions = this.portfolioBuilder.buildTargetPositions(
        signals,
        portfolio,
        config.positionParams
      );
      
      // c. 生成订单
      const orders = this.generateOrders(portfolio, targetPositions);
      
      // d. 风险检查（可选）
      const checkedOrders = orders.filter(order => 
        this.riskManager.checkOrder(order, portfolio).allowed
      );
      
      // e. 执行订单
      const fills = await this.executionEngine.execute(
        checkedOrders,
        config.executionParams
      );
      
      // f. 更新持仓
      this.updatePortfolio(portfolio, fills);
      
      // g. 获取收盘价并更新市值
      await this.updateMarketValues(portfolio, date);
      
      // h. 记录数据
      results.equityCurve.push({
        date,
        value: portfolio.totalValue,
        cash: portfolio.cash,
        holdings: portfolio.holdingsValue
      });
      
      results.trades.push(...fills);
      
      // 记录每日持仓快照
      results.positions.push({
        date,
        positions: [...portfolio.positions]
      });
    }
    
    // 4. 计算性能指标
    results.summary = this.calculateSummary(results);
    results.metrics = this.calculateMetrics(results, config);
    
    return results;
  }
  
  private generateOrders(
    portfolio: Portfolio,
    targetPositions: TargetPosition[]
  ): Order[] {
    const orders: Order[] = [];
    
    // 生成卖出订单（先卖后买，释放资金）
    for (const [ticker, position] of portfolio.positions) {
      const target = targetPositions.find(t => t.ticker === ticker);
      
      if (!target || target.targetShares < position.shares) {
        const sharesToSell = target 
          ? position.shares - target.targetShares
          : position.shares;
        
        orders.push({
          ticker,
          type: 'SELL',
          shares: sharesToSell,
          orderType: 'MARKET'
        });
      }
    }
    
    // 生成买入订单
    for (const target of targetPositions) {
      const currentPosition = portfolio.positions.get(target.ticker);
      const currentShares = currentPosition?.shares || 0;
      
      if (target.targetShares > currentShares) {
        orders.push({
          ticker: target.ticker,
          type: 'BUY',
          shares: target.targetShares - currentShares,
          orderType: 'MARKET'
        });
      }
    }
    
    return orders;
  }
}
```

### 2.3 历史数据管理

```typescript
interface IPriceProvider {
  /**
   * 获取历史价格数据
   * @param ticker - 股票代码
   * @param startDate - 开始日期
   * @param endDate - 结束日期
   * @returns 价格数据
   */
  getHistoricalPrices(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<PriceData[]>;
  
  /**
   * 获取特定日期的价格
   */
  getPrice(ticker: string, date: Date, priceType: 'open' | 'close'): Promise<number>;
}

interface PriceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;  // 复权价格
}

// 实现：使用 yahoo-finance2 包
class YahooFinancePriceProvider implements IPriceProvider {
  async getHistoricalPrices(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<PriceData[]> {
    const yahooFinance = require('yahoo-finance2').default;
    
    const result = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });
    
    return result.map(r => ({
      date: r.date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
      adjustedClose: r.adjClose
    }));
  }
  
  async getPrice(ticker: string, date: Date, priceType: 'open' | 'close'): Promise<number> {
    // 实现获取特定日期价格的逻辑
    // 可以从缓存中获取以提高性能
  }
}
```

## 三、交易成本模拟（借鉴 Zipline）

### 3.1 佣金模型

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

// 固定佣金
class FixedCommission implements CommissionModel {
  constructor(private fixedCost: number = 5.0) {}
  
  calculate(trade: Trade): number {
    return this.fixedCost;
  }
}
```

### 3.2 滑点模型

```typescript
interface SlippageModel {
  /**
   * 计算滑点
   * @param order - 订单
   * @param marketData - 市场数据
   * @returns 实际成交价格
   */
  calculateFillPrice(order: Order, marketData: MarketData): number;
}

// 固定滑点模型
class FixedSlippage implements SlippageModel {
  constructor(private slippageBps: number = 5) {}  // 5个基点
  
  calculateFillPrice(order: Order, marketData: MarketData): number {
    const basePrice = marketData.close;
    const slippageAmount = basePrice * (this.slippageBps / 10000);
    
    if (order.type === 'BUY') {
      return basePrice + slippageAmount;  // 买入价格更高
    } else {
      return basePrice - slippageAmount;  // 卖出价格更低
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
    
    // 计算订单占成交量的比例
    const volumeShare = order.shares / dailyVolume;
    
    if (volumeShare > this.volumeLimit) {
      // 如果订单过大，增加滑点
      const excessVolume = volumeShare - this.volumeLimit;
      const additionalSlippage = basePrice * excessVolume * this.priceImpact;
      
      if (order.type === 'BUY') {
        return basePrice + additionalSlippage;
      } else {
        return basePrice - additionalSlippage;
      }
    }
    
    // 正常滑点
    const normalSlippage = basePrice * volumeShare * this.priceImpact * 0.5;
    
    if (order.type === 'BUY') {
      return basePrice + normalSlippage;
    } else {
      return basePrice - normalSlippage;
    }
  }
}
```

### 3.3 交易成本配置

```typescript
interface TradingCostConfig {
  commission: {
    model: 'per_share' | 'percentage' | 'fixed';
    params: {
      costPerShare?: number;
      percentage?: number;
      fixedCost?: number;
      minCost?: number;
    };
  };
  
  slippage: {
    model: 'fixed' | 'volume_share';
    params: {
      slippageBps?: number;
      volumeLimit?: number;
      priceImpact?: number;
    };
  };
}

// 默认配置
const DEFAULT_COST_CONFIG: TradingCostConfig = {
  commission: {
    model: 'percentage',
    params: {
      percentage: 0.0002,  // 0.02%
      minCost: 1.0
    }
  },
  slippage: {
    model: 'fixed',
    params: {
      slippageBps: 5  // 5个基点
    }
  }
};
```

## 四、技术指标库（可复用）

### 4.1 基础指标接口

```typescript
interface Indicator<T = number> {
  readonly name: string;
  readonly period: number;
  
  /**
   * 是否有足够的数据计算指标
   */
  isReady(): boolean;
  
  /**
   * 添加新数据点
   */
  update(value: number): void;
  
  /**
   * 获取当前指标值
   */
  getValue(): T;
  
  /**
   * 重置指标
   */
  reset(): void;
}
```

### 4.2 常用技术指标实现

#### 4.2.1 简单移动平均线（SMA）

```typescript
class SimpleMovingAverage implements Indicator {
  readonly name = 'SMA';
  private values: number[] = [];
  
  constructor(public readonly period: number) {}
  
  isReady(): boolean {
    return this.values.length >= this.period;
  }
  
  update(value: number): void {
    this.values.push(value);
    if (this.values.length > this.period) {
      this.values.shift();
    }
  }
  
  getValue(): number {
    if (!this.isReady()) {
      throw new Error('Indicator not ready');
    }
    
    const sum = this.values.reduce((a, b) => a + b, 0);
    return sum / this.period;
  }
  
  reset(): void {
    this.values = [];
  }
}
```

#### 4.2.2 指数移动平均线（EMA）

```typescript
class ExponentialMovingAverage implements Indicator {
  readonly name = 'EMA';
  private ema: number | null = null;
  private count = 0;
  
  constructor(public readonly period: number) {}
  
  isReady(): boolean {
    return this.count >= this.period;
  }
  
  update(value: number): void {
    if (this.ema === null) {
      this.ema = value;
    } else {
      const k = 2 / (this.period + 1);
      this.ema = value * k + this.ema * (1 - k);
    }
    this.count++;
  }
  
  getValue(): number {
    if (!this.isReady() || this.ema === null) {
      throw new Error('Indicator not ready');
    }
    return this.ema;
  }
  
  reset(): void {
    this.ema = null;
    this.count = 0;
  }
}
```

#### 4.2.3 相对强弱指标（RSI）

```typescript
class RelativeStrengthIndex implements Indicator {
  readonly name = 'RSI';
  private gains: number[] = [];
  private losses: number[] = [];
  private prevClose: number | null = null;
  
  constructor(public readonly period: number = 14) {}
  
  isReady(): boolean {
    return this.gains.length >= this.period;
  }
  
  update(close: number): void {
    if (this.prevClose !== null) {
      const change = close - this.prevClose;
      
      if (change > 0) {
        this.gains.push(change);
        this.losses.push(0);
      } else {
        this.gains.push(0);
        this.losses.push(Math.abs(change));
      }
      
      if (this.gains.length > this.period) {
        this.gains.shift();
        this.losses.shift();
      }
    }
    
    this.prevClose = close;
  }
  
  getValue(): number {
    if (!this.isReady()) {
      throw new Error('Indicator not ready');
    }
    
    const avgGain = this.gains.reduce((a, b) => a + b, 0) / this.period;
    const avgLoss = this.losses.reduce((a, b) => a + b, 0) / this.period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  reset(): void {
    this.gains = [];
    this.losses = [];
    this.prevClose = null;
  }
}
```

#### 4.2.4 MACD

```typescript
interface MACDValue {
  macd: number;
  signal: number;
  histogram: number;
}

class MACD implements Indicator<MACDValue> {
  readonly name = 'MACD';
  private fastEMA: ExponentialMovingAverage;
  private slowEMA: ExponentialMovingAverage;
  private signalEMA: ExponentialMovingAverage;
  private macdValues: number[] = [];
  
  constructor(
    private fastPeriod: number = 12,
    private slowPeriod: number = 26,
    private signalPeriod: number = 9
  ) {
    this.fastEMA = new ExponentialMovingAverage(fastPeriod);
    this.slowEMA = new ExponentialMovingAverage(slowPeriod);
    this.signalEMA = new ExponentialMovingAverage(signalPeriod);
  }
  
  get period(): number {
    return this.slowPeriod;
  }
  
  isReady(): boolean {
    return this.signalEMA.isReady();
  }
  
  update(value: number): void {
    this.fastEMA.update(value);
    this.slowEMA.update(value);
    
    if (this.slowEMA.isReady()) {
      const macdValue = this.fastEMA.getValue() - this.slowEMA.getValue();
      this.macdValues.push(macdValue);
      this.signalEMA.update(macdValue);
    }
  }
  
  getValue(): MACDValue {
    if (!this.isReady()) {
      throw new Error('Indicator not ready');
    }
    
    const macd = this.macdValues[this.macdValues.length - 1];
    const signal = this.signalEMA.getValue();
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }
  
  reset(): void {
    this.fastEMA.reset();
    this.slowEMA.reset();
    this.signalEMA.reset();
    this.macdValues = [];
  }
}
```

#### 4.2.5 布林带（Bollinger Bands）

```typescript
interface BollingerBandsValue {
  upper: number;
  middle: number;
  lower: number;
}

class BollingerBands implements Indicator<BollingerBandsValue> {
  readonly name = 'BB';
  private sma: SimpleMovingAverage;
  private values: number[] = [];
  
  constructor(
    public readonly period: number = 20,
    private stdDevMultiplier: number = 2
  ) {
    this.sma = new SimpleMovingAverage(period);
  }
  
  isReady(): boolean {
    return this.values.length >= this.period;
  }
  
  update(value: number): void {
    this.values.push(value);
    this.sma.update(value);
    
    if (this.values.length > this.period) {
      this.values.shift();
    }
  }
  
  getValue(): BollingerBandsValue {
    if (!this.isReady()) {
      throw new Error('Indicator not ready');
    }
    
    const middle = this.sma.getValue();
    
    // 计算标准差
    const variance = this.values.reduce((sum, val) => {
      return sum + Math.pow(val - middle, 2);
    }, 0) / this.period;
    
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: middle + stdDev * this.stdDevMultiplier,
      middle: middle,
      lower: middle - stdDev * this.stdDevMultiplier
    };
  }
  
  reset(): void {
    this.sma.reset();
    this.values = [];
  }
}
```

### 4.3 指标管理器

```typescript
class IndicatorManager {
  private indicators = new Map<string, Map<string, Indicator>>();
  
  /**
   * 为股票添加指标
   */
  addIndicator(ticker: string, indicator: Indicator): void {
    if (!this.indicators.has(ticker)) {
      this.indicators.set(ticker, new Map());
    }
    
    const key = `${indicator.name}_${indicator.period}`;
    this.indicators.get(ticker)!.set(key, indicator);
  }
  
  /**
   * 更新指标值
   */
  update(ticker: string, price: number): void {
    const tickerIndicators = this.indicators.get(ticker);
    if (tickerIndicators) {
      for (const indicator of tickerIndicators.values()) {
        indicator.update(price);
      }
    }
  }
  
  /**
   * 获取指标值
   */
  getValue<T = number>(ticker: string, name: string, period: number): T | null {
    const key = `${name}_${period}`;
    const indicator = this.indicators.get(ticker)?.get(key);
    
    if (!indicator || !indicator.isReady()) {
      return null;
    }
    
    return indicator.getValue() as T;
  }
}
```

## 五、性能指标计算

### 5.1 核心性能指标

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
  informationRatio?: number;        // 信息比率
}
```

### 5.2 性能计算器

```typescript
class PerformanceCalculator {
  /**
   * 计算性能指标
   */
  calculate(
    equityCurve: TimeSeries[],
    trades: Trade[],
    benchmark?: TimeSeries[]
  ): PerformanceMetrics {
    const returns = this.calculateReturns(equityCurve);
    
    return {
      // 收益指标
      totalReturn: this.calculateTotalReturn(equityCurve),
      annualizedReturn: this.calculateAnnualizedReturn(equityCurve),
      dailyReturns: returns,
      
      // 风险指标
      volatility: this.calculateVolatility(returns),
      maxDrawdown: this.calculateMaxDrawdown(equityCurve).maxDrawdown,
      maxDrawdownDuration: this.calculateMaxDrawdown(equityCurve).duration,
      
      // 风险调整收益
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns),
      calmarRatio: this.calculateCalmarRatio(equityCurve),
      
      // 交易指标
      ...this.calculateTradeMetrics(trades),
      
      // 基准对比（如果提供）
      ...(benchmark ? this.calculateBenchmarkMetrics(equityCurve, benchmark) : {})
    };
  }
  
  private calculateReturns(equityCurve: TimeSeries[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < equityCurve.length; i++) {
      const prevValue = equityCurve[i - 1].value;
      const currentValue = equityCurve[i].value;
      returns.push((currentValue - prevValue) / prevValue);
    }
    
    return returns;
  }
  
  private calculateTotalReturn(equityCurve: TimeSeries[]): number {
    const initial = equityCurve[0].value;
    const final = equityCurve[equityCurve.length - 1].value;
    return (final - initial) / initial;
  }
  
  private calculateAnnualizedReturn(equityCurve: TimeSeries[]): number {
    const totalReturn = this.calculateTotalReturn(equityCurve);
    const days = equityCurve.length;
    const years = days / 252;  // 假设252个交易日
    
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  }
  
  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const dailyVol = Math.sqrt(variance);
    
    // 年化波动率
    return dailyVol * Math.sqrt(252);
  }
  
  private calculateMaxDrawdown(equityCurve: TimeSeries[]): {
    maxDrawdown: number;
    duration: number;
  } {
    let maxDrawdown = 0;
    let peak = equityCurve[0].value;
    let maxDuration = 0;
    let currentDuration = 0;
    
    for (let i = 1; i < equityCurve.length; i++) {
      const value = equityCurve[i].value;
      
      if (value > peak) {
        peak = value;
        currentDuration = 0;
      } else {
        currentDuration++;
        const drawdown = (peak - value) / peak;
        
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDuration = currentDuration;
        }
      }
    }
    
    return { maxDrawdown, duration: maxDuration };
  }
  
  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const annualizedReturn = avgReturn * 252;
    const volatility = this.calculateVolatility(returns);
    
    return (annualizedReturn - riskFreeRate) / volatility;
  }
  
  private calculateSortinoRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const annualizedReturn = avgReturn * 252;
    
    // 只考虑下行波动
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVariance = downsideReturns.reduce((sum, r) => sum + r * r, 0) / returns.length;
    const downsideVol = Math.sqrt(downsideVariance) * Math.sqrt(252);
    
    return (annualizedReturn - riskFreeRate) / downsideVol;
  }
  
  private calculateCalmarRatio(equityCurve: TimeSeries[]): number {
    const annualizedReturn = this.calculateAnnualizedReturn(equityCurve);
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve).maxDrawdown;
    
    return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  }
  
  private calculateTradeMetrics(trades: Trade[]): Partial<PerformanceMetrics> {
    const profitableTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const totalWin = profitableTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    
    return {
      totalTrades: trades.length,
      winningTrades: profitableTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? profitableTrades.length / trades.length : 0,
      avgWin: profitableTrades.length > 0 ? totalWin / profitableTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
      profitFactor: totalLoss > 0 ? totalWin / totalLoss : 0
    };
  }
  
  private calculateBenchmarkMetrics(
    portfolioEquity: TimeSeries[],
    benchmarkEquity: TimeSeries[]
  ): Partial<PerformanceMetrics> {
    const portfolioReturns = this.calculateReturns(portfolioEquity);
    const benchmarkReturns = this.calculateReturns(benchmarkEquity);
    
    // 计算 Beta
    const covariance = this.calculateCovariance(portfolioReturns, benchmarkReturns);
    const benchmarkVariance = this.calculateVariance(benchmarkReturns);
    const beta = covariance / benchmarkVariance;
    
    // 计算 Alpha
    const portfolioReturn = this.calculateAnnualizedReturn(portfolioEquity);
    const benchmarkReturn = this.calculateAnnualizedReturn(benchmarkEquity);
    const riskFreeRate = 0.02;
    const alpha = portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
    
    return { alpha, beta };
  }
  
  private calculateCovariance(returns1: number[], returns2: number[]): number {
    const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
    const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;
    
    let sum = 0;
    for (let i = 0; i < returns1.length; i++) {
      sum += (returns1[i] - mean1) * (returns2[i] - mean2);
    }
    
    return sum / returns1.length;
  }
  
  private calculateVariance(returns: number[]): number {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    return returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  }
}
```

## 六、实施路线图（调整后）

### Phase 1: 核心基础设施（3-4周）

#### Week 1-2: 模块化架构与接口定义
- [ ] 定义所有核心接口（ISignalProvider, IPortfolioBuilder等）
- [ ] 实现信号提供模块（读取 quant-metrics-*.json）
- [ ] 实现价格数据提供模块（Yahoo Finance集成）
- [ ] 数据库设计与迁移（7个核心表）
- [ ] 基础 API 框架搭建

#### Week 3: 回测引擎核心
- [ ] 实现回测引擎主循环
- [ ] 实现仓位构建模块
- [ ] 实现订单生成逻辑
- [ ] 实现交易成本模拟（佣金+滑点）

#### Week 4: 性能计算与前端集成
- [ ] 实现性能指标计算器
- [ ] 前端：回测配置页面
- [ ] 前端：回测结果展示页面
- [ ] 前端：资产曲线图表
- [ ] API：回测执行和结果查询接口

**测试目标：** 能够运行单一算法的完整回测，查看结果和图表

### Phase 2: 技术指标与多算法对比（2-3周）

#### Week 1: 技术指标库
- [ ] 实现5个核心指标（SMA, EMA, RSI, MACD, BB）
- [ ] 实现指标管理器
- [ ] 在回测中集成指标计算
- [ ] 前端：指标值展示

#### Week 2-3: 多算法对比
- [ ] 支持多算法并行回测
- [ ] 算法策略对比页面
- [ ] 相关性分析
- [ ] 性能对比图表（多条资产曲线叠加）

**测试目标：** 能够对比多个算法的回测表现

### Phase 3: 风险管理与用户系统（2周）

#### Week 1: 风险管理
- [ ] 实现风险管理模块
- [ ] 实现仓位限制检查
- [ ] 实现止损/止盈功能（可选）

#### Week 2: 用户系统基础
- [ ] 用户注册/登录（复用现有 users 表）
- [ ] 用户偏好设置
- [ ] 数据权限隔离

### Phase 4: 高级功能（持续迭代）

- [ ] 实时虚拟交易（非回测）
- [ ] 更多技术指标
- [ ] 自定义策略参数
- [ ] 策略参数优化工具
- [ ] 移动端支持
- [ ] 报告生成与导出
- [ ] 社区功能（策略分享）

## 七、关键技术决策

### 7.1 为什么采用模块化设计？

1. **降低复杂度**：每个模块职责单一，易于理解和维护
2. **提高复用性**：模块可在不同场景复用（回测、实时交易）
3. **便于测试**：每个模块可独立单元测试
4. **支持扩展**：新增功能只需实现对应接口
5. **减少代码量**：避免重复代码，提高开发效率

### 7.2 为什么先实现回测？

1. **用户核心需求**：评估算法表现是首要需求
2. **技术基础**：回测引擎包含大部分核心逻辑
3. **数据准备**：历史信号数据已经存在（quant-metrics-*.json）
4. **快速验证**：可以立即看到算法效果
5. **为实盘铺路**：回测引擎的很多模块可用于实盘

### 7.3 为什么使用 TypeScript？

1. **与现有项目一致**：stock_kanban 使用 TypeScript
2. **类型安全**：金融计算需要类型安全
3. **易于重构**：强类型支持大规模重构
4. **IDE支持好**：开发效率高
5. **生态丰富**：Node.js 生态完善

## 八、预期成果

### Phase 1 完成后
- ✅ 可运行单一算法的完整回测
- ✅ 查看资产曲线和基础性能指标
- ✅ 真实的交易成本模拟
- ✅ 基础的前端展示界面

### Phase 2 完成后
- ✅ 5个常用技术指标可用
- ✅ 多个算法的并行对比
- ✅ 完整的性能指标体系
- ✅ 专业的可视化图表

### Phase 3 完成后
- ✅ 基础的风险控制
- ✅ 多用户支持
- ✅ 数据隔离和权限管理

### 最终目标
一个功能完整、性能可靠、易于使用的虚拟交易系统，能够：
- 回测多种量化算法
- 精确模拟真实交易成本
- 提供丰富的性能分析
- 支持多用户和多策略对比

---

**文档版本：** v1.0  
**最后更新：** 2026-02-06  
**状态：** 待审核
