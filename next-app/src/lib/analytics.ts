export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

type AnalyticsConsent = "granted" | "denied";

type ConsentUpdate = {
  analytics: AnalyticsConsent;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const isBrowser = typeof window !== "undefined";

export function updateConsent({ analytics }: ConsentUpdate) {
  if (!isBrowser || typeof window.gtag !== "function") return;

  window.gtag("consent", "update", {
    analytics_storage: analytics,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function trackPageView(path: string) {
  if (!isBrowser || typeof window.gtag !== "function" || !GA_MEASUREMENT_ID) {
    return;
  }

  window.gtag("event", "page_view", {
    page_path: path,
  });
}

