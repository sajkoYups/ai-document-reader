import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import SiteBrand from "@/components/SiteBrand";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Private Mode is free forever. Deep Analysis paid plans start at €9/month for AI-powered document analysis.",
  alternates: {
    canonical: `${siteUrl}/pricing`,
  },
  openGraph: {
    url: `${siteUrl}/pricing`,
    title: "Pricing | PIA – Private AI for Your Documents",
    description:
      "Private Mode is free forever. Deep Analysis plans start at €9/month.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | PIA – Private AI for Your Documents",
    description:
      "Private Mode is free forever. Deep Analysis plans start at €9/month.",
  },
};

const deepAnalysisTiers = [
  {
    name: "Lite",
    price: "€9",
    volume: "10 analyses / month",
    bestFor: "Best for entry users exploring AI document analysis",
    highlight: false,
  },
  {
    name: "Starter",
    price: "€29",
    volume: "75 analyses / month",
    bestFor: "Best for regular users with ongoing document workflows",
    highlight: true,
  },
  {
    name: "Pro",
    price: "€79",
    volume: "200 analyses / month",
    bestFor: "Best for bigger legal teams processing many documents",
    highlight: false,
  },
  {
    name: "Business",
    price: "€299",
    volume: "500+ analyses / month",
    bestFor: "Best for large legal businesses with high-volume needs",
    highlight: false,
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface-0 grain flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <SiteBrand />
          <Link
            href="/app"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
          >
            Open app
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20 flex-1 w-full">
        {/* Hero */}
        <section className="animate-fade-in text-center mb-16 md:mb-20">
          <h1 className="font-display text-4xl md:text-5xl text-text-primary tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            Private Mode is free — and always will be. Deep Analysis is a paid
            feature built for higher-volume and team use.
          </p>
        </section>

        {/* Standard / Private mode */}
        <section
          className="animate-fade-in mb-16 md:mb-20"
          style={{ animationDelay: "0.08s" }}
        >
          <div className="rounded-2xl border border-border bg-surface-1 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl text-text-primary tracking-tight">
                  Private Mode
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/25">
                  Free forever
                </span>
              </div>
              <p className="text-text-secondary max-w-lg">
                The AI runs entirely in your browser. Your document never leaves
                your device — nothing is sent to our servers. No account
                required to get started.
              </p>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                {[
                  "100% in-browser processing",
                  "No account required",
                  "No usage limits",
                  "Document cleared on page refresh",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-accent flex-shrink-0"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-shrink-0">
              <div className="text-right mb-4">
                <span className="font-display text-4xl text-text-primary">
                  €0
                </span>
                <span className="text-text-muted text-sm"> / month</span>
              </div>
              <Link
                href="/app"
                className="inline-flex items-center justify-center w-full md:w-auto px-6 py-2.5 rounded-lg text-sm font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
              >
                Open app
              </Link>
            </div>
          </div>
        </section>

        {/* Deep Analysis tiers */}
        <section
          className="animate-fade-in"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-display text-2xl text-text-primary tracking-tight">
                Deep Analysis
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-3 text-text-secondary border border-border">
                Waitlist — coming soon
              </span>
            </div>
            <p className="text-text-secondary max-w-2xl">
              A stronger, server-side AI model for deeper document analysis.
              We encrypt your document for processing and never store it on PIA
              systems; providers are listed in our{" "}
              <a href="/trust-center#ai-subprocessors" className="text-accent underline">
                Trust Center
              </a>
              . Choose the plan that fits your volume.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {deepAnalysisTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl border p-6 flex flex-col gap-4 transition-colors ${
                  tier.highlight
                    ? "border-accent/40 bg-surface-2 ring-1 ring-accent/20"
                    : "border-border bg-surface-1"
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-surface-0">
                    Most popular
                  </span>
                )}

                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                    {tier.name}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl text-text-primary">
                      {tier.price}
                    </span>
                    <span className="text-text-muted text-sm">/ month</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-primary">
                    {tier.volume}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {tier.bestFor}
                  </p>
                </div>

                <div className="mt-auto pt-2">
                  <Link
                    href="/app"
                    className={`inline-flex items-center justify-center w-full px-4 py-2 rounded-lg text-sm font-medium transition-opacity ${
                      tier.highlight
                        ? "bg-accent text-surface-0 hover:opacity-90"
                        : "bg-surface-3 text-text-primary hover:bg-surface-2 border border-border"
                    }`}
                  >
                    Join the waitlist
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Token footnote */}
          <p className="text-xs text-text-muted text-center border-t border-border pt-6">
            Analyses are counted by token usage internally — very long documents
            may count as more than one analysis.{" "}
            <span className="text-text-secondary">
              Your exact usage is always visible in your account dashboard.
            </span>
          </p>
        </section>

        {/* FAQ-style callout */}
        <section
          className="animate-fade-in mt-16 md:mt-20 rounded-xl bg-surface-1 border border-border p-8 text-center"
          style={{ animationDelay: "0.22s" }}
        >
          <h2 className="font-display text-xl text-text-primary tracking-tight mb-2">
            Not sure which plan is right for you?
          </h2>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            Start with Private Mode for free. When you need more power, join the
            Deep Analysis waitlist and we&apos;ll reach out when a spot opens.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center px-6 py-2.5 rounded-lg text-sm font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
          >
            Try for free — no sign-up needed
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
