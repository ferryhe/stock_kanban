import { useState, useEffect, useCallback } from "react";
import { useStockData, useMarketOverview, WATCHLISTS, isMarketOpen, getCurrentETTime, StockData, subscribeToWatchlistChanges, getWatchlistsArray } from "@/lib/stockApi";
import { StockCard } from "@/components/StockCard";
import { StockDetailModal } from "@/components/StockDetailModal";
import { WatchlistManager } from "@/components/WatchlistManager";
import { BottomNav } from "@/components/BottomNav";
// import generatedImage from "@assets/generated_images/subtle_dark_tactical_grid_background.png";
import { Loader2, Settings2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const [activeWatchlist, setActiveWatchlist] = useState<string>(WATCHLISTS.AI_CHIPS?.id || Object.values(WATCHLISTS)[0]?.id || "ai_chips");
  const { data: stocks, isLoading, refetch, isFetching, error } = useStockData(activeWatchlist);
  const { data: marketData } = useMarketOverview();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [marketOpen, setMarketOpen] = useState(isMarketOpen());
  const [currentTime, setCurrentTime] = useState(getCurrentETTime());
  const [, forceUpdate] = useState(0);

  const currentList = Object.values(WATCHLISTS).find(l => l.id === activeWatchlist);

  const refreshWatchlists = useCallback(() => {
    const currentWatchlists = Object.values(WATCHLISTS);
    const activeExists = currentWatchlists.some(w => w.id === activeWatchlist);
    if (!activeExists && currentWatchlists.length > 0) {
      setActiveWatchlist(currentWatchlists[0].id);
    }
    forceUpdate(n => n + 1);
    refetch();
  }, [refetch, activeWatchlist]);

  useEffect(() => {
    const unsubscribe = subscribeToWatchlistChanges(refreshWatchlists);
    return unsubscribe;
  }, [refreshWatchlists]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentETTime());
      setMarketOpen(isMarketOpen());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="max-w-md mx-auto flex justify-between items-center gap-4">
            <div className="flex-shrink-0">
                <h1 className="text-lg font-bold tracking-tight">Quant<span className="text-primary/60">Dash</span></h1>
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
                    <MarketTicker 
                      symbol="SPY" 
                      label="S&P 500" 
                      price={marketData?.spy.price || 0}
                      change={marketData?.spy.change || 0}
                    />
                    <MarketTicker 
                      symbol="VIX" 
                      label="Volatility" 
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

      <WatchlistManager
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        activeWatchlist={activeWatchlist}
      />

      <main className="max-w-md mx-auto px-4 py-6 relative z-10">
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
                        <p className="text-sm font-mono">Fetching Real Data...</p>
                    </motion.div>
                ) : error ? (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-negative"
                    >
                        <p className="text-sm font-mono mb-2">Failed to load data</p>
                        <button 
                          onClick={() => refetch()}
                          className="text-xs bg-secondary px-4 py-2 rounded-lg hover:bg-secondary/80"
                          data-testid="retry-button"
                        >
                          Retry
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
                            />
                        ))}
                        {stocks?.length === 0 && (
                          <div className="text-center text-muted-foreground py-10">
                            <p className="text-sm">No stocks in this watchlist</p>
                            <button
                              onClick={() => setIsManagerOpen(true)}
                              className="text-primary text-sm mt-2 hover:underline"
                            >
                              Add stocks
                            </button>
                          </div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </div>
      </main>

      <BottomNav 
        currentWatchlist={activeWatchlist} 
        onSelect={setActiveWatchlist}
        onManage={() => setIsManagerOpen(true)}
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
