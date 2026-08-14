"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { type ReactNode, useState, useEffect } from "react";

/**
 * Wraps children with ClerkProvider only on the client after mount.
 * During static build/SSR we skip ClerkProvider so no publishableKey is required.
 * At runtime (client), ClerkProvider runs and keyless mode can supply keys when env is unset.
 */
export default function ClerkWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render children until ClerkProvider is in the tree; otherwise
  // components that use useAuth() (e.g. App) throw "useAuth can only be used within ClerkProvider"
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <span className="text-text-secondary text-sm">Loading…</span>
      </div>
    );
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
