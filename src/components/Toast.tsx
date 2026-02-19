import { useEffect, useState, useCallback, useSyncExternalStore } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function showToast(
  message: string,
  type: "success" | "error" | "info" = "info",
) {
  toasts = [...toasts, { id: ++toastId, message, type }];
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

export default function ToastContainer() {
  const items = useSyncExternalStore(subscribe, getSnapshot);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <ToastMessage key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastMessage({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== toast.id);
      emit();
    }, 200);
  }, [toast.id]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(dismiss, 3000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  const colors = {
    success: "border-accent/30 text-accent",
    error: "border-danger/30 text-danger",
    info: "border-border text-text-secondary",
  };

  return (
    <div
      className={`
        pointer-events-auto px-4 py-2.5 rounded-lg
        bg-surface-1 border text-sm font-medium
        transition-all duration-200
        ${colors[toast.type]}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
      `}
    >
      {toast.message}
    </div>
  );
}
