"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { updateConsent } from "@/lib/analytics";

type AnalyticsConsent = "granted" | "denied";

type StoredConsent = {
  analytics: AnalyticsConsent;
};

const STORAGE_KEY = "doc-analyzer-consent-v1";

function readStoredConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed && (parsed.analytics === "granted" || parsed.analytics === "denied")) {
      return parsed;
    }
  } catch {
    // ignore parse errors and treat as no consent
  }
  return null;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    if (!stored) {
      // Initial mount: show banner when no stored consent is found.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }

    // keep Consent Mode in sync across visits
    updateConsent({ analytics: stored.analytics });
  }, []);

  const handleAccept = () => {
    const consent: StoredConsent = { analytics: "granted" };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    }
    updateConsent({ analytics: consent.analytics });
    setVisible(false);
  };

  const handleReject = () => {
    const consent: StoredConsent = { analytics: "denied" };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    }
    updateConsent({ analytics: consent.analytics });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-2xl border border-border bg-surface-0/95 shadow-lg backdrop-blur-md p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm text-text-secondary">
            <p className="font-medium text-text-primary mb-1">
              Cookies & analytics
            </p>
            <p>
              We use cookies to understand how PIA is used. You can
              accept or reject analytics cookies. The app will still work even
              if you reject. See our{" "}
              <Link href="/cookies" className="text-accent underline">
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-accent underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={handleReject}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-primary bg-transparent hover:bg-surface-0/80 transition-colors"
            >
              Reject analytics
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
            >
              Accept analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

