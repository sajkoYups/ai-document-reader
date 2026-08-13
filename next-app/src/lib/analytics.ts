export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

type AnalyticsConsent = "granted" | "denied";

type ConsentUpdate = {
  analytics: AnalyticsConsent;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: IArguments[];
  }
}

const isBrowser = typeof window !== "undefined";

let analyticsLoaded = false;

/**
 * Loads Google Analytics only after the user grants analytics consent.
 * Does nothing if the measurement ID is unset or the script is already loaded.
 */
export function loadGoogleAnalytics() {
  if (!isBrowser || !GA_MEASUREMENT_ID || analyticsLoaded) return;
  analyticsLoaded = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // Official gtag snippet uses the Arguments object, not a rest array.
    // eslint-disable-next-line prefer-rest-params
    (window.dataLayer as IArguments[]).push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("config", GA_MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function updateConsent({ analytics }: ConsentUpdate) {
  if (analytics === "granted") {
    loadGoogleAnalytics();
    return;
  }

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
