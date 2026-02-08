import { type Language } from "./i18n";

export type BacktestTermKey =
  | "annualizedReturn"
  | "maxDrawdown"
  | "sharpeRatio"
  | "volatility"
  | "rebalance"
  | "slippageBps"
  | "commissionBps"
  | "cashReserve"
  | "correlation"
  | "monthlyHeatmap"
  | "winRate";

type TermEntry = {
  label: Record<Language, string>;
  description: Record<Language, string>;
};

export const backtestTerms: Record<BacktestTermKey, TermEntry> = {
  annualizedReturn: {
    label: { en: "Annualized Return", zh: "年化收益" },
    description: {
      en: "Compounded return normalized to a one-year horizon.",
      zh: "把区间收益折算为一年周期后的复合收益率。",
    },
  },
  maxDrawdown: {
    label: { en: "Max Drawdown", zh: "最大回撤" },
    description: {
      en: "Largest peak-to-trough portfolio decline during the period.",
      zh: "回测期间组合从高点到低点的最大跌幅。",
    },
  },
  sharpeRatio: {
    label: { en: "Sharpe Ratio", zh: "夏普比率" },
    description: {
      en: "Risk-adjusted return metric: excess return divided by volatility.",
      zh: "风险调整后收益指标：超额收益除以波动率。",
    },
  },
  volatility: {
    label: { en: "Volatility", zh: "波动率" },
    description: {
      en: "Annualized standard deviation of returns, used as risk proxy.",
      zh: "收益率标准差的年化值，常用于衡量风险。",
    },
  },
  rebalance: {
    label: { en: "Rebalance", zh: "再平衡频率" },
    description: {
      en: "How often portfolio weights are adjusted to target allocations.",
      zh: "组合按目标权重进行调整的频率。",
    },
  },
  slippageBps: {
    label: { en: "Slippage (bps)", zh: "滑点（基点）" },
    description: {
      en: "Execution price impact in basis points. 1 bps = 0.01%.",
      zh: "成交价格偏移，单位为基点。1 基点 = 0.01%。",
    },
  },
  commissionBps: {
    label: { en: "Commission (bps)", zh: "手续费（基点）" },
    description: {
      en: "Transaction fee charged as basis points of trade notional.",
      zh: "按成交金额的基点比例收取的交易手续费。",
    },
  },
  cashReserve: {
    label: { en: "Cash Reserve", zh: "现金保留比例" },
    description: {
      en: "Minimum percentage of portfolio kept as cash.",
      zh: "组合中始终保留为现金的最低比例。",
    },
  },
  correlation: {
    label: { en: "Correlation Matrix", zh: "相关性矩阵" },
    description: {
      en: "Pearson correlation of daily returns across algorithms.",
      zh: "不同算法日收益率之间的皮尔逊相关系数。",
    },
  },
  monthlyHeatmap: {
    label: { en: "Monthly Return Heatmap", zh: "月度收益热力图" },
    description: {
      en: "Month-over-month return grid for each algorithm.",
      zh: "按算法展示每个月收益率的对比热力图。",
    },
  },
  winRate: {
    label: { en: "Win Rate", zh: "胜率" },
    description: {
      en: "Ratio of profitable trades to total trades.",
      zh: "盈利交易数量占总交易数量的比例。",
    },
  },
};

type SectionText = Record<Language, string>;

