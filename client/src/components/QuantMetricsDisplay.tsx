import React from "react";
import { QuantMetrics } from "@/lib/stockApi";
import { TrendingUp, AlertTriangle, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { IndicatorTooltip } from "./IndicatorTooltip";

interface QuantMetricsDisplayProps {
  metrics?: QuantMetrics;
}

export function QuantMetricsDisplay({ metrics }: QuantMetricsDisplayProps) {
  if (!metrics) return null;

  return (
    <div className="space-y-3 pt-2 border-t border-border/50">
      {/* Rank and Score */}
      <div className="flex gap-2 flex-wrap">
        {metrics.rank !== undefined && (
          <IndicatorTooltip indicator="rank" value={metrics.rank.toString()}>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-mono border",
              metrics.rank <= 3 
                ? "bg-positive/10 text-positive border-positive/20" 
                : metrics.rank <= 5 
                ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                : "bg-muted text-muted-foreground border-border"
            )}>
              <Award className="w-3 h-3" />
              <span>Rank {metrics.rank}</span>
            </div>
          </IndicatorTooltip>
        )}

        {metrics.score !== null && metrics.score !== undefined && (
          <IndicatorTooltip indicator="score" value={metrics.score.toFixed(2)}>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-mono bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="w-3 h-3" />
              <span>Score {metrics.score.toFixed(2)}</span>
            </div>
          </IndicatorTooltip>
        )}
      </div>

      {/* Status Bucket */}
      {metrics.status?.bucket && (
        <IndicatorTooltip indicator="bucket" value={metrics.status.bucket}>
          <div className={cn(
            "inline-flex px-2.5 py-1 rounded-full text-xs font-medium border",
            metrics.status.bucket === "LONG"
              ? "bg-positive/10 text-positive border-positive/20"
              : metrics.status.bucket === "SHORT"
              ? "bg-negative/10 text-negative border-negative/20"
              : "bg-muted text-muted-foreground border-border"
          )}>
            {metrics.status.bucket}
          </div>
        </IndicatorTooltip>
      )}

      {/* Risk Metrics */}
      {(metrics.risk?.vol60 !== undefined || metrics.risk?.maxdd252 !== undefined) && (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Risk Metrics
            </span>
          </div>

          {metrics.risk?.vol60 !== undefined && (
            <IndicatorTooltip indicator="vol60" value={metrics.risk.vol60.toFixed(2)}>
              <div className={cn(
                "flex justify-between items-center px-2 py-1 rounded text-xs font-mono",
                "bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer",
                Math.abs(metrics.risk.vol60) > 1 
                  ? "text-orange-600 dark:text-orange-400" 
                  : "text-muted-foreground"
              )}>
                <span>Vol60 (z-score)</span>
                <span>{metrics.risk.vol60.toFixed(2)}</span>
              </div>
            </IndicatorTooltip>
          )}

          {metrics.risk?.maxdd252 !== undefined && (
            <IndicatorTooltip indicator="maxdd252" value={metrics.risk.maxdd252.toFixed(2)}>
              <div className={cn(
                "flex justify-between items-center px-2 py-1 rounded text-xs font-mono",
                "bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer",
                metrics.risk.maxdd252 > 0.5
                  ? "text-negative" 
                  : metrics.risk.maxdd252 < -0.5
                  ? "text-positive"
                  : "text-muted-foreground"
              )}>
                <span>MaxDD252 (z-score)</span>
                <span>{metrics.risk.maxdd252.toFixed(2)}</span>
              </div>
            </IndicatorTooltip>
          )}
        </div>
      )}

      {/* Predicted Return */}
      {metrics.predictedReturn !== undefined && (
        <IndicatorTooltip indicator="predictedReturn" value={`${(metrics.predictedReturn * 100).toFixed(2)}%`}>
          <div className={cn(
            "flex justify-between items-center px-2.5 py-1 rounded text-xs font-mono",
            "bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer border border-border/50",
            metrics.predictedReturn > 0.05
              ? "text-positive"
              : metrics.predictedReturn < -0.05
              ? "text-negative"
              : "text-muted-foreground"
          )}>
            <span>Pred. Return (20d)</span>
            <span>{(metrics.predictedReturn * 100).toFixed(2)}%</span>
          </div>
        </IndicatorTooltip>
      )}
    </div>
  );
}
