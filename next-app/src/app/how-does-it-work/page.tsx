import Link from "next/link";
import SimplePageLayout from "@/components/SimplePageLayout";
import { howToJsonLd, pageMetadata } from "@/seo";

export const metadata = pageMetadata("/how-does-it-work");

const howToLd = howToJsonLd();

export default function HowDoesItWorkPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <SimplePageLayout title="How private in-browser document AI works">
      <div className="text-text-secondary space-y-8">
        <p>
          You add a document, pick a workflow, and get structured results.
          Standard mode runs in your browser: the file is not uploaded. Deep
          Analysis is optional when you want a stronger server-side model. No
          account is required for the free version. See{" "}
          <Link href="/pricing" className="text-accent underline">
            private AI document analysis pricing
          </Link>{" "}
          if you need Deep Analysis volume.
        </p>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Add your document
          </h2>
          <p>
            Paste text or upload a PDF, plain text, or Markdown file. Once the
            document is in the app, Standard mode processes it locally so we can
            find the right passages. With Deep Analysis we encrypt the request
            to our API and run a stronger model via privacy-constrained
            providers listed in the{" "}
            <Link href="/trust-center#ai-subprocessors" className="text-accent underline">
              Trust Center
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Summarize
          </h2>
          <p>
            Get a structured overview and key points instead of a generic
            paragraph. Use this when you need to understand a long contract,
            policy, or report quickly without reading every page first.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Review
          </h2>
          <p>
            Surfaces items that may need attention, with evidence from the
            document. Use this when you want potential issues, obligations, or
            unusual clauses called out rather than a high-level summary.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Extract
          </h2>
          <p>
            Pulls dates, amounts, parties, obligations, and other fields into
            tables. Use this when you need structured data from a document
            rather than prose.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Compare
          </h2>
          <p>
            Place two documents side by side and highlight what changed. Useful
            for contract versions, policy revisions, or redlines you do not want
            to send to a public chatbot.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Timeline
          </h2>
          <p>
            Build a chronology across up to three files in a session. Use this
            for matters, projects, or reports where dates and sequence matter.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Ask
          </h2>
          <p>
            Question the document and get grounded answers that point back to
            the source. For longer texts, PIA builds a lightweight search index
            so the model sees the most relevant passages instead of the whole
            file. In Standard mode that indexing happens in your browser too.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Standard vs Deep Analysis
          </h2>
          <p>
            In Standard mode the AI runs entirely in your browser. Your document
            never leaves your device. We use open models that load and run
            locally, so even the content sent to the model stays on your
            machine. There is no server logging your text or training on it.
          </p>
          <p>
            If you use Deep Analysis, we encrypt your request to our API,
            decrypt it in memory, and send the needed text over TLS to
            privacy-constrained AI providers. We do not store your document or
            prompts. Providers process content for the request under their
            published policies; we do not use it for training. Refreshing the
            page clears everything from the app.
          </p>
        </section>

        <p>
          In short: add a doc, pick a workflow, get a result. Your data stays
          private, and when you close or refresh, it’s gone.{" "}
          <Link href="/who-is-this-for" className="text-accent underline">
            See who this is for
          </Link>{" "}
          if you work with contracts, reports, or unpublished drafts.
        </p>
      </div>
    </SimplePageLayout>
    </>
  );
}
