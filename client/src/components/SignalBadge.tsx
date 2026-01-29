import { cn } from "@/lib/utils";
import { IndicatorTooltip } from "./IndicatorTooltip";
import { getIndicatorClasses, getIndicatorType, TAG_COLORS } from "@/lib/indicatorHelpers";
import type { SignalType } from "@/lib/stockApi";

interface SignalBadgeProps {
  type: SignalType;
  label: string;
  value?: string;
  indicator?: string;
  className?: string;
}

export function SignalBadge({ type, label, value, indicator, className }: SignalBadgeProps) {
  const indicatorType = indicator || getIndicatorType(label);
  const numericValue =
    typeof value === "string" && /^\s*-?\d+(\.\d+)?%?\s*$/.test(value)
      ? Number(value.replace("%", ""))
      : null;
  const numericIndicator = numericValue === null ? null : getIndicatorClasses(indicatorType, numericValue);

  return (
    <IndicatorTooltip indicator={indicatorType} value={value}>
      <div
        className={cn(
          "flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium font-mono",
          (numericIndicator && numericIndicator.bg) || TAG_COLORS[type],
          (numericIndicator && numericIndicator.text) || "",
          (numericIndicator && numericIndicator.border) || "",
          className
        )}
      >
        <span>{label}</span>
        {value && <span className="opacity-70 border-l border-current pl-2">{value}</span>}
      </div>
    </IndicatorTooltip>
  );
}
