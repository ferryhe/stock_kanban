import { StockData, removeTickerFromWatchlist, pinTickerToTop, moveTickerToBottom } from "@/lib/stockApi";
import { ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { IndicatorTooltip } from "./IndicatorTooltip";
import { QuantMetricsDisplay } from "./QuantMetricsDisplay";
import { SignalBadge } from "./SignalBadge";
import { useI18n } from "@/lib/i18n";
import { useState, useRef, useCallback } from "react";
import { StockContextMenu } from "./StockContextMenu";

interface StockCardProps {
  stock: StockData;
  index: number;
  onClick?: () => void;
  watchlistId?: string; // Add watchlist ID for deletion
  onDelete?: () => void; // Callback after deletion
  onManage?: () => void; // Callback to open watchlist manager
}

export function StockCard({ stock, index, onClick, watchlistId, onDelete, onManage }: StockCardProps) {
  const isPositive = stock.changePercent >= 0;
  const rsiTag = stock.tags.find((tag) => tag.value?.toLowerCase().includes("rsi"));
  const trendTag = stock.tags.find((tag) => tag.label.toLowerCase().includes("trend"));
  const showTrendIndicators = rsiTag || trendTag;
  const tagBadges = stock.tags.slice(0, 4);
  const { t } = useI18n();

  // Context menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleLongPressStart = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!watchlistId) return;


    longPressTimer.current = setTimeout(() => {
      // Calculate position for context menu (center horizontally, above the card)
      if (cardRef.current && typeof window !== "undefined") {
        const rect = cardRef.current.getBoundingClientRect();

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 8; // minimum distance from viewport edges
        const estimatedMenuHeight = 200; // rough estimate to decide above/below placement

        // Start with ideal position: centered horizontally, above the card
        let menuX = rect.left + rect.width / 2;
        let menuY = rect.top;

        // If there's not enough space above the card, place the menu below it instead
        const hasSpaceAbove = rect.top >= estimatedMenuHeight + margin;
        if (!hasSpaceAbove) {
          menuY = Math.min(rect.bottom, viewportHeight - margin);
        }

        // Clamp horizontal position within viewport bounds
        menuX = Math.min(Math.max(menuX, margin), viewportWidth - margin);
        // Clamp vertical position within viewport bounds
        menuY = Math.min(Math.max(menuY, margin), viewportHeight - margin);

        setMenuPosition({
          x: menuX,
          y: menuY,
        });
        setShowContextMenu(true);
      }
    }, 500); // 500ms long press
  }, [watchlistId]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

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

  const handlePinToTop = () => {
    if (watchlistId) {
      try {
        pinTickerToTop(watchlistId, stock.ticker);
        onDelete?.(); // Trigger refresh
      } catch (error) {
        console.error("Failed to pin stock:", error);
      }
    }
  };

  const handleMoveToBottom = () => {
    if (watchlistId) {
      try {
        moveTickerToBottom(watchlistId, stock.ticker);
        onDelete?.(); // Trigger refresh
      } catch (error) {
        console.error("Failed to move stock:", error);
      }
    }
  };

  const handleCardClick = () => {
    if (!showContextMenu && onClick) {
      onClick();
    }
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={cn(
          "bg-card/50 backdrop-blur-sm border border-border/50 p-4 rounded-xl shadow-sm transition-all",
          onClick && "cursor-pointer hover:border-primary/40 hover:bg-card/70 active:scale-[0.99]"
        )}
        onClick={handleCardClick}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
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

      {/* Context Menu */}
      <StockContextMenu
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        onDelete={handleDelete}
        onPinToTop={handlePinToTop}
        onMoveToBottom={handleMoveToBottom}
        onMore={() => {
          setShowContextMenu(false);
          onManage?.();
        }}
        position={menuPosition}
      />
    </>
  );
}
