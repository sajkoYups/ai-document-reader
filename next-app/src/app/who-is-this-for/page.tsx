import Link from "next/link";
import SimplePageLayout from "@/components/SimplePageLayout";
import { pageMetadata } from "@/seo";

export const metadata = pageMetadata("/who-is-this-for");

export default function WhoIsThisForPage() {
  return (
    <SimplePageLayout title="Private document AI for contracts, reports, and policies">
      <div className="text-text-secondary space-y-8">
        <p>
          PIA is for anyone who needs to understand documents quickly
          and privately: contracts, reports, policies, or any text you don’t
          want to paste into a public AI tool.{" "}
          <Link href="/how-does-it-work" className="text-accent underline">
            In-browser private analysis
          </Link>{" "}
          is free. Deep Analysis is optional when you need a stronger model.
        </p>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Legal drafts and confidential contracts
          </h2>
          <p>
            If you work with legal drafts, internal memos, or health and
            financial information, you need summaries and plain-language
            explanations without sending that content to a public chatbot. In
            Standard mode your document stays on your device. Deep Analysis
            encrypts the request to our API; named providers then process the
            text. PIA does not store it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Small teams and solo professionals
          </h2>
          <p>
            Small teams often don’t have enterprise contracts or compliance
            budgets. You still deserve private AI. The standard version is free
            and runs in your browser, so you can understand contracts, terms,
            and reports without signing up for another SaaS or agreeing to data
            mining.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Students and researchers
          </h2>
          <p>
            Summarize papers, explain dense sections, or extract key points
            without feeding your reading list into someone else’s training data.
            Refresh the page when you are done and the working copy is gone.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Journalists, writers, and unpublished work
          </h2>
          <p>
            If you handle unpublished or sensitive text, PIA lets you review
            drafts and source material without uploading the file to a consumer
            chatbot. Use Review for items that may need attention, Extract for
            dates and amounts, and Ask for grounded questions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-primary tracking-tight">
            Anyone tired of pasting confidential text into chatbots
          </h2>
          <p>
            If you’re wondering where that paste went, PIA is for you too. No
            sign-up for the free version. When you’re done, refresh and it’s
            gone. Read the{" "}
            <Link href="/trust-center" className="text-accent underline">
              Trust Center
            </Link>{" "}
            for how Standard and Deep Analysis handle data.
          </p>
        </section>
      </div>
    </SimplePageLayout>
  );
}
