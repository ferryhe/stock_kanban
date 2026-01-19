import { useState, useEffect } from "react";
import { useStockData, WATCHLISTS } from "@/lib/mockData";
import { StockCard } from "@/components/StockCard";
import { BottomNav } from "@/components/BottomNav";
import generatedImage from "@assets/generated_images/subtle_dark_tactical_grid_background.png";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MarketTickerProps {
  symbol: string;
  label: string;
}

const MarketTicker = ({ symbol, label }: MarketTickerProps) => {
  const isVix = symbol === "VIX";
  const [price, setPrice] = useState(isVix ? 15.42 : 482.15);
  const [change, setChange] = useState(isVix ? 2.4 : 0.85);

  // Simple animation for live feel
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 relative overflow-hidden font-sans">
      {/* Background Texture */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none mix-blend-overlay"
        style={{ 
            backgroundImage: `url(${generatedImage})`,
            backgroundSize: '400px',
            backgroundRepeat: 'repeat'
        }}
      />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 py-4">
        <div className="max-w-md mx-auto flex justify-between items-center gap-4">
            <div className="flex-shrink-0">
                <h1 className="text-lg font-bold tracking-tight">Quant<span className="text-primary/60">Dash</span></h1>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Live</span>
                </div>
            </div>
            
            <div className="flex gap-6 border-l border-border/50 pl-6 overflow-x-auto no-scrollbar">
                <MarketTicker symbol="SPY" label="S&P 500" />
                <MarketTicker symbol="VIX" label="Volatility" />
            </div>
        </div>
      </header>

      {/* Main Content */}
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

      {/* Navigation */}
      <BottomNav 
        currentWatchlist={activeWatchlist} 
        onSelect={setActiveWatchlist} 
      />
    </div>
  );
}
