import { StockData, removeTickerFromWatchlist } from "@/lib/stockApi";
import { ArrowUp, ArrowDown, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, PanInfo, useMotionValue, useTransform, animate } from "framer-motion";
import { IndicatorTooltip } from "./IndicatorTooltip";
import { QuantMetricsDisplay } from "./QuantMetricsDisplay";
import { SignalBadge } from "./SignalBadge";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";

interface StockCardProps {
  stock: StockData;
  index: number;
  onClick?: () => void;
  watchlistId?: string; // Add watchlist ID for deletion
  onDelete?: () => void; // Callback after deletion
}

export function StockCard({ stock, index, onClick, watchlistId, onDelete }: StockCardProps) {
  const isPositive = stock.changePercent >= 0;
  const rsiTag = stock.tags.find((tag) => tag.value?.toLowerCase().includes("rsi"));
  const trendTag = stock.tags.find((tag) => tag.label.toLowerCase().includes("trend"));
  const showTrendIndicators = rsiTag || trendTag;
  const tagBadges = stock.tags.slice(0, 4);
  const { t } = useI18n();

  // Swipe-to-delete state
  const [showDelete, setShowDelete] = useState(false);
  const x = useMotionValue(0);
  const deleteButtonOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = -80;
    if (info.offset.x < threshold) {
      setShowDelete(true);
      animate(x, -100);
    } else {
      setShowDelete(false);
      animate(x, 0);
    }
  };

  const handleDelete = () => {
    if (watchlistId) {
      try {
        removeTickerFromWatchlist(watchlistId, stock.ticker);
        onDelete?.();
      } catch (error) {
        console.error("Failed to delete stock:", error);
      }
    }
  };

  const handleCardClick = () => {
    if (!showDelete && onClick) {
      onClick();
    }
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        style={{ x }}
        drag={watchlistId ? "x" : false}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={cn(
          "bg-card/50 backdrop-blur-sm border border-border/50 p-4 rounded-xl shadow-sm transition-all relative z-10",
          onClick && "cursor-pointer hover:border-primary/40 hover:bg-card/70 active:scale-[0.99]"
        )}
        onClick={handleCardClick}
        data-testid={`stock-card-${stock.ticker}`}
      >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold font-mono tracking-tight text-foreground">{stock.ticker}</h3>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate max-w-[150px]">
            {stock.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-bold font-mono text-foreground">
              ${stock.price.toFixed(2)}
            </div>
            <div className={cn("flex items-center justify-end gap-1 text-sm font-mono font-medium", isPositive ? "text-positive" : "text-negative")}>
              {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(stock.changePercent).toFixed(2)}%
            </div>
          </div>
          {onClick && (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        {stock.quant ? (
          <QuantMetricsDisplay
            metrics={stock.quant}
            macd={stock.macd}
            trendIndicators={showTrendIndicators ? (
              <div className="grid grid-cols-2 gap-2">
                {rsiTag && (
                  <SignalBadge
                    type={rsiTag.type}
                    label={rsiTag.label}
                    value={rsiTag.value}
                    indicator="rsi"
                  />
                )}
                {trendTag && (
                  <SignalBadge
                    type={trendTag.type}
                    label={trendTag.label}
                    value={trendTag.value}
                    indicator="trend"
                  />
                )}
              </div>
            ) : undefined}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagBadges.map((tag) => (
              <SignalBadge key={`${tag.label}-${tag.value ?? ""}`} type={tag.type} label={tag.label} value={tag.value} />
            ))}
            {stock.tags.length > 4 && (
              <div className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-mono">
                +{stock.tags.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-4">
        <IndicatorTooltip indicator="volume" value={`${(stock.volume / 1000000).toFixed(1)}M / ${(stock.avgVolume / 1000000).toFixed(1)}M`}>
          <div>
              <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">{t("volAvg")}</div>
              <div className="text-sm font-mono text-foreground">
                  {(stock.volume / 1000000).toFixed(1)}M <span className="text-muted-foreground">/ {(stock.avgVolume / 1000000).toFixed(1)}M</span>
              </div>
          </div>
        </IndicatorTooltip>
        <IndicatorTooltip indicator="rsi" value={stock.rsi}>
          <div>
              <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">{t("rsi14")}</div>
              <div className={cn("text-sm font-mono font-medium", 
                  stock.rsi > 70 ? "text-negative" : stock.rsi < 30 ? "text-positive" : "text-foreground"
              )}>
                  {stock.rsi.toFixed(1)}
              </div>
          </div>
        </IndicatorTooltip>
        <IndicatorTooltip indicator="shortFloat" value={`${stock.shortFloat.toFixed(1)}%`}>
          <div>
              <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">{t("shortFloat")}</div>
              <div className={cn("text-sm font-mono font-medium", 
                  stock.shortFloat > 20 ? "text-negative" : "text-foreground"
              )}>
                  {stock.shortFloat.toFixed(1)}%
              </div>
          </div>
        </IndicatorTooltip>
      </div>
    </motion.div>

      {/* Delete Button */}
      {watchlistId && (
        <motion.button
          style={{ opacity: deleteButtonOpacity }}
          onClick={handleDelete}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-negative text-white p-3 rounded-lg z-0 pointer-events-auto"
          data-testid={`delete-${stock.ticker}`}
          tabIndex={showDelete ? 0 : -1}
          aria-hidden={!showDelete}
        >
          <Trash2 className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}
