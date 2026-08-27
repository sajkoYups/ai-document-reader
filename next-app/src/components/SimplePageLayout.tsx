import type { ReactNode } from "react";
import Footer from "./Footer";
import MarketingHeader from "./MarketingHeader";

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
      <MarketingHeader />

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
