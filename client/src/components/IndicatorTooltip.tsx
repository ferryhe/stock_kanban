import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface IndicatorTooltipProps {
  indicator: string;
  value?: string | number;
  children: React.ReactNode;
  className?: string;
}

export function IndicatorTooltip({ indicator, value, children, className }: IndicatorTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { indicator: indicatorCopy, t } = useI18n();
  const explanation = indicatorCopy[indicator.toLowerCase() as keyof typeof indicatorCopy] || {
    title: indicator,
    description: t("unknownIndicatorDescription"),
    interpretation: t("unknownIndicatorInterpretation"),
  };

  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
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
              className="bg-card border border-border w-full max-w-sm max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col select-none"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">{explanation.title}</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-secondary rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                {value !== undefined && (
                  <div className="text-center p-3 bg-secondary/50 rounded-xl">
                    <div className="text-2xl font-mono font-bold text-foreground">
                      {typeof value === 'number' ? value.toFixed(2) : value}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t("currentValue")}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-2">
                    {t("whatIsIt")}
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {explanation.description}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-2">
                    {t("howToInterpret")}
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
