# 铏氭嫙浜ゆ槗绯荤粺瀹屾暣璁捐鏂规

> 鏈枃妗ｆ暣鍚堜簡鏁翠綋鏋舵瀯璁捐銆佽缁嗗疄鏂借鍒掑拰鎶€鏈鑼?

## 鏂囨。璇存槑

鏈枃妗ｅ皢鍘熸湁鐨?DESIGN.md 鍜?IMPLEMENTATION_PLAN.md 鏁村悎涓虹粺涓€鐨勫畬鏁磋璁℃柟妗堬紝閬垮厤鍐呭閲嶅锛屼究浜庣悊瑙ｅ拰瀹炴柦銆?

**鎺ㄨ崘闃呰椤哄簭锛?*
1. 绗竴閮ㄥ垎锛氭暣浣撴灦鏋勪笌鎴樼暐瑙勫垝
2. 绗簩閮ㄥ垎锛氬洖娴嬫ā鍧楄缁嗚璁★紙Phase 1 鏍稿績鍔熻兘锛?
3. 绗笁閮ㄥ垎锛氭暟鎹ā鍨嬩笌瀛樺偍鏂规
4. 绗洓閮ㄥ垎锛氬墠绔泦鎴愪笌鐢ㄦ埛浣撻獙
5. 闄勫綍锛氬弬鑰冭祫鏂欎笌瀹炴柦璺嚎鍥?

---

# 绗竴閮ㄥ垎锛氭暣浣撴灦鏋勪笌鎴樼暐瑙勫垝

## 1. 椤圭洰瀹氫綅涓庢灦鏋?

### 1.1 鎺ㄨ崘鏂规锛氫笁灞傚垎绂绘灦鏋?

**寤鸿锛氬垱寤虹嫭绔嬬殑 `stock_trading_sim` 鍚庣鏈嶅姟**

```
stock_kanban (鍓嶇)  鈫愨啋  stock_trading_sim (浜ゆ槗鍚庣-鏂?  鈫愨啋  stock_quant_work (閲忓寲寮曟搸)
    灞曠ず鏁版嵁              铏氭嫙浜ゆ槗/鍥炴祴/缁撶畻/绛栫暐                    鐢熸垚淇″彿
```

#### 鑱岃矗鍒掑垎

1. **stock_kanban** (鐜版湁椤圭洰)
   - 鍓嶇灞曠ず銆佺湅鏉跨鐞嗐€佸疄鏃惰鎯呮煡鐪?
   - 宸插疄鐜板熀纭€鎶€鏈寚鏍囪绠楋紙RSI, MACD, SMA, EMA, Bollinger Bands锛?
   - 灞曠ず閲忓寲淇″彿鍜屼氦鏄撶粨鏋?

2. **stock_quant_work** (鐜版湁椤圭洰)
   - 閲忓寲鍒嗘瀽銆佺瓥鐣ヨ绠椼€佷俊鍙风敓鎴?
   - 杈撳嚭 JSON 鏍煎紡鐨勪俊鍙锋暟鎹紙quant-metrics-*.json锛?
   - 鎻愪緵澶氱绠楁硶锛圓lgorithm A/B/C...锛?

3. **stock_trading_sim** (鏂板缓椤圭洰)
   - **鏍稿績鍔熻兘锛氬洖娴嬪紩鎿?*锛圥hase 1 閲嶇偣锛?
   - 铏氭嫙浜ゆ槗鎵ц涓庣鐞?
   - 璧勯噾绠＄悊銆佹敹鐩婅绠椼€佸巻鍙茶褰?
   - 鎬ц兘鎸囨爣鍒嗘瀽

### 1.2 鐜版湁绯荤粺鍒嗘瀽

#### 宸插疄鐜扮殑鎶€鏈寚鏍囷紙stock_kanban锛?

鍦?`server/stockService.ts` 涓凡瀹炵幇浠ヤ笅鎸囨爣璁＄畻锛?

```typescript
// 宸插疄鐜扮殑鎸囨爣鍑芥暟
- calculateRSI(prices, period=14): RSI 鎸囨爣
- calculateSMA(prices, period): 绠€鍗曠Щ鍔ㄥ钩鍧?
- calculateEMA(prices, period): 鎸囨暟绉诲姩骞冲潎
- calculateMACD(prices): MACD 鎸囨爣锛堝惈淇″彿绾匡級
- calculateBollingerBands(prices, period=20): 甯冩灄甯?
```

