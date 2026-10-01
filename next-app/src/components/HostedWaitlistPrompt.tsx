"use client";

import { useEffect, useState } from "react";
import { useTour } from "@reactour/tour";
import { useAppOnboarding } from "./AppOnboarding";
import WaitlistCta from "./WaitlistCta";

const DISMISS_KEY = "doc-analyzer-hosted-waitlist-dismissed";

export default function HostedWaitlistPrompt() {
  const { isOpen } = useTour();
  const { hasCompleted } = useAppOnboarding();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  if (!hasCompleted || isOpen || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[min(18rem,calc(100vw-2rem))] animate-fade-in
        rounded-lg border border-accent-border bg-surface-1/95 backdrop-blur-sm
        px-4 py-3 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-medium text-text-primary">
          Hosted model, free to try
        </p>
        <button
          type="button"
          aria-label="Dismiss waitlist prompt"
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, "true");
            setDismissed(true);
          }}
          className="shrink-0 -mr-1 -mt-0.5 p-1 text-text-muted hover:text-text-primary transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Join the waitlist. The €9 Lite plan is free until 31 October.
      </p>
      <WaitlistCta className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity">
        Join the waitlist
      </WaitlistCta>
    </div>
  );
}
