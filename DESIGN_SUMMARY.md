# 虚拟交易系统设计方案 - 快速导读

> **完整设计文档：** [CONSOLIDATED_DESIGN.md](./CONSOLIDATED_DESIGN.md)

## 文档结构说明

本项目现有三个设计文档：

1. **CONSOLIDATED_DESIGN.md** ⭐ **主文档** - 整合了所有设计内容，推荐阅读
2. **DESIGN.md** - 原有的整体架构设计（已整合到主文档）
3. **IMPLEMENTATION_PLAN.md** - 原有的详细实施计划（已整合到主文档）

**推荐：** 直接阅读 CONSOLIDATED_DESIGN.md，内容更完整、结构更清晰。

---

## 核心决策

### 1️⃣ 在哪里做？

**推荐：创建独立的 `stock_trading_sim` 后端服务**

```
stock_kanban (前端)  ←→  stock_trading_sim (交易后端-新)  ←→  stock_quant_work (量化引擎)
    展示数据              虚拟交易/回测/结算                    生成信号
```

**理由：**
- ✅ 职责清晰分离
- ✅ 独立扩展和部署
- ✅ 便于未来功能迭代

### 2️⃣ 先做什么？

**Phase 1 优先：回测功能（3-4周）**

回测是核心需求，包含：
- 完整的回测引擎（逐日模拟）
- 交易成本模拟（佣金+滑点）
- 性能指标计算
- 资产曲线展示

**为什么先做回测？**
1. 用户核心需求
2. 技术基础（包含大部分交易逻辑）
3. 数据准备（历史信号已存在）
4. 快速验证算法效果
5. 为实盘交易铺路

### 3️⃣ 多策略支持

**设计理念：基于多算法信号**
- 统一使用信号跟随策略框架
- 后端提供多种量化算法（Algorithm A/B/C...）
- 每个算法生成独立的信号数据集
- 每个算法对应一个策略供前端选择

**对比维度：**
- 收益率、年化收益、夏普比率
- 最大回撤、波动率、胜率
- 资产曲线对比图

### 4️⃣ 数据存储

**数据库：PostgreSQL（统一管理）**

**核心表：**
- `strategies` - 策略定义
- `portfolios` - 投资组合（区分回测/实时）
- `holdings` - 当前持仓
- `trades` - 交易记录
- `daily_settlements` - 每日结算
- `strategy_performance` - 性能指标

**原则：** 所有虚拟交易数据统一在一个数据库中管理。

### 5️⃣ 技术指标

**现有实现（stock_kanban）：**
- RSI (14)
- SMA
- EMA
- MACD
- Bollinger Bands

**策略：** 提取为共享库，避免重复开发。新系统直接复用。

**可扩展指标（参考 Backtrader）：**
- 趋势指标：ADX、Parabolic SAR
- 动量指标：Stochastic、CCI
- 成交量指标：OBV、VWAP
- 波动率指标：ATR、Keltner Channels

### 6️⃣ 前端页面

**新增页面：**
1. `/backtest` - 回测中心（配置和启动回测）
2. `/backtest/:id/results` - 回测结果展示
3. `/compare` - 算法对比

**可视化功能（借鉴 Backtrader）：**
- 价格走势与指标叠加
- 买卖信号标记
- 资产曲线图（Recharts）
- 回撤曲线图
- 性能指标卡片

## 实施路线图

### Phase 1 (3-4周) - 回测核心 ⭐ **优先**
- 创建后端项目 + 数据库
- 实现回测引擎（逐日模拟）
- 交易成本模拟（佣金+滑点）
- 前端基础展示页面
- 性能指标计算

**完成目标：** 运行单一算法回测，查看资产曲线和指标

### Phase 2 (2-3周) - 多算法对比
- 支持多算法并行回测
- 算法对比页面
- 相关性分析
- 更多图表类型

**完成目标：** 对比多个算法的表现

### Phase 3 (2-3周) - 实时交易与用户
- 实时虚拟交易（非回测）
- 每日自动结算
- 用户系统（注册/登录）
- 风险管理模块

### Phase 4 (持续) - 高级功能
- 更多技术指标
- 策略参数优化
- 移动端适配
- 社区功能

## 关键问题解答

### Q1: 回测和实时交易分开吗？
A: 使用同一套系统和数据库，通过 `type` 字段区分（'backtest' 或 'live'）。

### Q2: 现有指标需要重写吗？
A: 不需要。stock_kanban 已实现核心指标，提取为共享库复用。

### Q3: 数据怎么统一管理？
A: 所有虚拟交易数据在 PostgreSQL 统一管理，信号数据继续用 JSON。

### Q4: Phase 1 完成后能用吗？
A: 可以。能配置并运行回测，查看完整的性能分析。

### Q5: 需要大改前端吗？
A: 不需要。新增几个页面，复用现有组件和图表库。

## 技术栈

**后端 (stock_trading_sim - 新建):**
```
Node.js 20 + Express 5 + TypeScript 5
PostgreSQL 16 + Drizzle ORM
Yahoo Finance API (价格数据)
```

**前端 (stock_kanban - 扩展):**
```
React + TypeScript + Tailwind (现有)
Recharts (图表库 - 已有)
```

## 下一步行动

1. ✅ 评审整合后的设计文档
2. ⬜ 创建 `stock_trading_sim` 仓库
3. ⬜ 数据库 Schema 实施
4. ⬜ 开始 Phase 1 开发（回测引擎）

---

**详细内容请查看：** [CONSOLIDATED_DESIGN.md](./CONSOLIDATED_DESIGN.md)
