# 技术指标现状分析与复用方案

## 1. 现有指标实现（stock_kanban）

### 1.1 已实现的指标

在 `server/stockService.ts` 中已经实现以下技术指标：

| 指标 | 函数签名 | 说明 |
|------|---------|------|
| RSI | `calculateRSI(prices: number[], period: number = 14): number` | 相对强弱指标，默认14周期 |
| SMA | `calculateSMA(prices: number[], period: number): number` | 简单移动平均 |
| EMA | `calculateEMA(prices: number[], period: number): number[]` | 指数移动平均，返回数组 |
| MACD | `calculateMACD(prices: number[]): { macd: number; signal: number }` | MACD指标，包含信号线 |
| Bollinger Bands | `calculateBollingerBands(prices: number[], period: number = 20): { upper: number; lower: number }` | 布林带，默认20周期 |

### 1.2 前端使用情况

**展示位置：**
- `client/src/components/StockCard.tsx` - 股票卡片显示 RSI
- `client/src/components/StockDetailModal.tsx` - 详情弹窗显示 RSI, MACD, Bollinger Bands
- `client/src/components/QuantMetricsDisplay.tsx` - 量化指标展示包含 MACD

**交互组件：**
- `client/src/components/IndicatorTooltip.tsx` - 指标工具提示
- `client/src/lib/indicatorHelpers.ts` - 指标辅助函数和样式

**多语言支持：**
- `client/src/lib/i18n.tsx` - 包含中英文指标名称和解释

### 1.3 指标计算方式

**结论：指标是在服务端计算的，不是从数据源查询的。**

流程：
1. `getStockAnalysis()` 获取股票历史价格（52周）
2. 调用 `calculateRSI()`, `calculateMACD()` 等函数计算指标
3. 将指标值返回给前端展示

## 2. 复用策略

### 2.1 推荐方案

**方案一：创建共享库（推荐）**

将指标计算函数提取到独立的共享模块：

```
shared/
├── indicators/
│   ├── index.ts          # 导出所有指标
│   ├── trend.ts          # RSI, MACD
│   ├── moving_average.ts # SMA, EMA
│   └── volatility.ts     # Bollinger Bands, ATR
```

```typescript
// shared/indicators/index.ts
export class TechnicalIndicators {
  static calculateRSI(prices: number[], period: number = 14): number {
    // 从 stockService.ts 复制实现
  }
  
  static calculateSMA(prices: number[], period: number): number {
    // 从 stockService.ts 复制实现
  }
  
  // ... 其他指标
}
```

**使用场景：**
- `stock_kanban/server/stockService.ts` - 实时计算展示
- `stock_trading_sim/src/indicators/` - 回测中计算
- 未来：`stock_quant_work` 也可以使用（如果改用 TypeScript）

**优势：**
- ✅ 避免代码重复
- ✅ 统一计算逻辑
- ✅ 便于维护和测试
- ✅ 类型安全（TypeScript）

**方案二：API调用**

stock_trading_sim 调用 stock_kanban 的 API 获取指标。

**缺点：**
- ❌ 增加网络开销
- ❌ 回测时需要大量计算，API方式效率低
- ❌ 系统耦合度高

**结论：不推荐**

### 2.2 实施步骤

1. **提取指标函数**
   - 在 `shared/indicators/` 创建指标库
   - 从 `server/stockService.ts` 复制实现
   - 添加单元测试

2. **更新 stock_kanban**
   - `server/stockService.ts` 引用共享库
   - 保持 API 不变，确保前端无感知

3. **在 stock_trading_sim 中使用**
   - 引用共享库计算指标
   - 在回测中记录指标值

## 3. 可扩展指标（参考 Backtrader）

### 3.1 推荐新增指标

基于 Backtrader 的指标库，推荐在 Phase 2 或更晚添加：

**趋势指标：**
- **ADX (Average Directional Index)** - 趋势强度
- **Parabolic SAR** - 止损和反转点
- **Ichimoku Cloud** - 一目均衡表

**动量指标：**
- **Stochastic Oscillator** - 随机振荡器
- **CCI (Commodity Channel Index)** - 商品通道指数
- **Williams %R** - 威廉指标

**成交量指标：**
- **OBV (On-Balance Volume)** - 能量潮
- **VWAP (Volume Weighted Average Price)** - 成交量加权平均价
- **Accumulation/Distribution** - 累积/派发指标

**波动率指标：**
- **ATR (Average True Range)** - 真实波动幅度均值
- **Keltner Channels** - 肯特纳通道
- **Standard Deviation** - 标准差

### 3.2 实施优先级

**Phase 1（必需）：**
- 复用现有的5个指标即可

**Phase 2（推荐）：**
- ATR - 用于风险管理和仓位计算
- Stochastic - 补充动量分析

**Phase 3/4（可选）：**
- 其他指标根据用户需求逐步添加

## 4. 性能指标（回测专用）

除了技术指标，回测系统还需要计算性能指标：

### 4.1 已设计的性能指标

在 CONSOLIDATED_DESIGN.md 中已定义：

**收益指标：**
- 总收益率、年化收益率、每日收益

**风险指标：**
- 波动率、最大回撤、回撤持续时间

**风险调整指标：**
- 夏普比率、索提诺比率、卡尔玛比率

**交易指标：**
- 胜率、盈亏比、平均盈利/亏损

**基准对比：**
- Alpha、Beta

### 4.2 实施位置

这些指标应该在 `stock_trading_sim` 中实现：

```
stock_trading_sim/
├── src/
│   ├── indicators/        # 技术指标（共享库）
│   └── metrics/           # 性能指标（回测专用）
│       ├── returns.ts
│       ├── risk.ts
│       └── benchmark.ts
```

## 5. 总结

### 关键决策

1. ✅ **复用现有指标**：stock_kanban 已实现的5个核心指标可以提取为共享库
2. ✅ **统一计算逻辑**：避免在多个项目中重复实现
3. ✅ **指标是计算的**：不是查询的，服务端实时计算
4. ✅ **分阶段扩展**：Phase 1 只用现有指标，后续再添加

### 下一步行动

1. [ ] 创建 `shared/indicators/` 目录
2. [ ] 从 `server/stockService.ts` 提取指标函数
3. [ ] 添加单元测试
4. [ ] 更新 stock_kanban 引用共享库
5. [ ] 在 stock_trading_sim 中使用共享库

---

**文档版本：** v1.0  
**最后更新：** 2026-02-06  
**状态：** 供参考
