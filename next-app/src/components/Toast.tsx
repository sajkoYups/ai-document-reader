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
    <div
      className="fixed top-5 left-1/2 z-[100] flex w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col items-stretch gap-2 pointer-events-none"
      aria-live="polite"
    >
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
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  const colors = {
    success:
      "border-accent/50 text-accent shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_28px_rgba(45,212,191,0.18)]",
    error:
      "border-danger/50 text-danger shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_28px_rgba(248,113,113,0.18)]",
    info:
      "border-accent/45 text-text-primary shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_28px_rgba(45,212,191,0.16)]",
  };

  const bar = {
    success: "bg-accent",
    error: "bg-danger",
    info: "bg-accent",
  };

  return (
    <div
      role="status"
      onClick={dismiss}
      className={`
        pointer-events-auto relative overflow-hidden cursor-pointer
        rounded-lg border bg-surface-2 px-5 py-3.5 pl-6
        text-sm font-medium leading-snug
        transition-all duration-200
        ${colors[toast.type]}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
      `}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${bar[toast.type]}`} />
      {toast.message}
    </div>
  );
}
