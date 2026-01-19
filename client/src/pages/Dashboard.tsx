import { useState } from "react";
import { useStockData, WATCHLISTS } from "@/lib/mockData";
import { StockCard } from "@/components/StockCard";
import { BottomNav } from "@/components/BottomNav";
import generatedImage from "@assets/generated_images/subtle_dark_tactical_grid_background.png";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
        <div className="max-w-md mx-auto flex justify-between items-center">
            <div>
                <h1 className="text-lg font-bold tracking-tight">Quant<span className="text-primary/60">Dashboard</span></h1>
                <p className="text-xs text-muted-foreground font-mono">Live Market Data • MVP</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-positive animate-pulse shadow-[0_0_10px_var(--color-positive)]" />
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
