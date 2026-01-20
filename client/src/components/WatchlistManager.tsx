import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { X, Plus, Trash2, Search, Loader2, GripVertical, Check } from "lucide-react";
import { 
  WATCHLISTS, 
  Watchlist, 
  createWatchlist, 
  deleteWatchlist, 
  addTickerToWatchlist, 
  removeTickerFromWatchlist,
  updateWatchlistLabel,
  reorderWatchlists,
  reorderTickersInWatchlist,
  subscribeToWatchlistChanges,
  useStockSearch 
} from "@/lib/stockApi";
import { cn } from "@/lib/utils";

function DraggableWatchlistItem({ 
  watchlist, 
  onEdit, 
  onDelete, 
  canDelete 
}: { 
  watchlist: Watchlist; 
  onEdit: () => void; 
  onDelete: () => void; 
  canDelete: boolean;
}) {
  const dragControls = useDragControls();
  
  return (
    <Reorder.Item
      value={watchlist}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl select-none"
    >
      <div className="flex items-center gap-2 flex-1">
        <div
          className="cursor-grab active:cursor-grabbing touch-none p-1"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-medium">{watchlist.label}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {watchlist.tickers.length} stocks
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
          data-testid={`edit-${watchlist.id}`}
        >
          Edit
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-negative hover:bg-negative/10 rounded-lg"
            data-testid={`delete-${watchlist.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}

function DraggableStockItem({ 
  ticker, 
  onRemove 
}: { 
  ticker: string; 
  onRemove: () => void; 
}) {
  const dragControls = useDragControls();
  
  return (
    <Reorder.Item
      value={ticker}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl select-none"
    >
      <div className="flex items-center gap-2 flex-1">
        <div
          className="cursor-grab active:cursor-grabbing touch-none p-1"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <span className="font-mono font-bold">{ticker}</span>
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 text-negative hover:bg-negative/10 rounded-lg"
        data-testid={`remove-${ticker}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </Reorder.Item>
  );
}

interface WatchlistManagerProps {
  isOpen: boolean;
  onClose: () => void;
  activeWatchlist: string;
}

export function WatchlistManager({ isOpen, onClose, activeWatchlist }: WatchlistManagerProps) {
  const [mode, setMode] = useState<"list" | "edit" | "create">("list");
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [watchlistsArray, setWatchlistsArray] = useState<Watchlist[]>(Object.values(WATCHLISTS));
  
  const { data: searchResults, isLoading: isSearching } = useStockSearch(searchQuery);

  const refreshWatchlists = useCallback(() => {
    const updated = Object.values(WATCHLISTS);
    setWatchlistsArray(updated);
    setSelectedWatchlist(prev => {
      if (prev) {
        const updatedSelected = updated.find(w => w.id === prev.id);
        return updatedSelected || prev;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToWatchlistChanges(refreshWatchlists);
    return unsubscribe;
  }, [refreshWatchlists]);

  useEffect(() => {
    if (isOpen) {
      refreshWatchlists();
      setMode("list");
    }
  }, [isOpen]);

  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      const newList = createWatchlist(newWatchlistName.trim());
      setNewWatchlistName("");
      setSelectedWatchlist(newList);
      setEditLabel(newList.label);
      setMode("edit");
    }
  };

  const handleDeleteWatchlist = (id: string) => {
    if (watchlistsArray.length > 1) {
      deleteWatchlist(id);
    }
  };

  const handleAddTicker = (ticker: string) => {
    if (selectedWatchlist) {
      addTickerToWatchlist(selectedWatchlist.id, ticker);
      setSearchQuery("");
    }
  };

  const handleRemoveTicker = (ticker: string) => {
    if (selectedWatchlist) {
      removeTickerFromWatchlist(selectedWatchlist.id, ticker);
    }
  };

  const handleSaveLabel = () => {
    if (selectedWatchlist && editLabel.trim()) {
      updateWatchlistLabel(selectedWatchlist.id, editLabel.trim());
    }
  };

  const openEditMode = (watchlist: Watchlist) => {
    setSelectedWatchlist(watchlist);
    setEditLabel(watchlist.label);
    setSearchQuery("");
    setMode("edit");
  };

  const handleReorder = (newOrder: Watchlist[]) => {
    setWatchlistsArray(newOrder);
    reorderWatchlists(newOrder.map(w => w.id));
  };

  const handleReorderTickers = (newOrder: string[]) => {
    if (selectedWatchlist) {
      setSelectedWatchlist({ ...selectedWatchlist, tickers: newOrder });
      reorderTickersInWatchlist(selectedWatchlist.id, newOrder);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="text-lg font-bold">
                {mode === "list" && "Manage Watchlists"}
                {mode === "edit" && selectedWatchlist?.label}
                {mode === "create" && "Create Watchlist"}
              </h2>
              <div className="flex items-center gap-2">
                {mode !== "list" && (
                  <button
                    onClick={() => setMode("list")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </button>
                )}
                <button onClick={onClose} data-testid="close-manager">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {mode === "list" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Drag to reorder watchlists
                  </p>
                  <Reorder.Group 
                    axis="y" 
                    values={watchlistsArray} 
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {watchlistsArray.map((watchlist) => (
                      <DraggableWatchlistItem
                        key={watchlist.id}
                        watchlist={watchlist}
                        onEdit={() => openEditMode(watchlist)}
                        onDelete={() => handleDeleteWatchlist(watchlist.id)}
                        canDelete={watchlistsArray.length > 1}
                      />
                    ))}
                  </Reorder.Group>

                  <button
                    onClick={() => setMode("create")}
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    data-testid="create-watchlist-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Watchlist</span>
                  </button>
                </div>
              )}

              {mode === "create" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">
                      Watchlist Name
                    </label>
                    <input
                      type="text"
                      value={newWatchlistName}
                      onChange={(e) => setNewWatchlistName(e.target.value)}
                      placeholder="e.g., Tech Giants"
                      className="w-full bg-secondary/50 border border-border rounded-xl p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      data-testid="new-watchlist-name"
                    />
                  </div>
                  <button
                    onClick={handleCreateWatchlist}
                    disabled={!newWatchlistName.trim()}
                    className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    data-testid="confirm-create-watchlist"
                  >
                    Create Watchlist
                  </button>
                </div>
              )}

              {mode === "edit" && selectedWatchlist && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">
                      Watchlist Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="flex-1 bg-secondary/50 border border-border rounded-xl p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        data-testid="edit-watchlist-name"
                      />
                      <button
                        onClick={handleSaveLabel}
                        className="px-4 bg-primary text-primary-foreground rounded-xl font-medium"
                        data-testid="save-watchlist-name"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">
                      Add Stock
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or ticker..."
                        className="w-full bg-secondary/50 border border-border rounded-xl p-3 pl-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        data-testid="search-stock-input"
                      />
                    </div>

                    {searchQuery && (
                      <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-xl">
                        {isSearching ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : searchResults && searchResults.length > 0 ? (
                          searchResults.map((result) => (
                            <button
                              key={result.symbol}
                              onClick={() => handleAddTicker(result.symbol)}
                              disabled={selectedWatchlist.tickers.includes(result.symbol)}
                              className={cn(
                                "w-full flex items-center justify-between p-3 hover:bg-secondary/50 border-b border-border last:border-0 text-left",
                                selectedWatchlist.tickers.includes(result.symbol) && "opacity-50"
                              )}
                              data-testid={`add-${result.symbol}`}
                            >
                              <div>
                                <div className="font-mono font-bold">{result.symbol}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {result.name}
                                </div>
                              </div>
                              {selectedWatchlist.tickers.includes(result.symbol) ? (
                                <span className="text-xs text-muted-foreground">Added</span>
                              ) : (
                                <Plus className="w-4 h-4 text-positive" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            No results found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">
                      Current Stocks ({selectedWatchlist.tickers.length}) - Drag to reorder
                    </label>
                    <Reorder.Group
                      axis="y"
                      values={selectedWatchlist.tickers}
                      onReorder={handleReorderTickers}
                      className="space-y-2"
                    >
                      {selectedWatchlist.tickers.map((ticker) => (
                        <DraggableStockItem
                          key={ticker}
                          ticker={ticker}
                          onRemove={() => handleRemoveTicker(ticker)}
                        />
                      ))}
                    </Reorder.Group>
                    {selectedWatchlist.tickers.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-4">
                        No stocks in this watchlist
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border">
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                data-testid="done-button"
              >
                <Check className="w-5 h-5" />
                <span>Done</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