**缁撹锛?* 鏂扮郴缁熷彲浠ュ鐢ㄨ繖浜涚幇鏈夊疄鐜帮紝鏃犻渶閲嶅寮€鍙戝熀纭€鎸囨爣銆?

### 1.3 妯″潡鍖栨灦鏋勮璁★紙鍊熼壌 QuantConnect Alpha Framework锛?

灏嗙郴缁熷垎瑙ｄ负5涓嫭绔嬨€佸彲澶嶇敤鐨勬ā鍧楋細

```typescript
// 鏍稿績妯″潡鎺ュ彛
interface TradingSystem {
  signalProvider: ISignalProvider;      // 淇″彿璇诲彇
  portfolioBuilder: IPortfolioBuilder;  // 浠撲綅鏋勫缓
  executionEngine: IExecutionEngine;     // 鎵ц寮曟搸
  riskManager: IRiskManager;             // 椋庨櫓绠＄悊
  backtestEngine: IBacktestEngine;       // 鍥炴祴寮曟搸锛圥hase 1 鏍稿績锛?
}
```

**妯″潡鍖栦紭鍔匡細**
- 鍑忓皯浠ｇ爜閲嶅锛屾彁楂樺鐢ㄦ€?
- 姣忎釜妯″潡鐙珛寮€鍙戝拰娴嬭瘯
- 渚夸簬缁存姢鍜屾墿灞?
- 鏀寔骞惰寮€鍙?

---

# 绗簩閮ㄥ垎锛氬洖娴嬫ā鍧楄缁嗚璁★紙Phase 1 鏍稿績锛?

## 2. 鍥炴祴寮曟搸瀹屾暣璁捐

### 2.1 涓轰粈涔堝厛鍋氬洖娴嬶紵

1. **鐢ㄦ埛鏍稿績闇€姹?*锛氳瘎浼扮畻娉曡〃鐜版槸棣栬闇€姹?
2. **鎶€鏈熀纭€**锛氬洖娴嬪紩鎿庡寘鍚ぇ閮ㄥ垎鏍稿績浜ゆ槗閫昏緫
3. **鏁版嵁鍑嗗**锛氬巻鍙蹭俊鍙锋暟鎹凡缁忓瓨鍦?
4. **蹇€熼獙璇?*锛氬彲浠ョ珛鍗崇湅鍒扮畻娉曟晥鏋?
5. **涓哄疄鐩橀摵璺?*锛氬洖娴嬪紩鎿庣殑妯″潡鍙敤浜庡疄鐩?

### 2.2 鍥炴祴娴佺▼

```
鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?
鈹?                     鍥炴祴寮曟搸娴佺▼                            鈹?
鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?

1. 鍒濆鍖?
   鈹溾攢鈹€ 鍔犺浇鍘嗗彶淇″彿鏁版嵁锛堜粠 quant-metrics-*.json锛?
   鈹溾攢鈹€ 鍔犺浇鍘嗗彶浠锋牸鏁版嵁锛堜粠 Yahoo Finance锛?
   鈹溾攢鈹€ 璁剧疆鍒濆璧勯噾鍜屽弬鏁?
   鈹斺攢鈹€ 鍒濆鍖栧悇涓ā鍧?

2. 鏃堕棿寰幆锛堥€愭棩鍥炴祴锛?
   For each trading day:
   鈹溾攢鈹€ a. 鑾峰彇褰撴棩淇″彿
   鈹?  鈹斺攢鈹€ signalProvider.getSignals(algorithm, date)
   鈹?
   鈹溾攢鈹€ b. 鏋勫缓鐩爣浠撲綅
   鈹?  鈹斺攢鈹€ portfolioBuilder.buildTargetPositions(signals, portfolio, params)
   鈹?
   鈹溾攢鈹€ c. 鐢熸垚璁㈠崟
   鈹?  鈹斺攢鈹€ 璁＄畻闇€瑕佽皟鏁寸殑浠撲綅锛堜拱鍏?鍗栧嚭锛?
   鈹?
   鈹溾攢鈹€ d. 椋庨櫓妫€鏌ワ紙鍙€夛級
   鈹?  鈹斺攢鈹€ riskManager.checkOrder(order, portfolio)
   鈹?
   鈹溾攢鈹€ e. 鎵ц璁㈠崟
   鈹?  鈹斺攢鈹€ executionEngine.execute(orders, executionParams)
   鈹?  鈹斺攢鈹€ 搴旂敤浣ｉ噾鍜屾粦鐐?
   鈹?
   鈹溾攢鈹€ f. 鏇存柊鎸佷粨
   鈹?  鈹斺攢鈹€ portfolio.updatePositions(fills)
   鈹?
   鈹溾攢鈹€ g. 鑾峰彇鏀剁洏浠?
   鈹?  鈹斺攢鈹€ 鏇存柊鎸佷粨甯傚€?
   鈹?
   鈹斺攢鈹€ h. 璁板綍姣忔棩鏁版嵁
       鈹斺攢鈹€ 淇濆瓨褰撴棩璧勪骇銆佹寔浠撱€佷氦鏄撶瓑

3. 缁撴灉鍒嗘瀽
   鈹溾攢鈹€ 璁＄畻鎬ц兘鎸囨爣
   鈹溾攢鈹€ 鐢熸垚璧勪骇鏇茬嚎
   鈹溾攢鈹€ 璁＄畻鏈€澶у洖鎾?
   鈹斺攢鈹€ 杈撳嚭鍥炴祴鎶ュ憡
```

