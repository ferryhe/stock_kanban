import { useState } from "react";
import { Search, Loader2, Plus } from "lucide-react";
import { useStockSearch, addTickerToWatchlist } from "@/lib/stockApi";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

interface WatchlistSearchBoxProps {
  watchlistId: string;
  onStockAdded?: () => void;
}

export function WatchlistSearchBox({ watchlistId, onStockAdded }: WatchlistSearchBoxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { data: searchResults, isLoading: isSearching } = useStockSearch(searchQuery);
  const { t } = useI18n();

  const handleAddStock = (ticker: string) => {
    try {
      addTickerToWatchlist(watchlistId, ticker);
      setSearchQuery("");
      setIsFocused(false);
      onStockAdded?.();
    } catch (error) {
      console.error("Failed to add stock:", error);
    }
  };

  const showResults = isFocused && searchQuery.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={t("searchPlaceholder")}
          className="w-full bg-secondary/50 border border-border rounded-xl p-3 pl-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          data-testid="watchlist-search-input"
        />
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto"
          >
            {isSearching ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={result.symbol}
                  onMouseDown={() => handleAddStock(result.symbol)}
                  className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 border-b border-border last:border-0 text-left transition-colors"
                  data-testid={`add-${result.symbol}`}
                >
                  <div>
                    <div className="font-mono font-bold">{result.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                      {result.name}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-positive flex-shrink-0" />
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {t("noResults")}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
