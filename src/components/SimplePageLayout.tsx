import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import Footer from "./Footer";

interface SimplePageLayoutProps {
  title: string;
  children: ReactNode;
}

export default function SimplePageLayout({ title, children }: SimplePageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-0 grain flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-display text-xl text-text-primary tracking-tight hover:text-accent transition-colors">
            Doc Analyzer
          </Link>
          <Link
            to="/app"
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
