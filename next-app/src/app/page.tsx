import Link from "next/link";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import WaitlistCta from "@/components/WaitlistCta";
import { pageMetadata } from "@/seo";

export const metadata = pageMetadata("/");

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-0 grain flex flex-col">
      <MarketingHeader brandPriority />

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <section className="text-center mb-16 md:mb-24">
          <h1 className="font-display text-4xl md:text-5xl text-text-primary tracking-tight mb-4">
            Analyze documents using AI privately
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Paste or upload a document, pick a workflow, and get structured
            summaries, reviews, extractions, or Ask answers, with AI processing in
            your browser or via Deep Analysis.
          </p>
          <p className="text-sm text-text-muted max-w-xl mx-auto mt-4">
            Built for{" "}
            <Link href="/who-is-this-for" className="text-accent underline">
              contracts, reports, and policies
            </Link>
            . See{" "}
            <Link href="/private-ai-vs-chatgpt" className="text-accent underline">
              how private AI compares to ChatGPT
            </Link>{" "}
            if you would not paste those files into a public chatbot.
          </p>
        </section>

        <section
          className="animate-fade-in mb-16 md:mb-24"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="font-display text-2xl text-text-primary tracking-tight mb-6">
            How it works
          </h2>
          <ol className="space-y-6 text-text-secondary">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-medium">
                1
              </span>
              <div>
                <strong className="text-text-primary">Add your document</strong>
                : paste text or upload a PDF, TXT, or Markdown file.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-medium">
                2
              </span>
              <div>
                <strong className="text-text-primary">Choose a workflow</strong>
                : Summarize, Review, Extract, Compare, Timeline, or Ask,
                including multi-document sessions. Structured results stream in
                as they are ready.{" "}
                <Link href="/how-does-it-work" className="text-accent underline">
                  See how in-browser private analysis works
                </Link>
                .
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-medium">
                3
              </span>
              <div>
                <strong className="text-text-primary">Get results</strong>:
                output appears in the app. You can run in-browser (private) or
                use an API for faster, server-side processing.
              </div>
            </li>
          </ol>
        </section>

        <section
          className="animate-fade-in mb-16 md:mb-24"
          style={{ animationDelay: "0.15s" }}
        >
          <h2 className="font-display text-2xl text-text-primary tracking-tight mb-6">
            Your data stays private
          </h2>
          <div className="space-y-4 text-text-secondary">
            <p>
              Today, the AI runs{" "}
              <strong className="text-text-primary">in your browser</strong>, so
              your document never leaves your device. With{" "}
              <strong className="text-text-primary">Deep Analysis</strong>, we
              encrypt your request to our API, then named privacy-constrained
              providers process the text; we do not store documents or prompts on PIA systems.
            </p>
            <p>
              When you refresh the browser, everything is cleared. Your
              documents and results are never kept on our servers. Details are
              in the{" "}
              <Link href="/trust-center" className="text-accent underline">
                Trust Center
              </Link>
              .
            </p>
          </div>
        </section>

        <section
          className="animate-fade-in mb-16 md:mb-24 rounded-xl bg-surface-0"
          style={{ animationDelay: "0.18s" }}
        >
          <h2 className="font-display text-2xl text-text-primary tracking-tight mb-4">
            Standard is free, and always will be
          </h2>
          <p className="text-text-secondary">
            The Standard version is free. Our goal is for everyone who wants to
            use AI privately to be able to do so.
          </p>
        </section>

        <section
          className="animate-fade-in mb-16 md:mb-24"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl text-text-primary tracking-tight">
                  Deep Analysis (coming soon)
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-3 text-text-secondary border border-border">
                  Paid feature
                </span>
              </div>
              <p className="text-text-secondary text-sm">
                A stronger, server-side AI model for more capable document
                analysis. We encrypt your document to our API for processing and do not
                store it on PIA systems; inference uses privacy-constrained
                providers listed in our{" "}
                <Link href="/trust-center#ai-subprocessors" className="text-accent underline">
                  Trust Center
                </Link>
                . Plans start at{" "}
                <strong className="text-text-primary">€9/month</strong>. The €9
                plan is free until 31 October 2026.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-surface-3 text-text-primary hover:bg-surface-2 border border-border transition-colors"
            >
              See pricing →
            </Link>
            <WaitlistCta className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Join the waitlist
            </WaitlistCta>
          </div>
        </section>

        <section
          className="animate-fade-in text-center"
          style={{ animationDelay: "0.3s" }}
        >
          <Link
            href="/app"
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
