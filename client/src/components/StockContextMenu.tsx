import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface StockContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onPinToTop: () => void;
  onMoveToBottom: () => void;
  onMore: () => void;
  position: { x: number; y: number };
}

export function StockContextMenu({
  isOpen,
  onClose,
  onDelete,
  onPinToTop,
  onMoveToBottom,
  onMore,
  position,
}: StockContextMenuProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Backdrop to close menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
          data-testid="context-menu-backdrop"
        />
      )}
      
      {/* Context Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: "translate(-50%, -100%) translateY(-8px)",
            }}
            data-testid="stock-context-menu"
          >
          <div className="flex items-center gap-2 p-2">
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-secondary rounded-xl transition-colors min-w-[70px]"
              data-testid="context-delete-btn"
            >
              <Trash2 className="w-5 h-5 text-negative" />
              <span className="text-xs text-muted-foreground">{t("delete")}</span>
            </button>
            
            <div className="w-px h-8 bg-border" />
            
            <button
              onClick={() => {
                onPinToTop();
                onClose();
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-secondary rounded-xl transition-colors min-w-[70px]"
              data-testid="context-pin-top-btn"
            >
              <ArrowUp className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">{t("pinTop")}</span>
            </button>
            
            <div className="w-px h-8 bg-border" />
            
            <button
              onClick={() => {
                onMoveToBottom();
                onClose();
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-secondary rounded-xl transition-colors min-w-[70px]"
              data-testid="context-move-bottom-btn"
            >
              <ArrowDown className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">{t("moveBottom")}</span>
            </button>
            
            <div className="w-px h-8 bg-border" />
            
            <button
              onClick={() => {
                onMore();
                onClose();
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-secondary rounded-xl transition-colors min-w-[70px]"
              data-testid="context-more-btn"
            >
              <MoreHorizontal className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">{t("more")}</span>
            </button>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
