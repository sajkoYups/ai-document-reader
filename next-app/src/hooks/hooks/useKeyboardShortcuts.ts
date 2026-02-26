import { useEffect } from "react";

interface Shortcuts {
  onRun?: () => void;
  onClear?: () => void;
}

export function useKeyboardShortcuts({ onRun, onClear }: Shortcuts) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onRun?.();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClear?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRun, onClear]);
}
