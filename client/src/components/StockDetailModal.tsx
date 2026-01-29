import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useStockChart, ChartInterval, useSingleStock, isMarketOpen } from "@/lib/stockApi";
import { cn } from "@/lib/utils";
import { IndicatorTooltip } from "./IndicatorTooltip";
import { QuantMetricsDisplay } from "./QuantMetricsDisplay";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface StockDetailModalProps {
  ticker: string;
  isOpen: boolean;
  onClose: () => void;
}

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "1Y", value: "1y" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length && payload[0].value !== null) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs">
        <div className="text-gray-400 mb-1">{data.fullDate || data.time}</div>
        <div className="text-white font-mono font-bold">
          ${payload[0].value.toFixed(2)}
        </div>
      </div>
    );
  }
  return null;
};

export function StockDetailModal({ ticker, isOpen, onClose }: StockDetailModalProps) {
  const [interval, setInterval] = useState<ChartInterval>("1mo");
  const { data: stock, isLoading: stockLoading } = useSingleStock(ticker, isOpen);
  const { data: chartData, isLoading: chartLoading } = useStockChart(ticker, interval, isOpen);

  if (!stock && !stockLoading) return null;

  const isPositive = (stock?.changePercent || 0) >= 0;
  const chartColor = isPositive ? "#22c55e" : "#ef4444";

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const chartDate = chartData && chartData.length > 0 ? chartData[0].date : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card border border-border w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-mono">{ticker}</h2>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {stock?.name || "Loading..."}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-bold font-mono">
                    ${stock?.price.toFixed(2) || "-"}
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-end gap-1 text-sm font-mono",
                      isPositive ? "text-positive" : "text-negative"
                    )}
                  >
                    {isPositive ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {Math.abs(stock?.changePercent || 0).toFixed(2)}%
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-secondary rounded-lg"
                  data-testid="close-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {INTERVALS.map((int) => (
                    <button
                      key={int.value}
                      onClick={() => setInterval(int.value)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-mono font-medium transition-colors flex-shrink-0",
                        interval === int.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                      data-testid={`interval-${int.value}`}
                    >
                      {int.label}
                    </button>
                  ))}
                </div>
                {(interval === "1d" || interval === "5d") && chartDate && (
                  <span className="text-xs text-muted-foreground font-mono ml-2">
                    {chartDate}
                  </span>
                )}
              </div>

              <div className="h-64 w-full">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : chartData && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id={`colorPrice-${ticker}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={chartColor}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={chartColor}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={40}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatPrice}
                        width={60}
                        allowDataOverflow={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={chartColor}
                        strokeWidth={2}
                        fill={`url(#colorPrice-${ticker})`}
                        connectNulls={false}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No chart data available
                  </div>
                )}
              </div>

              {stockLoading ? (
                <div className="mt-6 flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : stock && (
                <>
                  {/* Quant Metrics ?????? */}
                  {stock.quant && (
                    <div className="mt-6">
                      <QuantMetricsDisplay metrics={stock.quant} compact={true} />
                    </div>
                  )}

                  {stock.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {stock.tags.map((tag, i) => {
                        const colors = {
                          BUY: "bg-positive/10 text-positive border-positive/20",
                          SELL: "bg-negative/10 text-negative border-negative/20",
                          WARNING: "bg-warning/10 text-warning border-warning/20",
                          NEUTRAL: "bg-muted text-muted-foreground border-border",
                        };
                        const getIndicatorType = (label: string): string => {
                          const labelLower = label.toLowerCase();
                          if (labelLower.includes('rsi')) return 'rsi';
                          if (labelLower.includes('macd')) return 'macd';
                          if (labelLower.includes('trend')) return 'trend';
                          if (labelLower.includes('52w') || labelLower.includes('week')) return 'week52';
                          if (labelLower.includes('bollinger')) return 'bollinger';
                          if (labelLower.includes('volume')) return 'volume';
                          return 'trend';
                        };
                        return (
                          <IndicatorTooltip key={i} indicator={getIndicatorType(tag.label)} value={tag.value}>
                            <div
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium font-mono",
                                colors[tag.type]
                              )}
                            >
                              <span>{tag.label}</span>
                              {tag.value && (
                                <span className="opacity-70 border-l border-current pl-2">
                                  {tag.value}
                                </span>
                              )}
                            </div>
                          </IndicatorTooltip>
                        );
                      })}
                    </div>
                  )}

                  {/* Technical Indicators ???? */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <IndicatorTooltip indicator="week52" value={`High: $${stock.week52High?.toFixed(2) || "-"}`}>
                      <div className="bg-secondary/50 rounded-xl p-4">
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                          52 Week High
                        </div>
                        <div className="text-lg font-mono font-bold">
                          ${stock.week52High?.toFixed(2) || "-"}
                        </div>
                      </div>
                    </IndicatorTooltip>
                    <IndicatorTooltip indicator="week52" value={`Low: $${stock.week52Low?.toFixed(2) || "-"}`}>
                      <div className="bg-secondary/50 rounded-xl p-4">
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                          52 Week Low
                        </div>
                        <div className="text-lg font-mono font-bold">
                          ${stock.week52Low?.toFixed(2) || "-"}
                        </div>
                      </div>
                    </IndicatorTooltip>
                    <IndicatorTooltip indicator="macd" value={stock.macd}>
                      <div className="bg-secondary/50 rounded-xl p-4">
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                          MACD
                        </div>
                        <div
                          className={cn(
                            "text-lg font-mono font-bold",
                            (stock.macd || 0) > 0 ? "text-positive" : "text-negative"
                          )}
                        >
                          {stock.macd?.toFixed(2) || "-"}
                        </div>
                      </div>
                    </IndicatorTooltip>
                    <IndicatorTooltip indicator="bollinger" value={`$${stock.bollingerLower?.toFixed(0) || "-"} - $${stock.bollingerUpper?.toFixed(0) || "-"}`}>
                      <div className="bg-secondary/50 rounded-xl p-4">
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                          Bollinger Bands
                        </div>
                        <div className="text-sm font-mono">
                          <span className="text-positive">
                            ${stock.bollingerUpper?.toFixed(0) || "-"}
                          </span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-negative">
                            ${stock.bollingerLower?.toFixed(0) || "-"}
                          </span>
                        </div>
                      </div>
                    </IndicatorTooltip>
                    <IndicatorTooltip indicator="rsi" value={stock.rsi}>
                      <div className="bg-secondary/50 rounded-xl p-4">
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                          RSI (14)
                        </div>
                        <div
                          className={cn(
                            "text-lg font-mono font-bold",
                            stock.rsi > 70
                              ? "text-negative"
                              : stock.rsi < 30
                              ? "text-positive"
                              : "text-foreground"
                          )}
                        >
                          {stock.rsi.toFixed(1)}
                        </div>
                      </div>
                    </IndicatorTooltip>
                    <IndicatorTooltip indicator="shortFloat" value={`${stock.shortFloat.toFixed(1)}%`}>
                      <div className="bg-secondary/50 rounded-xl p-4">
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                          Short Float
                        </div>
                        <div
                          className={cn(
                            "text-lg font-mono font-bold",
                            stock.shortFloat > 20 ? "text-negative" : "text-foreground"
                          )}
                        >
                          {stock.shortFloat.toFixed(1)}%
                        </div>
                      </div>
                    </IndicatorTooltip>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
