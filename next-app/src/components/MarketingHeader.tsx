import Link from "next/link";
import SiteBrand from "./SiteBrand";

const navLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/how-does-it-work", label: "How it works" },
  { href: "/trust-center", label: "Trust" },
] as const;

export default function MarketingHeader({
  brandPriority = false,
  containerClassName = "max-w-4xl",
}: {
  brandPriority?: boolean;
  containerClassName?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-xl">
      <div
        className={`${containerClassName} mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2`}
      >
        <SiteBrand priority={brandPriority} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary"
            aria-label="Primary"
          >
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-text-primary transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/app"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
          >
            Open app
          </Link>
        </div>
      </div>
    </header>
  );
}
