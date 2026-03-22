import type { ReactNode } from "react";
import Link from "next/link";
import Footer from "./Footer";
import SiteBrand from "./SiteBrand";

interface SimplePageLayoutProps {
  title: string;
  children: ReactNode;
}

export default function SimplePageLayout({
  title,
  children,
}: SimplePageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-0 grain flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <SiteBrand />
          <Link
            href="/app"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
          >
            Open app
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1">
        <h1 className="font-display text-3xl md:text-4xl text-text-primary tracking-tight mb-6">
          {title}
        </h1>
        {children}
      </main>

      <Footer />
    </div>
  );
}