### 2.3 鏍稿績妯″潡鎺ュ彛瀹氫箟

#### 2.3.1 淇″彿鎻愪緵妯″潡

```typescript
interface ISignalProvider {
  /**
   * 鑾峰彇鎸囧畾绠楁硶鐨勪氦鏄撲俊鍙?
   * @param algorithm - 绠楁硶鏍囪瘑锛坅lgorithm-a, algorithm-b, etc.锛?
   * @param date - 鏃ユ湡
   * @returns 淇″彿鍒楄〃
   */
  getSignals(algorithm: string, date: Date): Promise<Signal[]>;
  
  /**
   * 鑾峰彇鍙敤鐨勭畻娉曞垪琛?
   */
  getAvailableAlgorithms(): Promise<string[]>;
}

interface Signal {
  ticker: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  algorithm: string;
  confidence?: number;      // 淇″彿寮哄害 0-1
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

#### 2.3.2 鍥炴祴寮曟搸鎺ュ彛

```typescript
interface IBacktestEngine {
  /**
   * 杩愯鍥炴祴
   * @param config - 鍥炴祴閰嶇疆
   * @returns 鍥炴祴缁撴灉
   */
  run(config: BacktestConfig): Promise<BacktestResult>;
}

interface BacktestConfig {
  algorithm: string;              // 绠楁硶鏍囪瘑
  startDate: Date;
  endDate: Date;
  initialCash: number;
  
  // 绛栫暐鍙傛暟
  positionParams: {
    maxPositionPerStock: number;    // 鍗曡偂鏈€澶т粨浣嶆瘮渚?
    maxTotalPositions: number;       // 鏈€澶ф寔浠撴暟閲?
    minCashReserve: number;          // 鏈€灏忕幇閲戝偍澶囨瘮渚?
  };
  
  // 浜ゆ槗鎴愭湰
  executionParams: {
    commission: CommissionModel;
    slippage: SlippageModel;
  };
  
