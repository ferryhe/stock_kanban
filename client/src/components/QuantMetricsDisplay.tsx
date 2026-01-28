import React from "react";
import { QuantMetrics } from "@/lib/stockApi";
import { Award, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { IndicatorTooltip } from "./IndicatorTooltip";

interface QuantMetricsDisplayProps {
  metrics?: QuantMetrics;
  compact?: boolean;
}

// 根据值获取颜色
const getColorByValue = (value: number, type: 'vol' | 'dd' | 'return') => {
  switch (type) {
    case 'vol':
      // Vol60: 高于 1 是风险
      if (value > 1.5) return 'text-red-600 dark:text-red-400 bg-red-500/10';
      if (value > 0.8) return 'text-orange-600 dark:text-orange-400 bg-orange-500/10';
      return 'text-green-600 dark:text-green-400 bg-green-500/10';
    case 'dd':
      // MaxDD252: 更负表示风险更大
      if (value < -1.5) return 'text-red-600 dark:text-red-400 bg-red-500/10';
      if (value < -0.5) return 'text-orange-600 dark:text-orange-400 bg-orange-500/10';
      return 'text-green-600 dark:text-green-400 bg-green-500/10';
    case 'return':
      // Return: 正数好
      if (value > 0.1) return 'text-green-600 dark:text-green-400 bg-green-500/10';
      if (value > 0.02) return 'text-blue-600 dark:text-blue-400 bg-blue-500/10';
      if (value < -0.05) return 'text-red-600 dark:text-red-400 bg-red-500/10';
      return 'text-muted-foreground bg-muted/30';
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

export function QuantMetricsDisplay({ metrics, compact = false }: QuantMetricsDisplayProps) {
  if (!metrics) return null;

  if (compact) {
    // 紧凑模式用于详细页
    return (
      <div className="space-y-3">
        {/* 顶行：Rank, Signal */}
        <div className="flex gap-2 flex-wrap">
          {metrics.rank !== undefined && (
            <IndicatorTooltip indicator="rank" value={metrics.rank.toString()}>
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium font-mono border",
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
                "px-2 py-1 rounded text-xs font-medium border flex items-center gap-1",
                getSignalClass(metrics.signal)
              )}>
                {metrics.signal === "BUY" ? "↑" : metrics.signal === "SELL" ? "↓" : metrics.signal === "RISK_ALERT" ? "!" : "="} {metrics.signal}
              </div>
            </IndicatorTooltip>
          )}
        </div>

        {/* 详情部分 */}
        <div className="space-y-2">
          {/* Vol & DD 一行 */}
          <div className="flex gap-2">
            {metrics.risk?.vol60 !== undefined && (
              <IndicatorTooltip indicator="vol60" value={metrics.risk.vol60.toFixed(2)}>
                <div className={cn(
                  "flex-1 flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono border",
                  "transition-colors cursor-pointer",
                  getColorByValue(metrics.risk.vol60, 'vol'),
                  "border-current/20"
                )}>
                  <span className="font-medium">Vol60</span>
                  <span className="font-semibold">{metrics.risk.vol60.toFixed(1)}</span>
                </div>
              </IndicatorTooltip>
            )}

            {metrics.risk?.maxdd252 !== undefined && (
              <IndicatorTooltip indicator="maxdd252" value={metrics.risk.maxdd252.toFixed(2)}>
                <div className={cn(
                  "flex-1 flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono border",
                  "transition-colors cursor-pointer",
                  getColorByValue(metrics.risk.maxdd252, 'dd'),
                  "border-current/20"
                )}>
                  <span className="font-medium">MaxDD</span>
                  <span className="font-semibold">{metrics.risk.maxdd252.toFixed(1)}</span>
                </div>
              </IndicatorTooltip>
            )}
          </div>

          {/* Return */}
          {metrics.predictedReturn !== undefined && (
            <IndicatorTooltip indicator="predictedReturn" value={`${(metrics.predictedReturn * 100).toFixed(2)}%`}>
              <div className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono border",
                "transition-colors cursor-pointer",
                getColorByValue(metrics.predictedReturn, 'return'),
                "border-current/20"
              )}>
                <span className="font-medium flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  20dReturn
                </span>
                <span className="font-semibold">{(metrics.predictedReturn * 100).toFixed(2)}%</span>
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
      <div className="flex gap-1.5 flex-wrap">
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
              {metrics.signal === "BUY" ? "↑" : metrics.signal === "SELL" ? "↓" : metrics.signal === "RISK_ALERT" ? "!" : "="} 
              <span>{metrics.signal}</span>
            </div>
          </IndicatorTooltip>
        )}
      </div>

      {/* Risk Metrics - 平行分布 */}
      {(metrics.risk?.vol60 !== undefined || metrics.risk?.maxdd252 !== undefined || metrics.predictedReturn !== undefined) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {metrics.risk?.vol60 !== undefined && (
            <IndicatorTooltip indicator="vol60" value={metrics.risk.vol60.toFixed(2)}>
              <div className={cn(
                "flex flex-col items-center justify-center py-2 px-1.5 rounded text-xs border",
                "transition-colors cursor-pointer font-mono",
                getColorByValue(metrics.risk.vol60, 'vol'),
                "border-current/20"
              )}>
                <span className="font-medium text-[10px] opacity-70 uppercase">Vol60</span>
                <span className="font-bold text-sm">{metrics.risk.vol60.toFixed(1)}</span>
              </div>
            </IndicatorTooltip>
          )}

          {metrics.risk?.maxdd252 !== undefined && (
            <IndicatorTooltip indicator="maxdd252" value={metrics.risk.maxdd252.toFixed(2)}>
              <div className={cn(
                "flex flex-col items-center justify-center py-2 px-1.5 rounded text-xs border",
                "transition-colors cursor-pointer font-mono",
                getColorByValue(metrics.risk.maxdd252, 'dd'),
                "border-current/20"
              )}>
                <span className="font-medium text-[10px] opacity-70 uppercase">MaxDD</span>
                <span className="font-bold text-sm">{metrics.risk.maxdd252.toFixed(1)}</span>
              </div>
            </IndicatorTooltip>
          )}

          {metrics.predictedReturn !== undefined && (
            <IndicatorTooltip indicator="predictedReturn" value={`${(metrics.predictedReturn * 100).toFixed(2)}%`}>
              <div className={cn(
                "flex flex-col items-center justify-center py-2 px-1.5 rounded text-xs border",
                "transition-colors cursor-pointer font-mono",
                getColorByValue(metrics.predictedReturn, 'return'),
                "border-current/20"
              )}>
                <span className="font-medium text-[10px] opacity-70 uppercase">20dRet</span>
                <span className="font-bold text-sm">{(metrics.predictedReturn * 100).toFixed(1)}%</span>
              </div>
            </IndicatorTooltip>
          )}
        </div>
      )}
    </div>
  );
}
