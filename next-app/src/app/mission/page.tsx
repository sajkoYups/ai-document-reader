import type { Metadata } from "next";
import SimplePageLayout from "@/components/SimplePageLayout";

const path = "/mission";
const fullUrl = `${
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com").replace(
    /\/+$/,
    "",
  )
}${path}`;

export const metadata: Metadata = {
  title: "Mission",
  description:
    "Our mission is to make private AI accessible to everyone who works with sensitive documents.",
  alternates: {
    canonical: fullUrl,
  },
  openGraph: {
    url: fullUrl,
    title: "Our Mission | Making Private AI Accessible",
    description:
      "Read about our mission to bring private AI to anyone working with sensitive documents.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Mission | Making Private AI Accessible",
    description:
      "Learn why we’re focused on making private AI the default for document analysis.",
  },
};

export default function MissionPage() {
  return (
    <SimplePageLayout title="Mission">
      <div className="text-text-secondary space-y-4">
        <p>
          Our mission is to make private AI accessible to everyone. We want
          anyone who needs to use AI on sensitive documents to be able to do so
          without giving up privacy or control.
        </p>
        <p>
          We believe nobody should have to choose between understanding their
          documents and keeping them confidential. So we build tools that do
          both: PIA for individuals and small teams, and private AI
          servers for companies that need to run models on their own
          infrastructure. Same principle everywhere — your data stays yours.
        </p>
        <p>
          We keep the standard version of PIA free and plan to keep it
          that way. Our goal is for everyone who wants to use AI privately to be
          able to. That means no paywall for the basics: paste a doc, get a
          summary or a plain-language explanation, or chat with it, all in your
          browser. No account required; PIA does not store your document.
        </p>
        <p>
          For organizations, we help design and deploy private AI so that
          sensitive work never has to leave their environment. We advise on when
          to use in-browser tools, when to run your own models, and how to avoid
          the risks of sending confidential material to third-party APIs. We see
          that as part of the same mission: extending the option of private AI
          to as many people and teams as possible.
        </p>
        <p>
          We’re a team of creatives and tech, marketing, and data enthusiasts
          who want to help the world be a little better. This is how we’re doing
          it: one tool, one deployment, one choice at a time — always with
          privacy in mind.
        </p>
      </div>
    </SimplePageLayout>
  );
}

