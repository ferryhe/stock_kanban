import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorTooltipProps {
  indicator: string;
  value?: string | number;
  children: React.ReactNode;
  className?: string;
}

const INDICATOR_EXPLANATIONS: Record<string, { title: string; description: string; interpretation: string }> = {
  rsi: {
    title: "RSI (Relative Strength Index)",
    description: "RSI measures the speed and magnitude of recent price changes to evaluate overbought or oversold conditions.",
    interpretation: "RSI > 70 = Overbought (potential sell signal)\nRSI < 30 = Oversold (potential buy signal)\nRSI 30-70 = Neutral range"
  },
  volume: {
    title: "Volume",
    description: "The number of shares traded during a given period. High volume confirms price movements.",
    interpretation: "Volume > 1.5x Average = Strong interest/momentum\nVolume < Average = Weak conviction\nVolume spikes often precede big moves"
  },
  shortFloat: {
    title: "Short Float %",
    description: "The percentage of a company's shares that are being shorted (bet against) by investors.",
    interpretation: "Short Float > 20% = High short interest (potential squeeze)\nShort Float 10-20% = Moderate bearish sentiment\nShort Float < 10% = Normal levels"
  },
  macd: {
    title: "MACD (Moving Average Convergence Divergence)",
    description: "MACD shows the relationship between two moving averages. It helps identify trend direction and momentum.",
    interpretation: "MACD > Signal Line = Bullish momentum\nMACD < Signal Line = Bearish momentum\nMACD crossing above signal = Buy signal\nMACD crossing below signal = Sell signal"
  },
  bollinger: {
    title: "Bollinger Bands",
    description: "Bollinger Bands show price volatility by plotting bands 2 standard deviations above and below a moving average.",
    interpretation: "Price near upper band = Potentially overbought\nPrice near lower band = Potentially oversold\nBands widening = Increasing volatility\nBands narrowing = Decreasing volatility"
  },
  sma: {
    title: "SMA (Simple Moving Average)",
    description: "The average closing price over a specific period (20 days). Shows the overall trend direction.",
    interpretation: "Price > SMA20 = Uptrend\nPrice < SMA20 = Downtrend\nSMA acts as support/resistance"
  },
  week52: {
    title: "52-Week High/Low",
    description: "The highest and lowest prices the stock has traded at during the past year.",
    interpretation: "Near 52W High = Strong momentum, but may be extended\nNear 52W Low = Potential value, but weak momentum\nBreaking 52W High = Very bullish signal"
  },
  trend: {
    title: "Trend Indicator",
    description: "Shows whether the stock is in an uptrend or downtrend based on its position relative to the 20-day moving average.",
    interpretation: "Uptrend = Price above SMA20 (bullish)\nDowntrend = Price below SMA20 (bearish)"
  },
  rank: {
    title: "Ensemble Rank",
    description: "Ordinal ranking after combining quantitative scores, buffers, and predictive signals from machine learning models.",
    interpretation: "Rank 1 = Best candidate (lowest is better)\nRank 1-3 = Top tier signals\nRank 4-5 = Strong signals\nRank > 5 = Weaker signals\nLower rank values are favorable"
  },
  score: {
    title: "Ensemble Score",
    description: "Aggregated ensemble score combining multiple quantitative factors and model predictions.",
    interpretation: "Higher values are better\nScore reflects consensus strength\nUse alongside rank for decision making\nScores are comparable across stocks"
  },
  predictedReturn: {
    title: "Predicted Return (20 Trading Days)",
    description: "Mean predicted return from machine learning models looking ahead 20 trading days (approximately 1 month).",
    interpretation: "Positive % = Bullish signal\nNegative % = Bearish signal\n> 5% = Strong upside\n< -5% = Strong downside\nBased on historical patterns and technical factors"
  },
  vol60: {
    title: "60-Day Volatility (Z-Score)",
    description: "Standardized 60-day historical volatility relative to statistical baseline. Positive values indicate higher relative volatility.",
    interpretation: "Z-score > 1 = High volatility (risky)\nZ-score between -1 and 1 = Normal volatility\nZ-score < -1 = Low volatility (stable)\nHigher absolute values = More relative risk\nLower magnitude is generally better"
  },
  maxdd252: {
    title: "252-Day Maximum Drawdown (Z-Score)",
    description: "Standardized 252-day (1 year) maximum drawdown from peak to trough relative to historical baseline.",
    interpretation: "Z-score > 0.5 = High drawdown risk\nZ-score between -0.5 and 0.5 = Normal drawdown\nZ-score < -0.5 = Low drawdown risk\nHigher positive values = More drawdown risk\nNegative values = Less downside risk"
  },
  bucket: {
    title: "Signal Bucket",
    description: "Grouped signal classification for UI consumption based on ensemble predictions: HOLD, LONG, or SHORT.",
    interpretation: "LONG = Bullish signal, consider buying\nHOLD = Neutral or mixed signals, no clear direction\nSHORT = Bearish signal, consider avoiding or shorting\nUse with other indicators for confirmation"
  }
};

export function IndicatorTooltip({ indicator, value, children, className }: IndicatorTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const explanation = INDICATOR_EXPLANATIONS[indicator.toLowerCase()] || {
    title: indicator,
    description: "Technical indicator used for stock analysis.",
    interpretation: "Consult financial resources for detailed interpretation."
  };

  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={cn("cursor-pointer hover:opacity-80 transition-opacity", className)}
        data-testid={`indicator-${indicator}`}
      >
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border w-full max-w-sm max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden select-none cursor-pointer flex flex-col"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            >
              <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">{explanation.title}</h3>
                </div>
                <X className="w-5 h-5 text-muted-foreground" />
              </div>
              
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {value !== undefined && (
                  <div className="text-center p-3 bg-secondary/50 rounded-xl">
                    <div className="text-2xl font-mono font-bold text-foreground">
                      {typeof value === 'number' ? value.toFixed(2) : value}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Current Value
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-2">
                    What is it?
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {explanation.description}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-2">
                    How to interpret
                  </h4>
                  <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed bg-secondary/30 p-3 rounded-xl font-mono text-xs">
                    {explanation.interpretation}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
