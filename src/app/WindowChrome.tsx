import { Minus, ScrollText, X } from "lucide-react";
import { ProductMark } from "./ProductMark";

interface WindowChromeProps {
  busy: boolean;
  historyOpen: boolean;
  onMinify: () => void;
  onClose: () => void;
  onHistory: () => void;
}

export function WindowChrome({
  busy,
  historyOpen,
  onMinify,
  onClose,
  onHistory,
}: WindowChromeProps) {
  return (
    <header className="window-chrome" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region>
        <ProductMark />
        <span className="visually-hidden">剑盾纪事</span>
      </div>

      <div className="window-actions">
        <button
          type="button"
          className="icon-button icon-button--history"
          aria-label={historyOpen ? "隐藏移除历史" : "查看移除历史"}
          aria-expanded={historyOpen}
          onClick={onHistory}
        >
          <ScrollText size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="缩小为图标"
          disabled={busy}
          onClick={onMinify}
        >
          <Minus size={18} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          className="icon-button icon-button--close"
          aria-label="关闭剑盾纪事"
          onClick={onClose}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
