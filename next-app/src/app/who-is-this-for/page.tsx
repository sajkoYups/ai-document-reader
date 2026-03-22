import type { Metadata } from "next";
import SimplePageLayout from "@/components/SimplePageLayout";

const path = "/who-is-this-for";
const fullUrl = `${
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com").replace(
    /\/+$/,
    "",
  )
}${path}`;

export const metadata: Metadata = {
  title: "Who is this for",
  description:
    "PIA is for anyone who needs to understand documents quickly and privately: contracts, reports, policies, or any text you don’t want in public AI tools.",
  alternates: {
    canonical: fullUrl,
  },
  openGraph: {
    url: fullUrl,
    title: "Who Is PIA For? | Private Document AI",
    description:
      "Learn who benefits most from PIA’s private AI document analysis.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Who Is PIA For? | Private Document AI",
    description:
      "See how PIA helps professionals, teams, and privacy-conscious users work with sensitive documents.",
  },
};

export default function WhoIsThisForPage() {
  return (
    <SimplePageLayout title="Who is this for">
      <div className="text-text-secondary space-y-4">
        <p>
          PIA is for anyone who needs to understand documents quickly
          and privately: contracts, reports, policies, or any text you don’t
          want to paste into a public AI tool.
        </p>
        <p>
          If you work with sensitive or confidential material — legal drafts,
          internal memos, health or financial info — you need a way to get
          summaries and plain-language explanations without sending that content
          to third parties. We built PIA for you. Your document stays
          on your device or is handled under encryption; we don’t store it.
        </p>
        <p>
          Small teams and solo professionals often don’t have enterprise
          contracts or compliance budgets. You still deserve private AI. The
          standard version is free and runs in your browser, so you can
          understand contracts, terms, and reports without signing up for yet
          another SaaS or agreeing to data mining.
        </p>
        <p>
          Students and researchers who care about privacy can use PIA
          to summarize papers, explain dense sections, or extract key points —
          without feeding your reading list into someone else’s training data.
          Same idea for journalists, writers, and anyone who handles unpublished
          or sensitive text.
        </p>
        <p>
          If you’re simply tired of pasting confidential stuff into chatbots and
          wondering where it goes, PIA is for you too. We believe
          everyone who wants to use AI privately should be able to. No sign-up
          required for the free version; when you’re done, refresh and it’s
          gone.
        </p>
      </div>
    </SimplePageLayout>
  );
}

