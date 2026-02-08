import { useState, useEffect, useCallback, useMemo } from "react";
import { useStockData, useMarketOverview, isMarketOpen, getCurrentETTime, StockData, subscribeToWatchlistChanges, getWatchlistsArray, useAvailableLeaderboards } from "@/lib/stockApi";
import { StockCard } from "@/components/StockCard";
import { StockDetailModal } from "@/components/StockDetailModal";
import { WatchlistManager } from "@/components/WatchlistManager";
import { WatchlistSearchBox } from "@/components/WatchlistSearchBox";
import { BottomNav } from "@/components/BottomNav";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
// import generatedImage from "@assets/generated_images/subtle_dark_tactical_grid_background.png";
import { Loader2, Settings2, RefreshCw, FlaskConical, BarChart3, History, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

const LEADERBOARD_ID = "__leaderboard__";

interface MarketTickerProps {
  symbol: string;
  label: string;
  price: number;
  change: number;
}

const MarketTicker = ({ symbol, label, price, change }: MarketTickerProps) => {
  const isPositive = change >= 0;

  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono font-bold">${price.toFixed(2)}</span>
        <span className={cn("text-[10px] font-mono font-medium px-1 rounded", 
          isPositive ? "text-positive bg-positive/10" : "text-negative bg-negative/10"
        )}>
          {isPositive ? "+" : ""}{change.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [activeWatchlist, setActiveWatchlist] = useState<string>(LEADERBOARD_ID);
  const [marketOpen, setMarketOpen] = useState(isMarketOpen());
  const [currentTime, setCurrentTime] = useState(getCurrentETTime());
  const [watchlistVersion, forceUpdate] = useState(0);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const { lang, setLang, t } = useI18n();
  const queryClient = useQueryClient();

  // Check if leaderboards are available
  const { data: availableLeaderboards } = useAvailableLeaderboards();
  const hasLeaderboards = availableLeaderboards && availableLeaderboards.length > 0;

  // Get fresh watchlist data, recomputed when watchlistVersion changes
  const availableWatchlists = useMemo(() => getWatchlistsArray(), [watchlistVersion]);
  
  // Initialize activeWatchlist once we have the watchlists
  useEffect(() => {
    // Wait for leaderboards to finish loading before deciding fallback
    if (availableLeaderboards === undefined) return;
    if (hasLeaderboards) return;

    if (activeWatchlist === LEADERBOARD_ID && availableWatchlists.length > 0) {
      setActiveWatchlist(availableWatchlists[0].id);
    }
  }, [availableWatchlists, activeWatchlist, availableLeaderboards, hasLeaderboards]);

  const { data: stocks, isLoading, refetch, isFetching, error } = useStockData(activeWatchlist);
  const { data: marketData } = useMarketOverview();

  const isLeaderboardView = activeWatchlist === LEADERBOARD_ID;

  const refreshWatchlists = useCallback(() => {
    const currentWatchlists = getWatchlistsArray();
    const activeExists = currentWatchlists.some(w => w.id === activeWatchlist);
    if (!activeExists && currentWatchlists.length > 0 && activeWatchlist !== LEADERBOARD_ID) {
      setActiveWatchlist(currentWatchlists[0].id);
    }
    forceUpdate(n => n + 1);
    refetch();
  }, [refetch, activeWatchlist]);

  // Handle swipe navigation between tabs
  const handleSwipeNavigation = useCallback((deltaX: number) => {
    // Create array of all tabs including leaderboard if available
    const allTabs = hasLeaderboards 
      ? [LEADERBOARD_ID, ...availableWatchlists.map(w => w.id)]
      : availableWatchlists.map(w => w.id);
    
    const currentIndex = allTabs.findIndex(id => id === activeWatchlist);
    
    if (deltaX > 0 && currentIndex > 0) {
      // Swipe right - go to previous tab
      setActiveWatchlist(allTabs[currentIndex - 1]);
    } else if (deltaX < 0 && currentIndex < allTabs.length - 1) {
      // Swipe left - go to next tab
      setActiveWatchlist(allTabs[currentIndex + 1]);
    }
  }, [hasLeaderboards, availableWatchlists, activeWatchlist]);

  useEffect(() => {
    const unsubscribe = subscribeToWatchlistChanges(refreshWatchlists);
    return unsubscribe;
  }, [refreshWatchlists]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["stocks", activeWatchlist] });
  }, [lang, activeWatchlist, queryClient]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentETTime());
      setMarketOpen(isMarketOpen());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Define market indices to rotate through
  const marketIndices = useMemo(() => {
    if (!marketData) return [];
    
    return [
      { symbol: "SPY", label: "S&P 500", price: marketData.spy.price, change: marketData.spy.change },
      { symbol: "^IXIC", label: "NASDAQ", price: marketData.nasdaq?.price || 0, change: marketData.nasdaq?.change || 0 },
      { symbol: "000001.SS", label: lang === "zh" ? "上证指数" : "Shanghai A", price: marketData.shanghaiA?.price || 0, change: marketData.shanghaiA?.change || 0 },
      { symbol: "399001.SZ", label: lang === "zh" ? "深证成指" : "Shenzhen A", price: marketData.shenzhenA?.price || 0, change: marketData.shenzhenA?.change || 0 },
      { symbol: "^HSI", label: lang === "zh" ? "恒生指数" : "Hong Kong HSI", price: marketData.hsi?.price || 0, change: marketData.hsi?.change || 0 },
    ].filter(idx => idx.price > 0); // Only show indices with valid data
  }, [marketData, lang]);

  // Rotate market index every 10 seconds
  useEffect(() => {
    if (marketIndices.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentMarketIndex((prev) => (prev + 1) % marketIndices.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [marketIndices]);

  const currentMarketIndexData = marketIndices[currentMarketIndex] || marketIndices[0];

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
      
      {!isLeaderboardView && (
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 py-4">
          <div className="max-w-md mx-auto flex justify-between items-center gap-4">
              <div className="flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLang(lang === "en" ? "zh" : "en")}
                      className="px-2 py-1 rounded-full border border-border text-[10px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      data-testid="lang-toggle"
                    >
                      {t("langToggle")}
                    </button>
                    <h1 className="text-lg font-bold tracking-tight">Quant<span className="text-primary/60">Dash</span></h1>
                  </div>
                  <div className="flex items-center gap-1.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full", 
                        isFetching ? "bg-warning animate-pulse" : marketOpen ? "bg-positive" : "bg-muted-foreground"
                      )} />
                      <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                        {currentTime} ET
                      </span>
                  </div>
              </div>
              
              <div className="flex items-center gap-4">
                  <div className="flex gap-6 border-l border-border/50 pl-6 overflow-x-auto no-scrollbar">
                      {currentMarketIndexData && (
                        <MarketTicker 
                          symbol={currentMarketIndexData.symbol} 
                          label={currentMarketIndexData.label} 
                          price={currentMarketIndexData.price}
                          change={currentMarketIndexData.change}
                        />
                      )}
                      <MarketTicker 
                        symbol="VIX" 
                        label={t("volatility")} 
                        price={marketData?.vix.price || 0}
                        change={marketData?.vix.change || 0}
                      />
                  </div>
                  <button 
                    onClick={() => refetch()}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    disabled={isFetching}
                    data-testid="refresh-button"
                  >
                    <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
                  </button>
                  <Link
                    href="/backtest"
                    className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    data-testid="backtest-link"
                    title="Backtest Center"
                  >
                    <FlaskConical className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/compare"
                    className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    data-testid="compare-link"
                    title="Algorithm Compare"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/backtest/history"
                    className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    data-testid="backtest-history-link"
                    title="Backtest History"
                  >
                    <History className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/live"
                    className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    data-testid="live-link"
                    title="Live Paper Trading"
                  >
                    <Activity className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => setIsManagerOpen(true)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    data-testid="settings-button"
                  >
                    <Settings2 className="w-5 h-5" />
                  </button>
              </div>
          </div>
        </header>
      )}

      <WatchlistManager
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        activeWatchlist={activeWatchlist}
      />

      {isLeaderboardView ? (
        <div
          onTouchStart={(e) => {
            const touch = e.touches[0];
            setTouchStart({ x: touch.clientX, y: touch.clientY });
          }}
          onTouchEnd={(e) => {
            if (!touchStart) return;
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStart.x;
            const deltaY = touch.clientY - touchStart.y;
            
            // Only trigger swipe if horizontal movement is dominant
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
              handleSwipeNavigation(deltaX);
            }
            
            setTouchStart(null);
          }}
        >
          <LeaderboardPanel onStockClick={(ticker) => setSelectedStock({ ticker } as StockData)} />
        </div>
      ) : (
        <main 
          className="max-w-md mx-auto px-4 py-6 relative z-10"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            setTouchStart({ x: touch.clientX, y: touch.clientY });
          }}
          onTouchEnd={(e) => {
            if (!touchStart) return;
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStart.x;
            const deltaY = touch.clientY - touchStart.y;
            
            // Only trigger swipe if horizontal movement is dominant
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
              handleSwipeNavigation(deltaX);
            }
            
            setTouchStart(null);
          }}
        >
          {/* Search Box for Adding Stocks */}
          <div className="mb-4">
            <WatchlistSearchBox 
              watchlistId={activeWatchlist} 
              onStockAdded={() => refetch()} 
            />
          </div>
          
          <div className="space-y-4">
              <AnimatePresence mode="wait">
                  {isLoading ? (
                      <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center py-20 text-muted-foreground"
                      >
                          <Loader2 className="w-8 h-8 animate-spin mb-2" />
                          <p className="text-sm font-mono">{t("fetchingRealData")}</p>
                      </motion.div>
                  ) : error ? (
                      <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center py-20 text-negative"
                      >
                          <p className="text-sm font-mono mb-2">{t("failedLoad")}</p>
                          <button 
                            onClick={() => refetch()}
                            className="text-xs bg-secondary px-4 py-2 rounded-lg hover:bg-secondary/80"
                            data-testid="retry-button"
                          >
                            {t("retry")}
                          </button>
                      </motion.div>
                  ) : (
                      <div className="grid gap-4">
                          {stocks?.map((stock, idx) => (
                              <StockCard 
                                key={stock.ticker} 
                                stock={stock} 
                                index={idx} 
                                onClick={() => setSelectedStock(stock)}
                                watchlistId={activeWatchlist}
                                onDelete={() => refetch()}
                                onManage={() => setIsManagerOpen(true)}
                              />
                          ))}
                          {stocks?.length === 0 && (
                            <div className="text-center text-muted-foreground py-10">
                              <p className="text-sm">{t("emptyWatchlist")}</p>
                              <button
                                onClick={() => setIsManagerOpen(true)}
                                className="text-primary text-sm mt-2 hover:underline"
                              >
                                {t("addStocks")}
                              </button>
                            </div>
                          )}
                      </div>
                  )}
              </AnimatePresence>
          </div>
        </main>
      )}

      <BottomNav 
        currentWatchlist={activeWatchlist} 
        onSelect={setActiveWatchlist}
        onManage={() => setIsManagerOpen(true)}
        hasLeaderboard={hasLeaderboards}
        leaderboardId={LEADERBOARD_ID}
      />

      {selectedStock && (
        <StockDetailModal
          ticker={selectedStock.ticker}
          isOpen={!!selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}
