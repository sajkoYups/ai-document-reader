import { type ReactNode } from "react";
import Link from "next/link";
import PrivacyBadge from "./PrivacyBadge";
import Footer from "./Footer";
import SiteBrand from "./SiteBrand";
import type { ModelStatus } from "@/types";

interface LayoutProps {
  children: ReactNode;
  modelStatus: ModelStatus;
  inferenceDevice?: "webgpu" | "wasm" | null;
  /** Optional slot for header right (e.g. mode toggle + auth + privacy badge) */
  headerRight?: ReactNode;
  /** Optional controls before the brand (e.g. mobile pane toggles) */
  headerStart?: ReactNode;
  variant?: "default" | "workspace";
}

const statusLabel: Record<ModelStatus, { text: string; color: string }> = {
  idle: { text: "Model not loaded", color: "bg-text-muted" },
  downloading: { text: "Building model...", color: "bg-warning" },
  loading: { text: "Loading model...", color: "bg-warning" },
  ready: { text: "Model ready", color: "bg-accent" },
  error: { text: "Model error", color: "bg-danger" },
};

export default function Layout({
  children,
  modelStatus,
  inferenceDevice,
  headerRight,
  headerStart,
  variant = "default",
}: LayoutProps) {
  const status = statusLabel[modelStatus];
  const deviceLabel = inferenceDevice === "webgpu" ? "GPU" : inferenceDevice === "wasm" ? "CPU" : null;
  const isWorkspace = variant === "workspace";

  return (
    <div
      className={
        isWorkspace
          ? "h-dvh bg-surface-0 grain flex flex-col overflow-hidden"
          : "min-h-screen bg-surface-0 grain flex flex-col overflow-x-clip"
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-surface-0/80 backdrop-blur-xl">
        <div
          className={`px-4 md:px-6 min-h-14 py-3 flex items-center justify-between flex-wrap gap-y-2 ${
            isWorkspace ? "w-full" : "max-w-7xl mx-auto"
          }`}
        >
          <div className="flex items-center gap-4">
            {headerStart}
            <SiteBrand />
            <Link
              href="/"
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Home
            </Link>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
              <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
              {status.text}
              {deviceLabel && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[10px] font-mono uppercase">
                  {deviceLabel}
                </span>
              )}
            </div>
          </div>

          {headerRight ?? <PrivacyBadge />}
        </div>
      </header>

      <main
        className={
          isWorkspace
            ? "w-full flex-1 flex flex-col min-h-0 overflow-hidden"
            : "w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1 flex flex-col min-h-min"
        }
      >
        {children}
      </main>
      {isWorkspace ? null : <Footer />}
    </div>
  );
}
