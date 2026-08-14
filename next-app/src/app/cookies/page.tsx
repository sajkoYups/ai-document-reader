import type { Metadata } from "next";
import Link from "next/link";
import SimplePageLayout from "@/components/SimplePageLayout";
import { PRIVACY_EMAIL } from "@/lib/securityContacts";

const path = "/cookies";
const fullUrl = `${
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com").replace(
    /\/+$/,
    "",
  )
}${path}`;

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Cookies and similar technologies PIA uses: necessary session and auth cookies, optional analytics, and waitlist reCAPTCHA.",
  alternates: {
    canonical: fullUrl,
  },
};

export default function CookiesPage() {
  return (
    <SimplePageLayout title="Cookie Policy">
      <div className="text-text-secondary space-y-6">
        <p className="text-sm text-text-muted">
          This page explains cookies and similar technologies on PIA. Related
          data practices are in the{" "}
          <Link href="/privacy" className="text-accent underline">
            Privacy Policy
          </Link>
          .
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">
            Strictly necessary
          </h2>
          <p>
            These are needed for the app to work. They are not used for
            advertising.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Session and security cookies for the site (including HTTPS
              session).
            </li>
            <li>
              Clerk authentication cookies when you sign in for Deep Analysis.
            </li>
            <li>
              A local preference recording whether you accepted or rejected
              analytics (<code className="text-text-primary">doc-analyzer-consent-v1</code>
              ).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">
            Analytics (optional)
          </h2>
          <p>
            If you accept analytics, we load Google Analytics to measure page
            views. We do not send document or prompt content to Google. The
            Google tag is not loaded until you accept. You can reject analytics
            and still use PIA.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">
            reCAPTCHA (waitlist only)
          </h2>
          <p>
            Google reCAPTCHA Enterprise loads only when you open the Deep
            Analysis waitlist form, to reduce spam signups. It is not loaded on
            the rest of the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">
            How to choose
          </h2>
          <p>
            Use the cookie banner to accept or reject analytics. Clearing site
            data in your browser resets that choice. Questions:{" "}
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
