import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "zh";

type Vars = Record<string, string | number>;

const translations = {
  en: {
    langToggle: "EN",
    manageWatchlistsTitle: "Manage watchlists",
    fetchingRealData: "Fetching Real Data...",
    failedLoad: "Failed to load data",
    retry: "Retry",
    emptyWatchlist: "No stocks in this watchlist",
    addStocks: "Add stocks",
    volatility: "Volatility",
    loading: "Loading...",
    noChartData: "No chart data available",
    done: "Done",
    back: "Back",
    edit: "Edit",
    manageWatchlists: "Manage Watchlists",
    createWatchlist: "Create Watchlist",
    createNewWatchlist: "Create New Watchlist",
    watchlistName: "Watchlist Name",
    createWatchlistBtn: "Create Watchlist",
    save: "Save",
    addStock: "Add Stock",
    searchPlaceholder: "Search by name or ticker...",
    watchlistPlaceholder: "e.g., Tech Giants",
    added: "Added",
    noResults: "No results found",
    currentStocks: "Current Stocks ({count}) - Drag to reorder",
    dragWatchlists: "Drag to reorder watchlists",
    stocksCount: "{count} stocks",
    noStocksInWatchlist: "No stocks in this watchlist",
    notFoundTitle: "404 Page Not Found",
    notFoundDesc: "Did you forget to add the page to the router?",
    predictedReturn20d: "Predicted Return (20d)",
    vol60: "60-Day Volatility",
    maxdd: "Max Drawdown (252d)",
    vol60Short: "Vol60",
    maxddShort: "MaxDD",
    ret20Short: "20DRet",
    week52High: "52 Week High",
    week52Low: "52 Week Low",
    bollinger: "Bollinger Bands",
    rsi14: "RSI (14)",
    shortFloat: "Short Float",
    volAvg: "Vol / Avg",
    currentValue: "Current Value",
    whatIsIt: "What is it?",
    howToInterpret: "How to interpret",
    unknownIndicatorDescription: "Technical indicator used for stock analysis.",
    unknownIndicatorInterpretation: "Consult financial resources for detailed interpretation.",
    indicator: {
      rsi: {
        title: "RSI (Relative Strength Index)",
        description: "RSI measures the speed and magnitude of recent price changes to evaluate overbought or oversold conditions.",
        interpretation: "RSI > 70 = Overbought (potential sell signal)\nRSI < 30 = Oversold (potential buy signal)\nRSI 30-70 = Neutral range",
      },
      volume: {
        title: "Volume",
        description: "The number of shares traded during a given period. High volume confirms price movements.",
        interpretation: "Volume > 1.5x Average = Strong interest/momentum\nVolume < Average = Weak conviction\nVolume spikes often precede big moves",
      },
      shortfloat: {
        title: "Short Float %",
        description: "Percentage of shares available for trading that have been sold short but not yet covered. Represents bearish bets against the stock.",
        interpretation: "Short Float < 10% = Low bearish interest\nShort Float 10-20% = Moderate short interest\nShort Float 20%+ = High short interest (squeeze risk)\nHigher % = More bearish sentiment, higher squeeze potential",
      },
      macd: {
        title: "MACD (Moving Average Convergence Divergence)",
        description: "MACD shows the relationship between two moving averages. It helps identify trend direction and momentum.",
        interpretation: "MACD > Signal Line = Bullish momentum\nMACD < Signal Line = Bearish momentum\nMACD crossing above signal = Buy signal\nMACD crossing below signal = Sell signal",
      },
      bollinger: {
        title: "Bollinger Bands",
        description: "Bollinger Bands show price volatility by plotting bands 2 standard deviations above and below a moving average.",
        interpretation: "Price near upper band = Potentially overbought\nPrice near lower band = Potentially oversold\nBands widening = Increasing volatility\nBands narrowing = Decreasing volatility",
      },
      sma: {
        title: "SMA (Simple Moving Average)",
        description: "The average closing price over a specific period (20 days). Shows the overall trend direction.",
        interpretation: "Price > SMA20 = Uptrend\nPrice < SMA20 = Downtrend\nSMA acts as support/resistance",
      },
      week52: {
        title: "52-Week High/Low",
        description: "The highest and lowest prices the stock has traded at during the past year.",
        interpretation: "Near 52W High = Strong momentum, but may be extended\nNear 52W Low = Potential value, but weak momentum\nBreaking 52W High = Very bullish signal",
      },
      trend: {
        title: "Trend Indicator",
        description: "Shows whether the stock is in an uptrend or downtrend based on its position relative to the 20-day moving average.",
        interpretation: "Uptrend = Price above SMA20 (bullish)\nDowntrend = Price below SMA20 (bearish)",
      },
      rank: {
        title: "Ensemble Rank",
        description: "Ordinal ranking after combining quantitative scores, buffers, and predictive signals from machine learning models.",
        interpretation: "Rank 1 = Best candidate (lowest is better)\nRank 1-3 = Top tier signals\nRank 4-5 = Strong signals\nRank > 5 = Weaker signals\nLower rank values are favorable",
      },
      score: {
        title: "Ensemble Score (Rank Percentile)",
        description: "Normalized composite score from the ensemble ranking (0-1). Lower values indicate stronger candidates.",
        interpretation: "Lower values are better\nScore reflects relative ranking percentile\nUse alongside rank for decision making\nScores are comparable across stocks",
      },
      predictedreturn: {
        title: "Predicted Return (20 Trading Days)",
        description: "Forecasted price return over the next 20 trading days (~1 month) from ML models analyzing historical patterns and technical factors.",
        interpretation: "Positive % = Bullish signal\nNegative % = Bearish signal\n> 5% = Strong upside potential\n< -5% = Strong downside risk\nBased on historical patterns and technical indicators",
      },
      vol60: {
        title: "60-Day Volatility (Z-Score)",
        description: "Standardized 60-day historical volatility relative to the same-date cross-sectional baseline.",
        interpretation: "Higher values = More volatile (riskier)\nNear 0 = Average volatility\nLower values = More stable\nUse alongside drawdown for risk context",
      },
      maxdd252: {
        title: "252-Day Maximum Drawdown (Z-Score)",
        description: "Standardized 252-day (1 year) maximum drawdown from peak to trough relative to the same-date baseline.",
        interpretation: "Lower (more negative) values = Larger drawdowns (riskier)\nNear 0 = Average drawdown\nHigher values = Smaller drawdowns\nUse with volatility for risk screening",
      },
      signal: {
        title: "Signal",
        description: "Final action label derived from quantitative ranking and risk checks.",
        interpretation: "BUY = Strong candidate\nSELL = Weak candidate or exit signal\nHOLD = Neutral or mixed signals\nRISK_ALERT = Missing risk inputs (vol60/maxdd252)\nUse with other indicators for confirmation",
      },
    },
    watchlistLabels: {
      ai_chips: "🤖 AI & Chips",
      nuclear: "☢️ Nuclear/Energy",
      indices: "📉 Market Indices",
      volatility: "👀 High Volatility",
    },
    leaderboard: {
      title: "Leaderboard",
      usStocks: "US Stocks",
      cnStocks: "China A-Shares",
      hkStocks: "Hong Kong Stocks",
      updated: "Updated",
      noData: "No leaderboard data available",
      loading: "Loading leaderboard...",
      rank: "Rank",
      ticker: "Ticker",
      predicted20dReturn: "20D Return",
    },
  },
  zh: {
    langToggle: "中",
    manageWatchlistsTitle: "管理自选",
    fetchingRealData: "正在获取实时数据...",
    failedLoad: "数据加载失败",
    retry: "重试",
    emptyWatchlist: "该自选列表暂无股票",
    addStocks: "添加股票",
    volatility: "波动率",
    loading: "加载中...",
    noChartData: "暂无图表数据",
    done: "完成",
    back: "返回",
    edit: "编辑",
    manageWatchlists: "管理自选",
    createWatchlist: "新建自选",
    createNewWatchlist: "创建新的自选",
    watchlistName: "自选名称",
    createWatchlistBtn: "创建自选",
    save: "保存",
    addStock: "添加股票",
    searchPlaceholder: "按名称或代码搜索...",
    watchlistPlaceholder: "例如：科技龙头",
    added: "已添加",
    noResults: "暂无结果",
    currentStocks: "当前股票（{count}）- 拖动排序",
    dragWatchlists: "拖动排序自选列表",
    stocksCount: "{count} 只",
    noStocksInWatchlist: "该自选列表暂无股票",
    notFoundTitle: "404 页面未找到",
    notFoundDesc: "是否忘记在路由中添加该页面？",
    predictedReturn20d: "20日预测收益",
    vol60: "60日波动率",
    maxdd: "最大回撤（252日）",
    vol60Short: "Vol60",
    maxddShort: "MaxDD",
    ret20Short: "20DRet",
    week52High: "52周最高",
    week52Low: "52周最低",
    bollinger: "布林带",
    rsi14: "RSI (14)",
    shortFloat: "空头占比",
    volAvg: "成交量 / 均量",
    currentValue: "当前值",
    whatIsIt: "这是什么？",
    howToInterpret: "如何解读",
    unknownIndicatorDescription: "用于股票分析的技术指标。",
    unknownIndicatorInterpretation: "可参考相关金融资料获取更多解读。",
    indicator: {
      rsi: {
        title: "RSI（相对强弱指标）",
        description: "RSI 衡量近期价格变化的速度与幅度，用于判断超买或超卖。",
        interpretation: "RSI > 70 = 超买（可能卖出）\nRSI < 30 = 超卖（可能买入）\nRSI 30-70 = 中性区间",
      },
      volume: {
        title: "成交量",
        description: "单位时间内的成交股数。高成交量通常验证价格走势。",
        interpretation: "成交量 > 平均值 1.5x = 强动能\n成交量 < 平均值 = 动能较弱\n放量常预示大波动",
      },
      shortfloat: {
        title: "空头占比 %",
        description: "可交易流通股中被卖空但未回补的比例，代表对股票的看空押注。",
        interpretation: "空头占比 < 10% = 看空较低\n10-20% = 中等看空\n> 20% = 看空较高（挤压风险）",
      },
      macd: {
        title: "MACD（指数平滑异同移动平均）",
        description: "MACD 显示两条均线的关系，用于识别趋势与动量。",
        interpretation: "MACD > 信号线 = 看多动量\nMACD < 信号线 = 看空动量\n上穿信号线 = 买入\n下穿信号线 = 卖出",
      },
      bollinger: {
        title: "布林带",
        description: "在均线上下 2 个标准差绘制的带状区间，用于观察波动。",
        interpretation: "接近上轨 = 可能超买\n接近下轨 = 可能超卖\n带宽变大 = 波动上升\n带宽变小 = 波动下降",
      },
      sma: {
        title: "SMA（简单移动平均）",
        description: "指定周期（20日）的平均收盘价，用于判断趋势方向。",
        interpretation: "价格 > SMA20 = 上升趋势\n价格 < SMA20 = 下降趋势\nSMA 常作为支撑/阻力",
      },
      week52: {
        title: "52周高/低",
        description: "过去一年内的最高价与最低价。",
        interpretation: "接近52周高点 = 动能强但可能过热\n接近52周低点 = 价值可能性但动能弱\n突破52周高点 = 强烈看多",
      },
      trend: {
        title: "趋势指标",
        description: "基于价格与20日均线位置判断趋势方向。",
        interpretation: "上升趋势 = 价格高于SMA20\n下降趋势 = 价格低于SMA20",
      },
      rank: {
        title: "综合排名",
        description: "综合量化得分与预测信号后的排序。",
        interpretation: "Rank 1 = 最佳（越小越好）\nRank 1-3 = 顶级信号\nRank 4-5 = 强信号\nRank > 5 = 较弱信号",
      },
      score: {
        title: "综合得分（排名百分位）",
        description: "0-1 的归一化综合得分，越小越好。",
        interpretation: "得分越低越好\n反映相对排名分位\n配合排名一起使用",
      },
      predictedreturn: {
        title: "预测收益（20交易日）",
        description: "基于历史与技术因子的机器学习预测收益。",
        interpretation: "正值 = 看多\n负值 = 看空\n> 5% = 强上行\n< -5% = 强下行",
      },
      vol60: {
        title: "60日波动率（Z-Score）",
        description: "相对同日基准的60日历史波动率标准化值。",
        interpretation: "值越大 = 波动越高（风险高）\n接近0 = 一般水平\n值越小 = 更稳定",
      },
      maxdd252: {
        title: "252日最大回撤（Z-Score）",
        description: "相对同日基准的252日最大回撤标准化值。",
        interpretation: "值越低（更负）= 回撤更大（风险更高）\n接近0 = 一般水平\n值越高 = 回撤更小",
      },
      signal: {
        title: "信号",
        description: "量化排名与风险检查后的最终行动标签。",
        interpretation: "BUY = 强信号\nSELL = 弱信号或退出\nHOLD = 中性\nRISK_ALERT = 风险输入缺失",
      },
    },
    watchlistLabels: {
      ai_chips: "🤖 AI / 芯片",
      nuclear: "☢️ 核能 / 能源",
      indices: "📉 市场指数",
      volatility: "👀 高波动",
    },
    leaderboard: {
      title: "排行榜",
      usStocks: "美股",
      cnStocks: "A股",
      hkStocks: "港股",
      updated: "更新时间",
      noData: "暂无排行榜数据",
      loading: "加载中...",
      rank: "排名",
      ticker: "代码",
      predicted20dReturn: "20日预测",
    },
  },
} as const;

type Translations = typeof translations.en;
type StringKeys = {
  [K in keyof Translations]: Translations[K] extends string ? K : never
}[keyof Translations];

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: StringKeys, vars?: Vars) => string;
  indicator: typeof translations.en.indicator | typeof translations.zh.indicator;
  watchlistLabel: (id: string, fallback: string) => string;
  leaderboard: typeof translations.en.leaderboard | typeof translations.zh.leaderboard;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const format = (text: string, vars?: Vars) => {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui_language");
      if (stored === "en" || stored === "zh") {
        setLang(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui_language", lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const bundle = translations[lang];
    return {
      lang,
      setLang,
      t: (key, vars) => format(bundle[key], vars),
      indicator: bundle.indicator,
      watchlistLabel: (id, fallback) => bundle.watchlistLabels[id as keyof typeof bundle.watchlistLabels] || fallback,
      leaderboard: bundle.leaderboard,
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <LanguageProvider>");
  }
  return ctx;
}
