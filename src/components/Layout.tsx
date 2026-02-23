import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import PrivacyBadge from "./PrivacyBadge";
import Footer from "./Footer";
import type { ModelStatus } from "@/types";

interface LayoutProps {
  children: ReactNode;
  modelStatus: ModelStatus;
  inferenceDevice?: "webgpu" | "wasm" | null;
}

const statusLabel: Record<ModelStatus, { text: string; color: string }> = {
  idle: { text: "Model not loaded", color: "bg-text-muted" },
  downloading: { text: "Downloading model...", color: "bg-warning" },
  loading: { text: "Loading model...", color: "bg-warning" },
  ready: { text: "Model ready", color: "bg-accent" },
  error: { text: "Model error", color: "bg-danger" },
};

export default function Layout({ children, modelStatus, inferenceDevice }: LayoutProps) {
  const status = statusLabel[modelStatus];
  const deviceLabel = inferenceDevice === "webgpu" ? "GPU" : inferenceDevice === "wasm" ? "CPU" : null;

  return (
    <div className="min-h-screen bg-surface-0 grain flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-display text-xl text-text-primary tracking-tight hover:text-accent transition-colors">
              Doc Analyzer
            </Link>
            <Link to="/" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
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

          <PrivacyBadge />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
