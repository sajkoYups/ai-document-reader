import Link from "next/link";
import SimplePageLayout from "@/components/SimplePageLayout";
import { CONTACT_EMAIL } from "@/lib/securityContacts";
import { pageMetadata } from "@/seo";

export const metadata = pageMetadata("/what-else-do-we-do");

export default function WhatElseDoWeDoPage() {
  return (
    <SimplePageLayout title="What else we do">
      <div className="text-text-secondary space-y-4">
        <p>
          Besides PIA, we work on private and useful AI, for
          individuals and for organizations. Our goal is to help people get
          value from AI without giving up control of their data.
        </p>
        <p>
          We <strong className="text-text-primary">build private AI servers for companies</strong>. If your
          organization wants to run models on your own infrastructure (on-prem
          or in a trusted cloud) so that sensitive data never leaves your
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
          In everything we do, from PIA to private deployments, we
          focus on tools that respect users and their data. If you’re interested
          in private AI for your company or want to learn more, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          <Link href="/how-does-it-work" className="text-accent underline">
            See how PIA’s in-browser private analysis works
          </Link>{" "}
          if you want the self-serve product first.
        </p>
      </div>
    </SimplePageLayout>
  );
}
