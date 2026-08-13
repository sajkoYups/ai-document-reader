import type { Metadata } from "next";
import Link from "next/link";
import SimplePageLayout from "@/components/SimplePageLayout";
import { PRIVACY_EMAIL } from "@/lib/securityContacts";

const path = "/privacy";
const fullUrl = `${
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com").replace(
    /\/+$/,
    "",
  )
}${path}`;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How PIA handles documents, accounts, analytics, and subprocessors in Standard and Deep Analysis modes.",
  alternates: {
    canonical: fullUrl,
  },
};

export default function PrivacyPage() {
  return (
    <SimplePageLayout title="Privacy Policy">
      <div className="text-text-secondary space-y-6">
        <p className="text-sm text-text-muted">
          This page describes how PIA handles personal data and document
          content. It is aligned with our{" "}
          <Link href="/trust-center" className="text-accent underline">
            Trust Center
          </Link>
          . It is not a substitute for legal advice.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">
            Two processing modes
          </h2>
          <p>
            <strong className="text-text-primary">Standard</strong> runs in your
            browser. Your document is not uploaded to PIA. The open tab holds
            the text in memory until idle timeout, refresh, or close.
          </p>
          <p>
            <strong className="text-text-primary">Deep Analysis</strong>{" "}
            encrypts the request to our API (application-layer session
            encryption). We decrypt in memory and send the text over TLS to
            named privacy-constrained providers. PIA does not store documents or
            prompts. Providers process plaintext for that request under their
            published policies. See{" "}
            <Link
              href="/trust-center#ai-subprocessors"
              className="text-accent underline"
            >
              AI subprocessors
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">
            What PIA stores
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-text-primary">Documents and prompts</strong>
              — not in our database.
            </li>
            <li>
              <strong className="text-text-primary">Accounts</strong> — if you
              sign in (Clerk), identity such as email is stored by the auth
              provider so we can gate Deep Analysis.
            </li>
            <li>
              <strong className="text-text-primary">Waitlist</strong> — name and
              email, encrypted at rest, to contact you about Deep Analysis
              access.
            </li>
            <li>
              <strong className="text-text-primary">Usage</strong> — aggregate
              token estimates per signed-in user for billing, not document text.
            </li>
            <li>
              <strong className="text-text-primary">Feedback</strong> — the
              message you choose to send.
            </li>
            <li>
              <strong className="text-text-primary">Analytics</strong> — page
              views only if you accept analytics cookies. See the{" "}
              <Link href="/cookies" className="text-accent underline">
                Cookie Policy
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">
            Retention
          </h2>
          <p>
            Browser session data is discarded on idle timeout (15 minutes),
            refresh, or tab close. Backend inference data is discarded when the
            request finishes. Account, waitlist, and usage records are kept only
            as long as needed to provide the service. Downstream AI providers
            may apply a short legal or abuse hold under their own policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">
            Your rights
          </h2>
          <p>
            Depending on where you live, you may have rights to access, correct,
            delete, or restrict processing of personal data we hold (for
            example account or waitlist details). Document text in Standard mode
            never reaches our servers. To exercise rights or ask a question,
            email{" "}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-accent underline">
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </SimplePageLayout>
  );
}
