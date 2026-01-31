import { useState, useEffect } from "react";
import { useAvailableLeaderboards, useLeaderboardData } from "@/lib/stockApi";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence, PanInfo, useMotionValue, animate } from "framer-motion";
import { Trophy, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardPanelProps {
  onStockClick: (ticker: string) => void;
}

const MedalIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return <Trophy className="w-4 h-4 text-yellow-500" fill="currentColor" />;
  }
  if (rank === 2) {
    return <Trophy className="w-4 h-4 text-gray-400" fill="currentColor" />;
  }
  if (rank === 3) {
    return <Trophy className="w-4 h-4 text-amber-700" fill="currentColor" />;
  }
  return null;
};

export function LeaderboardPanel({ onStockClick }: LeaderboardPanelProps) {
  const { leaderboard, lang } = useI18n();
  const { data: availableMarkets, isLoading: marketsLoading } = useAvailableLeaderboards();
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [selectedMarketIndex, setSelectedMarketIndex] = useState(0);
  const x = useMotionValue(0);

  // Set initial market when data loads
  useEffect(() => {
    if (!selectedMarket && availableMarkets && availableMarkets.length > 0) {
      setSelectedMarket(availableMarkets[0]);
      setSelectedMarketIndex(0);
    }
  }, [availableMarkets, selectedMarket]);

  const handleSwipe = (marketIndex: number) => {
    if (availableMarkets && marketIndex >= 0 && marketIndex < availableMarkets.length) {
      setSelectedMarket(availableMarkets[marketIndex]);
      setSelectedMarketIndex(marketIndex);
      animate(x, 0);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && selectedMarketIndex > 0) {
      // Swipe right - go to previous market
      handleSwipe(selectedMarketIndex - 1);
    } else if (info.offset.x < -threshold && availableMarkets && selectedMarketIndex < availableMarkets.length - 1) {
      // Swipe left - go to next market
      handleSwipe(selectedMarketIndex + 1);
    } else {
      animate(x, 0);
    }
  };

  const { data: leaderboardData, isLoading: dataLoading } = useLeaderboardData(
    selectedMarket,
    !!selectedMarket
  );

  const getMarketLabel = (market: string) => {
    if (market === "us") return leaderboard.usStocks;
    if (market === "cn") return leaderboard.cnStocks;
    if (market === "hk") return leaderboard.hkStocks;
    return market.toUpperCase();
  };

  const formatUpdateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatReturn = (value: number) => {
    const percentage = (value * 100).toFixed(2);
    return value >= 0 ? `+${percentage}%` : `${percentage}%`;
  };

  if (marketsLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-32 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{leaderboard.loading}</p>
        </div>
      </div>
    );
  }

  if (!availableMarkets || availableMarkets.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-32 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{leaderboard.noData}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 relative overflow-hidden font-sans">
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none mix-blend-overlay"
        style={{ 
          backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          backgroundRepeat: 'repeat'
        }}
      />
      
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold tracking-tight mb-3">
            {leaderboard.title}
          </h1>
          
          {/* Market Switcher */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {availableMarkets.map((market, index) => (
              <button
                key={market}
                onClick={() => handleSwipe(index)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  selectedMarket === market
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {getMarketLabel(market)}
              </button>
            ))}
          </div>
          
          {/* Update Time */}
          {leaderboardData && (
            <div className="mt-2 text-right">
              <span className="text-xs text-muted-foreground">
                {leaderboard.updated}: {formatUpdateTime(leaderboardData.updateTime)}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 relative z-10">
        <motion.div
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -50, right: 50 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="wait">
            {dataLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-muted-foreground"
            >
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm font-mono">{leaderboard.loading}</p>
            </motion.div>
          ) : leaderboardData && leaderboardData.entries.length > 0 ? (
            <motion.div
              key="data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {leaderboardData.entries.map((entry, index) => (
                <motion.button
                  key={entry.ticker}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onStockClick(entry.ticker)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/30 hover:border-border transition-all group"
                >
                  {/* Rank & Medal */}
                  <div className="flex items-center gap-2 w-12 flex-shrink-0">
                    <MedalIcon rank={entry.rank} />
                    <span className={cn(
                      "font-mono font-bold text-sm",
                      entry.rank <= 3 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {entry.rank}
                    </span>
                  </div>

                  {/* Stock Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-mono font-bold text-sm text-foreground">
                      {entry.ticker}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {entry.longName}
                    </div>
                  </div>

                  {/* Predicted Return */}
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "font-mono font-bold text-sm px-2 py-1 rounded",
                      entry.predictedReturn >= 0
                        ? "text-positive bg-positive/10"
                        : "text-negative bg-negative/10"
                    )}>
                      {formatReturn(entry.predictedReturn)}
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="no-data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-muted-foreground"
            >
              <p className="text-sm">{leaderboard.noData}</p>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
