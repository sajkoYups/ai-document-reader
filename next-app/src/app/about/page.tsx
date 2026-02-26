import type { Metadata } from "next";
import SimplePageLayout from "@/components/SimplePageLayout";

const path = "/about";
const fullUrl = `${
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com").replace(
    /\/+$/,
    "",
  )
}${path}`;

export const metadata: Metadata = {
  title: "About us",
  description:
    "We are Yups — a team building Doc Analyzer so you can use AI on documents without sending them to the cloud.",
  alternates: {
    canonical: fullUrl,
  },
  openGraph: {
    url: fullUrl,
    title: "About Us | Doc Analyzer – Private AI for Your Documents",
    description:
      "Meet the team behind Doc Analyzer and learn why we care about private AI for documents.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | Doc Analyzer – Private AI for Your Documents",
    description:
      "Learn more about Yups, the team building Doc Analyzer for private document analysis.",
  },
};

export default function AboutPage() {
  return (
    <SimplePageLayout title="About us">
      <div className="text-text-secondary space-y-5">
        <p>
          We are <strong className="text-text-primary">Yups</strong> — a team of
          creatives who wanted a tool to help people understand documents in a
          private way. We built Doc Analyzer so you can use AI on your docs
          without sending them to the cloud.
        </p>
        <p>
          We are tech, marketing, and data enthusiasts who want to help the
          world be a little better.
        </p>
        <p>
          We believe everyone deserves to work with AI on the things that matter
          — contracts, reports, ideas — without having to choose between clarity
          and privacy. Good tools should respect you, not mine your data.
        </p>
        <p>
          Doc Analyzer is our way of putting that belief into practice: a place
          where your documents stay yours, and understanding them gets a little
          easier.
        </p>
      </div>
    </SimplePageLayout>
  );
}

