import { StockData, SignalType } from "@/lib/mockData";
import { ArrowUp, ArrowDown, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StockCardProps {
  stock: StockData;
  index: number;
}

const SignalBadge = ({ type, label, value }: { type: SignalType; label: string; value?: string }) => {
  const colors = {
    BUY: "bg-positive/10 text-positive border-positive/20",
    SELL: "bg-negative/10 text-negative border-negative/20",
    WARNING: "bg-warning/10 text-warning border-warning/20",
    NEUTRAL: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium font-mono", colors[type])}>
      <span>{label}</span>
      {value && <span className="opacity-70 border-l border-current pl-2">{value}</span>}
    </div>
  );
};

export function StockCard({ stock, index }: StockCardProps) {
  const isPositive = stock.changePercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card/50 backdrop-blur-sm border border-border/50 p-4 rounded-xl shadow-sm hover:border-primary/20 transition-colors"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold font-mono tracking-tight text-foreground">{stock.ticker}</h3>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Stock</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold font-mono text-foreground">
            ${stock.price.toFixed(2)}
          </div>
          <div className={cn("flex items-center justify-end gap-1 text-sm font-mono font-medium", isPositive ? "text-positive" : "text-negative")}>
            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(stock.changePercent).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {stock.tags.map((tag, i) => (
            <SignalBadge key={i} type={tag.type} label={tag.label} value={tag.value} />
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-4">
        <div>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">Vol / Avg</div>
            <div className="text-sm font-mono text-foreground">
                {(stock.volume / 1000000).toFixed(1)}M <span className="text-muted-foreground">/ {(stock.avgVolume / 1000000).toFixed(1)}M</span>
            </div>
        </div>
        <div>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">RSI (14)</div>
            <div className={cn("text-sm font-mono font-medium", 
                stock.rsi > 70 ? "text-negative" : stock.rsi < 30 ? "text-positive" : "text-foreground"
            )}>
                {stock.rsi.toFixed(1)}
            </div>
        </div>
        <div>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1">Short Float</div>
            <div className={cn("text-sm font-mono font-medium", 
                stock.shortFloat > 20 ? "text-negative" : "text-foreground"
            )}>
                {stock.shortFloat.toFixed(1)}%
            </div>
        </div>
      </div>
    </motion.div>
  );
}
