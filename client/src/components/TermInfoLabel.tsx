import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TermInfoLabelProps = {
  label: string;
  description: string;
  className?: string;
};

export function TermInfoLabel({ label, description, className }: TermInfoLabelProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`.trim()}>
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Explain ${label}`}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 leading-relaxed">
          {description}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
