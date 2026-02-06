# 虚拟交易系统设计方案 - 快速导读

> **完整设计文档：** 请查看 [DESIGN.md](./DESIGN.md)

## 核心决策

### 1️⃣ 在哪里做？

**推荐：创建独立的 `stock_trading_sim` 后端服务**

```
stock_kanban (前端)  ←→  stock_trading_sim (交易后端-新)  ←→  stock_quant_work (量化引擎)
    展示数据              虚拟交易/结算/策略                    生成信号
```

**理由：**
- ✅ 职责清晰分离
- ✅ 独立扩展和部署
- ✅ 便于未来功能迭代

### 2️⃣ 多策略支持

**预设4种策略：**
1. **信号跟随策略** - 直接执行 BUY/SELL 信号
2. **趋势跟踪策略** - 信号 + 技术指标确认
3. **均值回归策略** - 反向操作，超卖买入
4. **组合优化策略** - 基于风险调整后收益

**对比维度：**
- 收益率、年化收益、夏普比率
- 最大回撤、波动率、胜率
- 资产曲线对比图

### 3️⃣ 历史数据存储

**数据库：PostgreSQL**

**核心表：**
- `strategies` - 策略定义
- `portfolios` - 投资组合
- `holdings` - 当前持仓
- `trades` - 交易记录
- `daily_settlements` - 每日结算
- `strategy_performance` - 性能指标

### 4️⃣ 用户管理

**权限层级：**
- 游客 → 查看公开策略
- 注册用户 → 创建个人组合
- 高级用户 → 无限组合 + 自定义策略
- 管理员 → 系统管理

### 5️⃣ 实施路线图

**Phase 1 (2-3周) - MVP**
- 创建后端项目 + 数据库
- 实现信号跟随策略
- 前端基础展示页面

**Phase 2 (2-3周) - 多策略**
- 实现3-5个策略
- 策略对比功能
- 完善性能指标

**Phase 3 (2周) - 用户系统**
- 注册/登录
- 权限管理
- 数据隔离

**Phase 4 (持续) - 高级功能**
- 自定义策略编辑器
- 实时推送
- 移动端支持

### 6️⃣ 关键注意事项

⚠️ **9个重要问题：**
1. 数据质量与一致性
2. 交易成本与滑点模拟
3. 回测偏差（前视偏差、过拟合）
4. 系统性能与扩展性
5. 合规性与免责声明
6. 国际化与多市场支持
7. 监控与告警
8. 备份与灾难恢复
9. 用户期望管理（虚拟≠真实）

## 技术栈

**后端 (stock_trading_sim - 新建):**
```
Node.js 20 + Express 5 + TypeScript 5
PostgreSQL 16 + Redis 7 + Drizzle ORM
```

**前端 (stock_kanban - 扩展):**
```
React + TypeScript + Tailwind (现有)
+ @tanstack/react-table (新增)
```

## API 设计示例

```typescript
// 策略管理
GET    /api/strategies
POST   /api/strategies

// 投资组合
GET    /api/portfolios
POST   /api/portfolios
GET    /api/portfolios/:id/performance

// 交易记录
GET    /api/portfolios/:id/trades
GET    /api/portfolios/:id/holdings

// 对比分析
POST   /api/compare/strategies
```

## 前端新增页面

1. `/strategies` - 策略中心
2. `/portfolios` - 投资组合列表
3. `/portfolios/:id/trades` - 交易记录
4. `/portfolios/:id/performance` - 性能分析
5. `/compare` - 策略对比

## 下一步行动

1. ✅ 评审 DESIGN.md
2. ⬜ 确定 MVP 范围
3. ⬜ 创建 `stock_trading_sim` 仓库
4. ⬜ 数据库 Schema 实施
5. ⬜ 开始 Phase 1 开发

---

**详细内容请查看：** [DESIGN.md](./DESIGN.md) (924行完整设计文档)
