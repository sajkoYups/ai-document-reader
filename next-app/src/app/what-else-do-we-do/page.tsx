import type { Metadata } from "next";
import SimplePageLayout from "@/components/SimplePageLayout";

const path = "/what-else-do-we-do";
const fullUrl = `${
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com").replace(
    /\/+$/,
    "",
  )
}${path}`;

export const metadata: Metadata = {
  title: "What else do we do",
  description:
    "Beyond PIA, we build private AI servers and advise teams on privacy-conscious AI adoption.",
  alternates: {
    canonical: fullUrl,
  },
  openGraph: {
    url: fullUrl,
    title: "What Else We Do | Private AI Servers & Consulting",
    description:
      "Discover our private AI server offerings and consulting for privacy-conscious teams.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Else We Do | Private AI Servers & Consulting",
    description:
      "Learn how we help companies deploy private AI servers and adopt AI without sacrificing privacy.",
  },
};

export default function WhatElseDoWeDoPage() {
  return (
    <SimplePageLayout title="What else do we do">
      <div className="text-text-secondary space-y-4">
        <p>
          Besides PIA, we work on private and useful AI — for
          individuals and for organizations. Our goal is to help people get
          value from AI without giving up control of their data.
        </p>
        <p>
          We <strong className="text-text-primary">build private AI servers for companies</strong>. If your
          organization wants to run models on your own infrastructure — on-prem
          or in a trusted cloud — so that sensitive data never leaves your
          control, we can help you design, deploy, and run private AI stacks. No
          training on your data, no sending documents to third-party APIs; you
          own the pipeline.
        </p>
        <p>
          We also advise teams on how to adopt AI in a privacy-conscious way:
          when to use in-browser or on-device tools like PIA, when a
          private server makes sense, and how to avoid the “paste everything
          into ChatGPT” trap for confidential work.
        </p>
        <p>
          In everything we do — from PIA to private deployments — we
          focus on tools that respect users and their data. If you’re interested
          in private AI for your company or want to learn more, we’d be glad to
          hear from you.
        </p>
      </div>
    </SimplePageLayout>
  );
}