export const backtestUi = {
  nav: {
    center: { en: "Backtest", zh: "回测中心" } satisfies SectionText,
    compare: { en: "Compare", zh: "算法对比" } satisfies SectionText,
    history: { en: "History", zh: "历史记录" } satisfies SectionText,
    live: { en: "Live", zh: "实时模拟" } satisfies SectionText,
    dashboard: { en: "Dashboard", zh: "看板" } satisfies SectionText,
  },
  center: {
    title: { en: "Backtest Center", zh: "回测中心" } satisfies SectionText,
    subtitle: {
      en: "Configure and run single-algorithm backtests.",
      zh: "配置并运行单算法回测。",
    } satisfies SectionText,
    userId: { en: "User ID", zh: "用户 ID" } satisfies SectionText,
    algorithm: { en: "Algorithm", zh: "算法" } satisfies SectionText,
    startDate: { en: "Start Date", zh: "开始日期" } satisfies SectionText,
    endDate: { en: "End Date", zh: "结束日期" } satisfies SectionText,
    initialCash: { en: "Initial Cash", zh: "初始资金" } satisfies SectionText,
    maxPositionPerStock: { en: "Max Position Per Stock", zh: "单标的最大仓位" } satisfies SectionText,
    maxTotalPositions: { en: "Max Total Positions", zh: "最大持仓数量" } satisfies SectionText,
    minCashReserve: { en: "Min Cash Reserve", zh: "最小现金保留" } satisfies SectionText,
    minCommission: { en: "Min Commission", zh: "最小手续费" } satisfies SectionText,
    run: { en: "Run Backtest", zh: "运行回测" } satisfies SectionText,
    running: { en: "Running Backtest...", zh: "回测运行中..." } satisfies SectionText,
  },
  history: {
    title: { en: "Backtest History", zh: "回测历史" } satisfies SectionText,
    subtitle: {
      en: "Paginated history with status filter and user isolation.",
      zh: "支持分页、状态筛选和用户隔离的历史记录。",
    } satisfies SectionText,
    status: { en: "Status", zh: "状态" } satisfies SectionText,
    runDateFrom: { en: "Run Date From", zh: "运行起始日" } satisfies SectionText,
    runDateTo: { en: "Run Date To", zh: "运行结束日" } satisfies SectionText,
    pageSize: { en: "Page Size", zh: "每页数量" } satisfies SectionText,
    applyFilters: { en: "Apply Filters", zh: "应用筛选" } satisfies SectionText,
    filtering: { en: "Filtering...", zh: "筛选中..." } satisfies SectionText,
    noData: { en: "No backtest history found for current filters.", zh: "当前筛选条件下暂无回测记录。" } satisfies SectionText,
    view: { en: "View", zh: "查看" } satisfies SectionText,
    prev: { en: "Prev", zh: "上一页" } satisfies SectionText,
    next: { en: "Next", zh: "下一页" } satisfies SectionText,
  },
  results: {
    title: { en: "Backtest Results", zh: "回测结果" } satisfies SectionText,
    loading: { en: "Loading backtest...", zh: "回测加载中..." } satisfies SectionText,
    loadFailed: { en: "Failed to load backtest result.", zh: "回测结果加载失败。" } satisfies SectionText,
    backToCenter: { en: "Back to Backtest Center", zh: "返回回测中心" } satisfies SectionText,
    finalValue: { en: "Final Value", zh: "期末资产" } satisfies SectionText,
    totalReturn: { en: "Total Return", zh: "总收益" } satisfies SectionText,
    totalTrades: { en: "Total Trades", zh: "总交易数" } satisfies SectionText,
    equityCurve: { en: "Equity Curve", zh: "资产曲线" } satisfies SectionText,
    trades: { en: "Trades", zh: "交易记录" } satisfies SectionText,
    newBacktest: { en: "New Backtest", zh: "新建回测" } satisfies SectionText,
  },
  compare: {
    title: { en: "Algorithm Compare", zh: "算法对比" } satisfies SectionText,
    subtitle: {
      en: "Run multiple algorithms and compare outcomes.",
      zh: "运行多个算法并对比表现。",
    } satisfies SectionText,
    algorithms: { en: "Algorithms", zh: "算法列表" } satisfies SectionText,
    run: { en: "Run Compare", zh: "运行对比" } satisfies SectionText,
    running: { en: "Running Compare...", zh: "对比运行中..." } satisfies SectionText,
    exportCsv: { en: "Export CSV", zh: "导出 CSV" } satisfies SectionText,
    exportPdf: { en: "Export PDF", zh: "导出 PDF" } satisfies SectionText,
    equityCurves: { en: "Equity Curves", zh: "资产曲线对比" } satisfies SectionText,
    drawdownCurves: { en: "Drawdown Curves", zh: "回撤曲线对比" } satisfies SectionText,
    summary: { en: "Summary", zh: "汇总指标" } satisfies SectionText,
    monthlyReturnHeatmap: { en: "Monthly Return Heatmap", zh: "月度收益热力图" } satisfies SectionText,
  },
} as const;

export const bt = (value: Record<Language, string>, lang: Language): string =>
  value[lang];
