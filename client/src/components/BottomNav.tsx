import { WATCHLISTS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BottomNavProps {
  currentWatchlist: string;
  onSelect: (id: string) => void;
}

export function BottomNav({ currentWatchlist, onSelect }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-md mx-auto p-1 bg-secondary/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl">
        {Object.values(WATCHLISTS).map((list) => {
            const isActive = list.id === currentWatchlist;
            return (
              <button
                key={list.id}
                onClick={() => onSelect(list.id)}
                className={cn(
                  "relative flex-1 whitespace-nowrap px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                    <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary rounded-xl shadow-lg"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <span className="relative z-10 font-semibold">{list.label}</span>
              </button>
            );
        })}
      </div>
    </div>
  );
}
