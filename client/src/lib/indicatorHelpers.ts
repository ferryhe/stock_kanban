export const TAG_COLORS = {
  BUY: "bg-positive/10 text-positive border-positive/20",
  SELL: "bg-negative/10 text-negative border-negative/20",
  WARNING: "bg-warning/10 text-warning border-warning/20",
  NEUTRAL: "bg-muted text-muted-foreground border-border",
};

export const getIndicatorType = (label: string): string => {
  const labelLower = label.toLowerCase();
  if (labelLower.includes("rsi")) return "rsi";
  if (labelLower.includes("macd")) return "macd";
  if (labelLower.includes("trend")) return "trend";
  if (labelLower.includes("52w") || labelLower.includes("week")) return "week52";
  if (labelLower.includes("bollinger")) return "bollinger";
  if (labelLower.includes("volume")) return "volume";
  return "trend";
};

const GRADIENT = [
  { text: "text-green-600", bg: "bg-green-500/10", border: "border-green-500/30" },
  { text: "text-lime-600", bg: "bg-lime-500/10", border: "border-lime-500/30" },
  { text: "text-yellow-600", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  { text: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  { text: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
];

const GRADIENT_REVERSE = [...GRADIENT].reverse();

const pickGradient = (value: number, min: number, max: number, gradient: typeof GRADIENT) => {
  if (value <= min) return gradient[0];
  if (value >= max) return gradient[gradient.length - 1];
  const t = (value - min) / (max - min);
  const idx = Math.round(t * (gradient.length - 1));
  return gradient[Math.max(0, Math.min(gradient.length - 1, idx))];
};

export const getIndicatorClasses = (indicator: string, value: number) => {
  const key = indicator.toLowerCase();
  switch (key) {
    case "rank": {
      if (value > 10) return GRADIENT[GRADIENT.length - 1];
      return pickGradient(value, 1, 10, GRADIENT.slice(0, 3));
    }
    case "score":
      return pickGradient(value, 0, 1, GRADIENT);
    case "predictedreturn":
      return pickGradient(value, -20, 20, GRADIENT_REVERSE);
    case "vol60":
      return pickGradient(value, 0.5, 1.5, GRADIENT);
    case "maxdd252":
    case "maxdd":
      return pickGradient(value, -2, -0.3, GRADIENT_REVERSE);
    default:
      return null;
  }
};
