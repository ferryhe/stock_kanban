import React from "react";
import { QuantMetrics } from "@/lib/stockApi";
import { Award, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { IndicatorTooltip } from "./IndicatorTooltip";

interface QuantMetricsDisplayProps {
  metrics?: QuantMetrics;
  compact?: boolean;
  macd?: number | null;
  trendIndicators?: React.ReactNode;
}

// 根据值获取颜色 - 只改变字体颜色，不改变背景
const getColorByValue = (value: number, type: 'vol' | 'dd' | 'return') => {
  switch (type) {
    case 'vol':
      // Vol60: 高于 1 是风险
      if (value > 1.5) return 'text-red-600 dark:text-red-400';
      if (value > 0.8) return 'text-orange-600 dark:text-orange-400';
      return 'text-green-600 dark:text-green-400';
    case 'dd':
      // MaxDD252: 更负表示风险更大
      if (value < -1.5) return 'text-red-600 dark:text-red-400';
      if (value < -0.5) return 'text-orange-600 dark:text-orange-400';
      return 'text-green-600 dark:text-green-400';
    case 'return':
      // Return: 正数好
      if (value > 0.1) return 'text-green-600 dark:text-green-400';
      if (value > 0.02) return 'text-blue-600 dark:text-blue-400';
      if (value < -0.05) return 'text-red-600 dark:text-red-400';
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
};

const getSignalClass = (signal: string) => {
  switch (signal) {
    case "BUY":
      return "bg-positive/10 text-positive border-positive/20";
    case "SELL":
      return "bg-negative/10 text-negative border-negative/20";
    case "RISK_ALERT":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export function QuantMetricsDisplay({ metrics, compact = false, macd, trendIndicators }: QuantMetricsDisplayProps) {
  if (!metrics) return null;

  if (compact) {
    // ??????????????- ??????????????????
    return (
      <div className="space-y-3">
        {(metrics.rank !== undefined || metrics.score !== undefined || metrics.signal) && (
          <div className="grid grid-cols-3 gap-3">
            {metrics.rank !== undefined && (
              <IndicatorTooltip indicator="rank" value={metrics.rank.toString()}>
                <div className={cn(
                  "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-full text-xs font-medium font-mono border h-full",
                  metrics.rank <= 3 
                    ? "bg-positive/10 text-positive border-positive/20" 
                    : metrics.rank <= 5 
                    ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    : "bg-muted text-muted-foreground border-border"
                )}>
                  <Award className="w-3 h-3" />
                  <span>R{metrics.rank}</span>
                </div>
              </IndicatorTooltip>
            )}

            {metrics.score !== undefined && metrics.score !== null && (
              <IndicatorTooltip indicator="score" value={metrics.score.toFixed(3)}>
                <div className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-full text-xs font-medium font-mono border h-full bg-muted text-muted-foreground border-border">
                  <Hash className="w-3 h-3" />
                  <span>{metrics.score.toFixed(3)}</span>
                </div>
              </IndicatorTooltip>
            )}

            {metrics.signal && (
              <IndicatorTooltip indicator="signal" value={metrics.signal}>
                <div className={cn(
                  "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-full text-xs font-medium font-mono border h-full",
                  getSignalClass(metrics.signal)
                )}>
                  <span>{metrics.signal === "BUY" ? "^" : metrics.signal === "SELL" ? "v" : metrics.signal === "RISK_ALERT" ? "!" : "="}</span>
                  <span>{metrics.signal}</span>
                </div>
              </IndicatorTooltip>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {metrics.predictedReturn !== undefined && (
            <IndicatorTooltip indicator="predictedReturn" value={`${(metrics.predictedReturn * 100).toFixed(2)}%`}>
              <div className="bg-secondary/50 rounded-xl p-4 h-full">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                  Predicted Return (20d)
                </div>
                <div className={cn(
                  "text-lg font-mono font-bold",
                  getColorByValue(metrics.predictedReturn, 'return')
                )}>
                  {(metrics.predictedReturn * 100).toFixed(2)}%
                </div>
              </div>
            </IndicatorTooltip>
          )}

          {metrics.risk?.vol60 !== undefined && (
            <IndicatorTooltip indicator="vol60" value={metrics.risk.vol60.toFixed(2)}>
              <div className="bg-secondary/50 rounded-xl p-4 h-full">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                  60-Day Volatility
                </div>
                <div className={cn(
                  "text-lg font-mono font-bold",
                  getColorByValue(metrics.risk.vol60, 'vol')
                )}>
                  {metrics.risk.vol60.toFixed(2)}
                </div>
              </div>
            </IndicatorTooltip>
          )}

          {metrics.risk?.maxdd252 !== undefined && (
            <IndicatorTooltip indicator="maxdd252" value={metrics.risk.maxdd252.toFixed(2)}>
              <div className="bg-secondary/50 rounded-xl p-4 h-full">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">
                  Max Drawdown (252d)
                </div>
                <div className={cn(
                  "text-lg font-mono font-bold",
                  getColorByValue(metrics.risk.maxdd252, 'dd')
                )}>
                  {metrics.risk.maxdd252.toFixed(2)}
                </div>
              </div>
            </IndicatorTooltip>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border/50">
      {/* 顶行：Rank, Signal - 按钮形式 */}
      <div className="grid grid-cols-3 gap-1.5">
        {metrics.rank !== undefined && (
          <IndicatorTooltip indicator="rank" value={metrics.rank.toString()}>
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium font-mono border",
              metrics.rank <= 3 
                ? "bg-positive/10 text-positive border-positive/20" 
                : metrics.rank <= 5 
                ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                : "bg-muted text-muted-foreground border-border"
            )}>
              <Award className="w-3 h-3" />
              <span>R{metrics.rank}</span>
            </div>
          </IndicatorTooltip>
        )}

        {metrics.signal && (
          <IndicatorTooltip indicator="signal" value={metrics.signal}>
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
              getSignalClass(metrics.signal)
            )}>
              {metrics.signal === "BUY" ? "^" : metrics.signal === "SELL" ? "v" : metrics.signal === "RISK_ALERT" ? "!" : "="} 
              <span>{metrics.signal}</span>
            </div>
          </IndicatorTooltip>
        )}

        {macd !== undefined && macd !== null && (
          <IndicatorTooltip indicator="macd" value={macd.toFixed(2)}>
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border font-mono",
              macd >= 0 ? "bg-positive/10 text-positive border-positive/20" : "bg-negative/10 text-negative border-negative/20"
            )}>
              <span>MACD</span>
              <span className="opacity-70">{macd.toFixed(2)}</span>
            </div>
          </IndicatorTooltip>
        )}
      </div>

      {trendIndicators && (
        <div className="mt-1.5">
          {trendIndicators}
        </div>
      )}

      {/* Risk Metrics - 平行分布 */}
      {(metrics.risk?.vol60 !== undefined || metrics.risk?.maxdd252 !== undefined || metrics.predictedReturn !== undefined) && (
        <div className="grid grid-cols-3 gap-4">
          {metrics.risk?.vol60 !== undefined && (
            <IndicatorTooltip indicator="vol60" value={metrics.risk.vol60.toFixed(2)}>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">Vol60</div>
                <div className={cn("text-sm font-mono font-medium", getColorByValue(metrics.risk.vol60, 'vol'))}>
                  {metrics.risk.vol60.toFixed(2)}
                </div>
              </div>
            </IndicatorTooltip>
          )}

          {metrics.risk?.maxdd252 !== undefined && (
            <IndicatorTooltip indicator="maxdd252" value={metrics.risk.maxdd252.toFixed(2)}>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">MaxDD</div>
                <div className={cn("text-sm font-mono font-medium", getColorByValue(metrics.risk.maxdd252, 'dd'))}>
                  {metrics.risk.maxdd252.toFixed(2)}
                </div>
              </div>
            </IndicatorTooltip>
          )}

          {metrics.predictedReturn !== undefined && (
            <IndicatorTooltip indicator="predictedReturn" value={`${(metrics.predictedReturn * 100).toFixed(2)}%`}>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">20DRet</div>
                <div className={cn("text-sm font-mono font-medium", getColorByValue(metrics.predictedReturn, 'return'))}>
                  {(metrics.predictedReturn * 100).toFixed(2)}%
                </div>
              </div>
            </IndicatorTooltip>
          )}
        </div>
      )}
    </div>
  );
}