  // 鍥炴祴閫夐」
  options: {
    benchmark?: string;           // 鍩哄噯鎸囨暟锛堝 SPY锛?
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

### 2.4 浜ゆ槗鎴愭湰妯℃嫙锛堝€熼壌 Zipline锛?

#### 浣ｉ噾妯″瀷

```typescript
interface CommissionModel {
  calculate(trade: Trade): number;
}

// 鎸夎偂鏀惰垂妯″瀷
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

// 鎸変氦鏄撻噾棰濈櫨鍒嗘瘮鏀惰垂
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

#### 婊戠偣妯″瀷

```typescript
interface SlippageModel {
  calculateFillPrice(order: Order, marketData: MarketData): number;
}

// 鍥哄畾婊戠偣妯″瀷
class FixedSlippage implements SlippageModel {
  constructor(private slippageBps: number = 5) {}  // 5涓熀鐐?
  
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

// 鍩轰簬鎴愪氦閲忕殑婊戠偣妯″瀷
class VolumeShareSlippage implements SlippageModel {
  constructor(
    private volumeLimit: number = 0.025,    // 鏈€澶氬崰褰撴棩鎴愪氦閲忕殑2.5%
    private priceImpact: number = 0.1       // 浠锋牸褰卞搷绯绘暟
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

### 2.5 鎬ц兘鎸囨爣璁＄畻

```typescript
interface PerformanceMetrics {
  // 鏀剁泭鎸囨爣
  totalReturn: number;              // 鎬绘敹鐩婄巼
  annualizedReturn: number;         // 骞村寲鏀剁泭鐜?
  dailyReturns: number[];           // 姣忔棩鏀剁泭搴忓垪
  
  // 椋庨櫓鎸囨爣
  volatility: number;               // 娉㈠姩鐜囷紙骞村寲锛?
  maxDrawdown: number;              // 鏈€澶у洖鎾?
  maxDrawdownDuration: number;      // 鏈€澶у洖鎾ゆ寔缁ぉ鏁?
  
  // 椋庨櫓璋冩暣鏀剁泭鎸囨爣
  sharpeRatio: number;              // 澶忔櫘姣旂巼
  sortinoRatio: number;             // 绱㈡彁璇烘瘮鐜?
  calmarRatio: number;              // 鍗″皵鐜涙瘮鐜?
  
  // 浜ゆ槗鎸囨爣
  totalTrades: number;              // 鎬讳氦鏄撴鏁?
  winningTrades: number;            // 鐩堝埄浜ゆ槗娆℃暟
  losingTrades: number;             // 浜忔崯浜ゆ槗娆℃暟
  winRate: number;                  // 鑳滅巼
  avgWin: number;                   // 骞冲潎鐩堝埄
  avgLoss: number;                  // 骞冲潎浜忔崯
  profitFactor: number;             // 鐩堜簭姣?
  
  // 鍩哄噯瀵规瘮
  alpha?: number;                   // Alpha
  beta?: number;                    // Beta
}
```

---

# 绗笁閮ㄥ垎锛氭暟鎹ā鍨嬩笌瀛樺偍鏂规

## 3. 鏁版嵁搴撹璁★紙缁熶竴绠＄悊锛?

鎵€鏈夋暟鎹瓨鍌ㄥ湪 PostgreSQL 涓紝涓庣幇鏈?stock_kanban 鐨?users 琛ㄥ叡鐢ㄥ悓涓€鏁版嵁搴撱€?

### 3.1 鏍稿績琛ㄧ粨鏋?

```sql
-- 绛栫暐瀹氫箟琛?
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

-- 鎶曡祫缁勫悎琛紙鏀寔鍥炴祴鍜屽疄鏃讹級
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID REFERENCES strategies(id),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,      -- 'backtest' 鎴?'live'
    initial_cash DECIMAL(15, 2) NOT NULL,
    current_cash DECIMAL(15, 2) NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    
    -- 鍥炴祴涓撶敤瀛楁
    backtest_start_date DATE,
    backtest_end_date DATE,
    backtest_status VARCHAR(20),    -- 'running', 'completed', 'failed'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 鎸佷粨琛?
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

-- 浜ゆ槗璁板綍琛?
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
    signal_source VARCHAR(50),  -- 瑙﹀彂淇″彿鏉ユ簮
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 姣忔棩缁撶畻琛紙鍥炴祴鍜屽疄鏃堕兘鐢級
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

-- 绛栫暐鎬ц兘琛紙姹囨€荤粺璁★級
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

-- 绱㈠紩
CREATE INDEX idx_trades_portfolio_date ON trades(portfolio_id, executed_at);
CREATE INDEX idx_settlements_portfolio_date ON daily_settlements(portfolio_id, settlement_date);
CREATE INDEX idx_holdings_portfolio ON holdings(portfolio_id);
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
CREATE INDEX idx_portfolios_type ON portfolios(type);
```

### 3.2 鏁版嵁涓€鑷存€ц璁?

**鍘熷垯锛?* 鎵€鏈夎櫄鎷熶氦鏄撶浉鍏崇殑鏁版嵁缁熶竴鍦?stock_trading_sim 鐨勬暟鎹簱涓鐞嗭紝閬垮厤鍒嗘暎銆?

- 淇″彿鏁版嵁锛氱户缁娇鐢?JSON 鏂囦欢锛堢敱 stock_quant_work 鐢熸垚锛?
- 浠锋牸鏁版嵁锛氶€氳繃 API 鑾峰彇锛圷ahoo Finance锛夛紝鍥炴祴鏃跺彲缂撳瓨
- 浜ゆ槗鏁版嵁锛氬瓨鍌ㄥ湪 PostgreSQL 鐨?trades 琛?
- 鎬ц兘鏁版嵁锛氬瓨鍌ㄥ湪 daily_settlements 鍜?strategy_performance 琛?

---

# 绗洓閮ㄥ垎锛氬墠绔泦鎴愪笌鐢ㄦ埛浣撻獙

## 4. 鍓嶇灞曠ず瑙勫垝

### 4.1 鏂板椤甸潰

#### 1. 鍥炴祴涓績锛?backtest锛?

**鍔熻兘锛?*
- 閰嶇疆鍥炴祴鍙傛暟锛堢畻娉曘€佹椂闂磋寖鍥淬€佸垵濮嬭祫閲戯級
- 鍚姩鍥炴祴浠诲姟
- 鏌ョ湅鍥炴祴杩涘害
- 灞曠ず鍥炴祴缁撴灉

**缁勪欢锛?*
- BacktestConfig锛堝洖娴嬮厤缃級
- BacktestRunner锛堝洖娴嬫墽琛屽櫒锛?
- BacktestResults锛堢粨鏋滃睍绀猴級

#### 2. 鍥炴祴缁撴灉椤碉紙/backtest/:id/results锛?

**鍔熻兘锛?*
- 璧勪骇鏇茬嚎鍥?
- 鎬ц兘鎸囨爣鍗＄墖
- 浜ゆ槗鍘嗗彶琛ㄦ牸
- 鍥炴挙鏇茬嚎鍥?
- 涓庡熀鍑嗗姣?

**缁勪欢锛?*
- EquityCurveChart锛堣祫浜ф洸绾垮浘锛?
- PerformanceMetrics锛堟€ц兘鎸囨爣鍗＄墖锛?
- TradeHistory锛堜氦鏄撳巻鍙诧級
- DrawdownChart锛堝洖鎾ゅ浘琛級
- BenchmarkComparison锛堝熀鍑嗗姣旓級

#### 3. 绠楁硶瀵规瘮椤碉紙/compare锛?

**鍔熻兘锛?*
- 閫夋嫨澶氫釜绠楁硶杩涜鍥炴祴瀵规瘮
- 骞舵帓灞曠ず鎬ц兘鎸囨爣
- 澶氭潯璧勪骇鏇茬嚎鍙犲姞
- 鐩稿叧鎬у垎鏋?

**缁勪欢锛?*
- AlgorithmSelector锛堢畻娉曢€夋嫨鍣級
- ComparisonTable锛堝姣旇〃鏍硷級
- MultiLineChart锛堝绾垮浘琛級
- CorrelationMatrix锛堢浉鍏虫€х煩闃碉級

### 4.2 鐜版湁鎸囨爣灞曠ず

褰撳墠 stock_kanban 鍓嶇宸茬粡灞曠ず浠ヤ笅鎶€鏈寚鏍囷細
- RSI (14)
- MACD
- Bollinger Bands
- SMA (20)

**寤鸿锛?* 鍥炴祴缁撴灉椤甸潰鍙互澶嶇敤杩欎簺鎸囨爣鐨勫睍绀虹粍浠躲€?

### 4.3 鍙鍖栧姛鑳斤紙鍊熼壌 Backtrader锛?

鍙傝€?Backtrader 鐨勫彲瑙嗗寲鍔熻兘锛屾彁渚涳細

- **浠锋牸璧板娍涓庢寚鏍囧彔鍔?*锛氬湪浠锋牸鍥句笂鍙犲姞 SMA銆丅ollinger Bands
- **涔板崠淇″彿鏍囪**锛氬湪鍥捐〃涓婃爣璁颁氦鏄撶偣浣?
- **鎴愪氦閲忔煴鐘跺浘**锛氬湪浠锋牸鍥句笅鏂瑰睍绀烘垚浜ら噺
- **瀛愬浘灞曠ず**锛歊SI銆丮ACD 浣滀负瀛愬浘灞曠ず

浣跨敤 Recharts 搴撳疄鐜版墍鏈夊浘琛ㄣ€?

---

# 绗簲閮ㄥ垎锛氬疄鏂借矾绾垮浘

## 5. 鍒嗛樁娈靛疄鏂借鍒?
> 杩涘害鍥炲～瑙勫垯锛氭瘡娆″畬鎴愪竴涓鍒掗」锛屽繀椤诲湪鏈妭鎵撳嬀纭锛屽苟鍦ㄥ搴?`docs/*REPORT.md` 璁板綍瀹屾垚鏃ユ湡涓庨獙璇佺粨鏋溿€? 
> 鏈€杩戝洖濉細2026-02-08

### Phase 1: 鍥炴祴鏍稿績鍔熻兘锛?-4鍛級猸?**浼樺厛瀹炴柦**

#### Week 1-2: 鍥炴祴寮曟搸鍩虹
- [ ] 鍒涘缓 stock_trading_sim 椤圭洰
- [x] 鏁版嵁搴撹璁′笌杩佺Щ锛?涓牳蹇冭〃锛?- [x] 瀹炵幇淇″彿鎻愪緵妯″潡锛堣鍙?quant-metrics-*.json锛?- [x] 瀹炵幇浠锋牸鏁版嵁鎻愪緵妯″潡锛圷ahoo Finance闆嗘垚锛?- [x] 鍩虹 API 妗嗘灦鎼缓

#### Week 3: 鍥炴祴寮曟搸鏍稿績閫昏緫
- [x] 瀹炵幇鍥炴祴寮曟搸涓诲惊鐜?- [x] 瀹炵幇浠撲綅鏋勫缓妯″潡
- [x] 瀹炵幇璁㈠崟鐢熸垚閫昏緫
- [x] 瀹炵幇浜ゆ槗鎴愭湰妯℃嫙锛堜剑閲?婊戠偣锛?
#### Week 4: 鍓嶇闆嗘垚涓庢祴璇?- [x] 瀹炵幇鎬ц兘鎸囨爣璁＄畻鍣?- [x] 鍓嶇锛氬洖娴嬮厤缃〉闈?- [x] 鍓嶇锛氬洖娴嬬粨鏋滃睍绀洪〉闈?- [x] 鍓嶇锛氳祫浜ф洸绾垮浘琛紙浣跨敤 Recharts锛?- [x] API锛氬洖娴嬫墽琛屽拰缁撴灉鏌ヨ鎺ュ彛

**娴嬭瘯鐩爣锛?* 鑳藉杩愯鍗曚竴绠楁硶鐨勫畬鏁村洖娴嬶紝鏌ョ湅璧勪骇鏇茬嚎鍜屾€ц兘鎸囨爣

### Phase 2: 澶氱畻娉曞姣斾笌浼樺寲锛?-3鍛級

#### Week 1: 澶氱畻娉曟敮鎸?- [x] 鏀寔澶氱畻娉曞苟琛屽洖娴?- [x] 绠楁硶绛栫暐瀵规瘮椤甸潰
- [x] 鐩稿叧鎬у垎鏋?- [x] 鎬ц兘瀵规瘮鍥捐〃锛堝鏉¤祫浜ф洸绾垮彔鍔狅級

#### Week 2-3: 浼樺寲涓庡寮?- [x] 鍥炴祴鎬ц兘浼樺寲锛堢紦瀛樸€佸苟琛岃绠楋級
- [x] 鏇村鍥捐〃绫诲瀷锛堝洖鎾ゆ洸绾裤€佹湀搴︽敹鐩婄儹鍔涘浘锛?- [x] 瀵煎嚭鍔熻兘锛圕SV銆丳DF鎶ュ憡锛?
**娴嬭瘯鐩爣锛?* 鑳藉瀵规瘮澶氫釜绠楁硶鐨勫洖娴嬭〃鐜?

### Phase 3: 瀹炴椂铏氭嫙浜ゆ槗涓庣敤鎴风郴缁燂紙2-3鍛級

#### Week 1: 瀹炴椂浜ゆ槗鍩虹
- [x] 瀹炴椂铏氭嫙浜ゆ槗鍔熻兘锛堥潪鍥炴祴锛?
- [x] 姣忔棩鑷姩缁撶畻瀹氭椂浠诲姟
- [x] 瀹炴椂鎸佷粨鍜屾敹鐩婂睍绀?

#### Week 2: 鐢ㄦ埛绯荤粺
- [ ] 鐢ㄦ埛娉ㄥ唽/鐧诲綍锛堝鐢ㄧ幇鏈?users 琛級
- [ ] 鐢ㄦ埛鍋忓ソ璁剧疆
- [x] 鏁版嵁鏉冮檺闅旂
- [ ] 鎶曡祫缁勫悎绠＄悊

#### Week 3: 椋庨櫓绠＄悊
- [ ] 瀹炵幇椋庨櫓绠＄悊妯″潡
- [ ] 瀹炵幇浠撲綅闄愬埗妫€鏌?
- [ ] 姝㈡崯/姝㈢泩鍔熻兘锛堝彲閫夛級

### Phase 4: 楂樼骇鍔熻兘锛堟寔缁凯浠ｏ級

- [ ] 鎶€鏈寚鏍囨墿灞曪紙鏇村鎸囨爣锛?
- [ ] 鑷畾涔夌瓥鐣ュ弬鏁?
- [ ] 绛栫暐鍙傛暟浼樺寲宸ュ叿锛堢綉鏍兼悳绱€侀仐浼犵畻娉曪級
- [ ] 绉诲姩绔€傞厤
- [ ] 绀惧尯鍔熻兘锛堢瓥鐣ュ垎浜級
- [ ] 瀹炵洏浜ゆ槗鎺ュ彛锛堥暱鏈熻鍒掞級

---

# 绗叚閮ㄥ垎锛氭妧鏈寚鏍囨暣鍚堟柟妗?

## 6. 鎸囨爣缁熶竴绠＄悊

### 6.1 鐜版湁鎸囨爣锛坰tock_kanban锛?

鍦?`server/stockService.ts` 涓凡瀹炵幇锛?

```typescript
// 鐜版湁瀹炵幇浣嶇疆锛歴erver/stockService.ts
calculateRSI(prices: number[], period: number = 14): number
calculateSMA(prices: number[], period: number): number
calculateEMA(prices: number[], period: number): number[]
calculateMACD(prices: number[]): { macd: number; signal: number }
calculateBollingerBands(prices: number[], period: number = 20): { upper: number; lower: number }
```

### 6.2 鎸囨爣澶嶇敤绛栫暐

**鏂规锛?* 灏?stock_kanban 鐨勬寚鏍囪绠楀嚱鏁版彁鍙栦负鐙珛鐨勫叡浜簱

```typescript
// 鏂板缓 shared/indicators.ts
export class TechnicalIndicators {
  static calculateRSI(prices: number[], period: number = 14): number {
    // 澶嶅埗 stock_kanban 鐨勫疄鐜?
  }
  
  static calculateSMA(prices: number[], period: number): number {
    // 澶嶅埗 stock_kanban 鐨勫疄鐜?
  }
  
  static calculateEMA(prices: number[], period: number): number[] {
    // 澶嶅埗 stock_kanban 鐨勫疄鐜?
  }
  
  static calculateMACD(prices: number[]): { macd: number; signal: number } {
    // 澶嶅埗 stock_kanban 鐨勫疄鐜?
  }
  
  static calculateBollingerBands(prices: number[], period: number = 20): { upper: number; lower: number } {
    // 澶嶅埗 stock_kanban 鐨勫疄鐜?
  }
}
```

**浣跨敤鍦烘櫙锛?*
- stock_kanban锛氬疄鏃惰绠楀苟灞曠ず
- stock_trading_sim锛氬洖娴嬩腑璁＄畻鍜岃褰?

### 6.3 鍙墿灞曟寚鏍囷紙浠?Backtrader 鍊熼壌锛?

鍙傝€?Backtrader 鐨勬寚鏍囧簱锛屽彲浠ユ墿灞曪細

- **瓒嬪娍鎸囨爣**锛欰DX銆丳arabolic SAR銆両chimoku
- **鍔ㄩ噺鎸囨爣**锛歋tochastic銆丆CI銆乄illiams %R
- **鎴愪氦閲忔寚鏍?*锛歄BV銆乂WAP銆丄ccumulation/Distribution
- **娉㈠姩鐜囨寚鏍?*锛欰TR銆並eltner Channels

**瀹炴柦寤鸿锛?* Phase 2 鎴?Phase 4 鏍规嵁闇€瑕侀€愭娣诲姞銆?

---

# 闄勫綍

## A. 鍙傝€冭祫鏂?

鏈」鐩璁″弬鑰冧簡浠ヤ笅涓変釜鎴愮啛鐨勯噺鍖栦氦鏄撴鏋躲€傛瘡涓鏋堕兘鏈夎缁嗙殑浠嬬粛鏂囨。锛?

1. **[Backtrader](./docs/REFERENCE_Backtrader.md)** - Python閲忓寲鍥炴祴妗嗘灦
   - 鏄撲簬瀛︿範鐨?Pythonic API
   - 涓板瘜鐨勬妧鏈寚鏍囧簱锛?00+锛?
   - 瀹屾暣鐨勪氦鏄撴ā鎷熷拰鎬ц兘鍒嗘瀽
   - 鍙鍖栧姛鑳藉己澶?

2. **[Zipline](./docs/REFERENCE_Zipline.md)** - 鏈烘瀯绾ython閲忓寲寮曟搸
   - 涓ユ牸鐨勬椂闂寸偣鏁版嵁绠＄悊锛圥oint-in-Time锛?
   - 寮哄ぇ鐨?Pipeline API 鐢ㄤ簬鍥犲瓙璁＄畻
   - 闃叉鍓嶈鍋忓樊鍜屽垢瀛樿€呭亸宸?
   - Quantopian 鐨勬牳蹇冩妧鏈?

3. **[QuantConnect LEAN](./docs/REFERENCE_QuantConnect.md)** - 浜戠閲忓寲浜ゆ槗骞冲彴
   - 澶氳祫浜х被鍒敮鎸侊紙鑲＄エ銆佹湡璐с€佹湡鏉冦€佸姹囥€佸姞瀵嗚揣甯侊級
   - 鍥炴祴涓庡疄鐩樼粺涓€鎺ュ彛
   - 妯″潡鍖栫殑 Alpha Framework
   - 鍒嗛挓绾у拰 Tick 绾ф暟鎹敮鎸?

## B. 鎶€鏈喅绛栬褰?

| 鍐崇瓥椤?| 閫夋嫨 | 鐞嗙敱 |
|--------|------|------|
| 椤圭洰瀹氫綅 | 鐙珛鍚庣鏈嶅姟 | 鑱岃矗鍒嗙锛屼究浜庢墿灞?|
| 浼樺厛鍔熻兘 | 鍥炴祴寮曟搸 | 鏍稿績闇€姹傦紝鎶€鏈熀纭€ |
| 鏁版嵁搴?| PostgreSQL | 涓庣幇鏈夋妧鏈爤涓€鑷?|
| ORM | Drizzle | 涓?stock_kanban 淇濇寔涓€鑷?|
| 璇█ | TypeScript | 绫诲瀷瀹夊叏锛屼笌鍓嶇鍏变韩绫诲瀷 |
| 鎸囨爣璁＄畻 | 澶嶇敤鐜版湁瀹炵幇 | 閬垮厤閲嶅寮€鍙?|
| 鏁版嵁绠＄悊 | 缁熶竴鏁版嵁搴?| 閬垮厤鏁版嵁鍒嗘暎 |

## C. 甯歌闂瑙ｇ瓟

**Q1: IMPLEMENTATION_PLAN.md 鐨勫唴瀹归兘淇濈暀鍚楋紵**
A: 鏄殑锛屾湰鏂囨。鏁村悎浜?IMPLEMENTATION_PLAN.md 鐨勬牳蹇冨唴瀹癸紝閬垮厤閲嶅銆傚師鏂囨。鍙互褰掓。鎴栧垹闄ゃ€?

**Q2: 鍥炴祴鍜屽疄鏃朵氦鏄撶敤鍚屼竴涓暟鎹簱鍚楋紵**
A: 鏄殑锛屼娇鐢ㄥ悓涓€涓暟鎹簱锛岄€氳繃 portfolios 琛ㄧ殑 `type` 瀛楁鍖哄垎锛?backtest' 鎴?'live'锛夈€?

**Q3: 鐜版湁鐨勬寚鏍囪绠楅渶瑕侀噸鍐欏悧锛?*
A: 涓嶉渶瑕併€俿tock_kanban 宸茬粡瀹炵幇浜嗘牳蹇冩寚鏍囷紝鍙互鎻愬彇涓哄叡浜簱澶嶇敤銆?

**Q4: Phase 1 瀹屾垚鍚庤兘鍋氫粈涔堬紵**
A: 鍙互閰嶇疆骞惰繍琛屽崟涓€绠楁硶鐨勫畬鏁村洖娴嬶紝鏌ョ湅璧勪骇鏇茬嚎鍜屾€ц兘鎸囨爣锛堝鏅瘮鐜囥€佹渶澶у洖鎾ょ瓑锛夈€?

**Q5: 鍓嶇闇€瑕佸ぇ鏀瑰悧锛?*
A: 涓嶉渶瑕佸ぇ鏀广€傛柊澧炲嚑涓〉闈紙鍥炴祴閰嶇疆銆佺粨鏋滃睍绀猴級锛屽彲浠ュ鐢ㄧ幇鏈夌殑鍥捐〃缁勪欢銆?

---

**鏂囨。鐗堟湰锛?* v2.0锛堟暣鍚堢増锛? 
**鏈€鍚庢洿鏂帮細** 2026-02-06  
**鐘舵€侊細** 寰呭鏍?
