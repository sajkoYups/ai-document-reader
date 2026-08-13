import type { Metadata } from "next";
import SimplePageLayout from "@/components/SimplePageLayout";

const path = "/how-does-it-work";
const fullUrl = `${
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com").replace(
    /\/+$/,
    "",
  )
}${path}`;

export const metadata: Metadata = {
  title: "How does it work",
  description:
    "Add your document, choose Summarize, Review, Extract, or Ask, and get private AI results without storing your data.",
  alternates: {
    canonical: fullUrl,
  },
  openGraph: {
    url: fullUrl,
    title: "How PIA Works | Private AI in Your Browser",
    description:
      "See how PIA processes your documents privately in-browser or via a privacy-conscious API.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How PIA Works | Private AI in Your Browser",
    description:
      "Understand how PIA keeps your documents private while using AI workflows like Summarize, Review, Extract, and Ask.",
  },
};

export default function HowDoesItWorkPage() {
  return (
    <SimplePageLayout title="How does it work">
      <div className="text-text-secondary space-y-4">
        <p>
          You add your document by pasting text or uploading a file. We support
          PDF, plain text, and Markdown. Once the document is in the app, it is
          processed locally in your browser so we can find the right parts to
          send to the AI — or, with Deep Analysis, we encrypt the request and run
          a stronger model via privacy-constrained providers. Either way, you
          stay in control.
        </p>
        <p>
          You then choose a workflow:{" "}
          <strong className="text-text-primary">Summarize</strong> gives a
          structured overview and key points;{" "}
          <strong className="text-text-primary">Review</strong> surfaces items
          that may need attention with evidence;{" "}
          <strong className="text-text-primary">Extract</strong> pulls dates,
          amounts, obligations, and more into tables;{" "}
          <strong className="text-text-primary">Ask</strong> lets you question
          the document with grounded answers. Results appear next to your doc.
          No account is required for the standard, in-browser version.
        </p>
        <p>
          In standard mode, the AI runs entirely in your browser. Your document
          never leaves your device. We use open models that load and run
          locally, so even the content we send to the model stays on your
          machine. That’s why it’s private: there’s no server logging your text
          or training on it.
        </p>
        <p>
          If you use Deep Analysis, we encrypt your request to our API, process
          it in memory, and send only what is needed to privacy-constrained AI
          providers listed in our{" "}
          <a href="/trust-center#ai-subprocessors" className="text-accent underline">
            Trust Center
          </a>
          . We do not store your document or prompts. Providers process content
          for the request under their published policies; we do not use it for
          training. When you’re done, refreshing the page clears everything from
          the app.
        </p>
        <p>
          The app also builds a lightweight search index over your document so
          that for longer texts we can pull the most relevant passages into the
          AI’s context instead of sending the whole thing. That keeps responses
          focused and accurate without changing the privacy story: in standard
          mode that indexing happens in your browser too.
        </p>
        <p>
          In short: add a doc, pick summarize or explain or chat, get your
          result. Your data stays private, and when you close or refresh, it’s
          gone.
        </p>
      </div>
    </SimplePageLayout>
  );
}

