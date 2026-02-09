import { type BacktestAlgorithm } from "../../shared/backtest";

export interface Order {
  ticker: string;
  quantity: number;
  price: number;
  type: "BUY" | "SELL";
}

export interface Portfolio {
  id: string;
  userId: string;
  currentCash: number;
  totalValue: number;
}

export interface Position {
  ticker: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
}

export interface RiskMetrics {
  totalValueAtRisk: number;
  maxDrawdownRisk: number;
  concentrationRisk: number;
  leverageRatio: number;
  suitableForRiskTolerance: boolean;
}

export interface RiskCheckResult {
  approved: boolean;
  reason?: string;
  metrics?: RiskMetrics;
}

export const RISK_LIMITS = {
  conservative: {
    maxPositionPerStock: 0.08,      // 单个股票最多占投资组合8%
    maxTotalPositions: 8,            // 最多持有8个不同股票
    minCashReserve: 0.2,             // 最少保留20%现金
  },
  moderate: {
    maxPositionPerStock: 0.15,      // 单个股票最多占投资组合15%
    maxTotalPositions: 15,           // 最多持有15个不同股票
    minCashReserve: 0.1,             // 最少保留10%现金
  },
  aggressive: {
    maxPositionPerStock: 0.25,      // 单个股票最多占投资组合25%
    maxTotalPositions: 30,           // 最多持有30个不同股票
    minCashReserve: 0.05,            // 最少保留5%现金
  },
};

/**
 * 风险管理模块
 * 用于检查订单是否符合风险限制
 */
export class RiskManager {
  private riskTolerance: "conservative" | "moderate" | "aggressive";

  constructor(riskTolerance: "conservative" | "moderate" | "aggressive" = "moderate") {
    this.riskTolerance = riskTolerance;
  }

  /**
   * 检查订单是否吸收风险限制
   * @param order - 待执行的订单
   * @param portfolio - 当前投资组合
   * @param positions - 当前持仓
   * @returns 检查结果
   */
  checkOrderRisk(order: Order, portfolio: Portfolio, positions: Position[]): RiskCheckResult {
    const limits = RISK_LIMITS[this.riskTolerance];

    // Guard against division by zero
    if (portfolio.totalValue <= 0) {
      return {
        approved: false,
        reason: "Portfolio has no value - cannot execute trades",
      };
    }

    // 1. 检查最小现金储备
    const orderValue = order.quantity * order.price;
    const commission = orderValue * 0.0005; // 0.05% 佣金
    const totalCost = orderValue + commission;

    if (order.type === "BUY") {
      const remainingCash = portfolio.currentCash - totalCost;
      const minCashRequired = portfolio.totalValue * limits.minCashReserve;

      if (remainingCash < minCashRequired) {
        return {
          approved: false,
          reason: `Order would violate minimum cash reserve (${(limits.minCashReserve * 100).toFixed(1)}%). Required: $${minCashRequired.toFixed(2)}, would have: $${remainingCash.toFixed(2)}`,
        };
      }
    }

    // 2. 检查单个股票仓位比例
    const existingPosition = positions.find((p) => p.ticker === order.ticker);
    const existingQuantity = existingPosition?.quantity || 0;
    const newQuantity = order.type === "BUY" ? existingQuantity + order.quantity : Math.max(0, existingQuantity - order.quantity);
    const newPositionValue = newQuantity * order.price;
    const newPositionPercent = newPositionValue / portfolio.totalValue;
    const maxPositionPercent = limits.maxPositionPerStock;

    if (newPositionPercent > maxPositionPercent) {
      return {
        approved: false,
        reason: `Position in ${order.ticker} would exceed ${(maxPositionPercent * 100).toFixed(1)}% limit (would be ${(newPositionPercent * 100).toFixed(1)}%)`,
      };
    }

    // 3. 检查总持仓数量
    const uniqueTickersAfter = new Set(
      positions
        .filter((p) => p.ticker !== order.ticker || newQuantity > 0)
        .map((p) => p.ticker),
    );
    if (order.type === "BUY" && !existingPosition) {
      uniqueTickersAfter.add(order.ticker);
    }

    if (uniqueTickersAfter.size > limits.maxTotalPositions) {
      return {
        approved: false,
        reason: `Order would exceed maximum position count of ${limits.maxTotalPositions} (would be ${uniqueTickersAfter.size})`,
      };
    }

    // 所有检查都通过
    return {
      approved: true,
      metrics: this.calculateRiskMetrics(order, portfolio, positions),
    };
  }

  /**
   * 计算当前的风险指标
   */
  private calculateRiskMetrics(order: Order, portfolio: Portfolio, positions: Position[]): RiskMetrics {
    const limits = RISK_LIMITS[this.riskTolerance];

    // 总仓位市值
    let totalPositionValue = 0;
    let maxSinglePosition = 0;

    for (const pos of positions) {
      const posValue = pos.quantity * pos.currentPrice;
      totalPositionValue += posValue;
      maxSinglePosition = Math.max(maxSinglePosition, posValue);
    }

    // 集中度风险（最大单个仓位比例）
    const concentrationRisk = portfolio.totalValue > 0 ? maxSinglePosition / portfolio.totalValue : 0;

    return {
      totalValueAtRisk: totalPositionValue,
      maxDrawdownRisk: 0, // 需要计算historical max drawdown
      concentrationRisk,
      leverageRatio: totalPositionValue / portfolio.totalValue,
      suitableForRiskTolerance: concentrationRisk <= limits.maxPositionPerStock,
    };
  }

  /**
   * 获取当前风险评级
   */
  getRiskLevel(portfolio: Portfolio, positions: Position[]): "low" | "medium" | "high" {
    let positionValue = 0;
    let maxPosition = 0;

    for (const pos of positions) {
      const val =pos.quantity * pos.currentPrice;
      positionValue += val;
      maxPosition = Math.max(maxPosition, val);
    }

    // Guard against division by zero
    if (portfolio.totalValue <= 0) {
      return "low";
    }

    const leverage = positionValue / portfolio.totalValue;
    const concentration = maxPosition / portfolio.totalValue;
    const cashPercent = portfolio.currentCash / portfolio.totalValue;

    // 评估风险级别
    if (leverage > 0.95 || concentration > 0.3 || cashPercent < 0.02) {
      return "high";
    } else if (leverage > 0.7 || concentration > 0.15 || cashPercent < 0.1) {
      return "medium";
    } else {
      return "low";
    }
  }
}
