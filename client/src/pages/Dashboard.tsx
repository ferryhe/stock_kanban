import { useState, useEffect } from "react";
import { useStockData, WATCHLISTS, saveWatchlist } from "@/lib/mockData";
import { StockCard } from "@/components/StockCard";
import { BottomNav } from "@/components/BottomNav";
import generatedImage from "@assets/generated_images/subtle_dark_tactical_grid_background.png";
import { Loader2, Settings2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MarketTickerProps {
  symbol: string;
  label: string;
}

const MarketTicker = ({ symbol, label }: MarketTickerProps) => {
  const isVix = symbol === "VIX";
  const [price, setPrice] = useState(isVix ? 15.42 : 482.15);
  const [change] = useState(isVix ? 2.4 : 0.85);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrice(p => p + (Math.random() - 0.5) * 0.1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
  const [activeWatchlist, setActiveWatchlist] = useState<string>(WATCHLISTS.AI_CHIPS.id);
  const { data: stocks, isLoading } = useStockData(activeWatchlist);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTickers, setEditTickers] = useState("");

  const currentList = Object.values(WATCHLISTS).find(l => l.id === activeWatchlist) as any;

  useEffect(() => {
    if (currentList) {
      setEditTickers(currentList.tickers.join(", "));
    }
  }, [activeWatchlist, currentList]);

  const handleSave = () => {
    const tickers = editTickers.split(",").map(t => t.trim().toUpperCase()).filter(t => t);
    const key = Object.keys(WATCHLISTS).find(k => (WATCHLISTS as any)[k].id === activeWatchlist);
    if (key) {
      saveWatchlist(activeWatchlist, tickers);
      setIsSettingsOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 relative overflow-hidden font-sans">
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none mix-blend-overlay"
        style={{ 
            backgroundImage: `url(${generatedImage})`,
            backgroundSize: '400px',
            backgroundRepeat: 'repeat'
        }}
      />
      
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 py-4">
        <div className="max-w-md mx-auto flex justify-between items-center gap-4">
            <div className="flex-shrink-0">
                <h1 className="text-lg font-bold tracking-tight">Quant<span className="text-primary/60">Dash</span></h1>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Live</span>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex gap-6 border-l border-border/50 pl-6 overflow-x-auto no-scrollbar">
                    <MarketTicker symbol="SPY" label="S&P 500" />
                    <MarketTicker symbol="VIX" label="Volatility" />
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Settings2 className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Edit Watchlist</h2>
                <button onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">
                    {currentList?.label} Tickers (Comma separated)
                  </label>
                  <textarea 
                    value={editTickers}
                    onChange={(e) => setEditTickers(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                    rows={4}
                    placeholder="AAPL, MSFT, GOOGL..."
                  />
                </div>
                <button 
                  onClick={handleSave}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        <p className="text-sm font-mono">Fetching Signals...</p>
                    </motion.div>
                ) : (
                    <div className="grid gap-4">
                        {stocks?.map((stock, idx) => (
                            <StockCard key={stock.ticker} stock={stock} index={idx} />
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
      </main>

      <BottomNav 
        currentWatchlist={activeWatchlist} 
        onSelect={setActiveWatchlist} 
      />
    </div>
  );
}
