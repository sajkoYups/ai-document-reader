import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-0 grain flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="font-display text-xl text-text-primary tracking-tight">
            Doc Analyzer
          </h1>
          <Link
            to="/app"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
          >
            Open app
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <section className="animate-fade-in text-center mb-16 md:mb-24">
          <h2 className="font-display text-4xl md:text-5xl text-text-primary tracking-tight mb-4">
            Analyze documents using AI privately
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Paste or upload a document, pick a task, and get summaries, explanations, key extractions, or chat answers with AI processing in your browser or via API privately.
          </p>
        </section>

        <section className="animate-fade-in mb-16 md:mb-24" style={{ animationDelay: "0.1s" }}>
          <h3 className="font-display text-2xl text-text-primary tracking-tight mb-6">
            How it works
          </h3>
          <ol className="space-y-6 text-text-secondary">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-medium">
                1
              </span>
              <div>
                <strong className="text-text-primary">Add your document</strong> — Paste text or upload a PDF, TXT, or Markdown file.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-medium">
                2
              </span>
              <div>
                <strong className="text-text-primary">Choose a task</strong> — Summarize, explain in plain language, extract key points, draft from the doc, or chat with it.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-medium">
                3
              </span>
              <div>
                <strong className="text-text-primary">Get results</strong> — Output appears in the app. You can run in-browser (private) or use an API for faster, server-side processing.
              </div>
            </li>
          </ol>
        </section>

        <section className="animate-fade-in mb-16 md:mb-24" style={{ animationDelay: "0.15s" }}>
          <h3 className="font-display text-2xl text-text-primary tracking-tight mb-6">
            Your data stays private
          </h3>
          <div className="space-y-4 text-text-secondary">
            <p>
              Today, the AI runs <strong className="text-text-primary">in your browser</strong> — your document never leaves your device. With <strong className="text-text-primary">Deep analysis</strong> (coming soon), we will encrypt your document and analyze it on our side; we do not store it or save it.
            </p>
            <p>
              When you refresh the browser, everything is cleared. Your documents and results are never kept on our servers.
            </p>
          </div>
        </section>

        <section className="animate-fade-in mb-16 md:mb-24 rounded-xl bg-surface-0" style={{ animationDelay: "0.18s" }}>
          <h3 className="font-display text-2xl text-text-primary tracking-tight mb-4">
            Standard is free — and always will be
          </h3>
          <p className="text-text-secondary">
            The Standard version is free. Our goal is for everyone who wants to use AI privately to be able to do so.
          </p>
        </section>

        <section className="animate-fade-in mb-16 md:mb-24 rounded-xl bg-surface-0" style={{ animationDelay: "0.2s" }}>
          <h3 className="font-display text-xl text-text-primary tracking-tight mb-2">
            Deep analysis — coming soon
          </h3>
          <p className="text-text-secondary text-sm">
            Deep analysis will be a <strong className="text-text-primary">paid feature</strong>. Stay tuned for more capable document analysis and insights.
          </p>
        </section>

        <section className="animate-fade-in text-center" style={{ animationDelay: "0.3s" }}>
          <Link
            to="/app"
            className="inline-flex items-center px-6 py-3 rounded-lg text-base font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
          >
            Open app
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
