import type { Metadata } from "next";
import Script from "next/script";
import ClerkWrapper from "@/components/ClerkWrapper";
import CookieBanner from "@/components/CookieBanner";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  title: {
    default: "Private AI Document Analysis | PIA",
    template: "%s | PIA",
  },
  description:
    "Analyze documents with AI privately. Summarize, Review, Extract, or Ask — structured results in your browser or via Deep Analysis. No account for Standard mode, no data stored.",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Private AI Document Analysis | PIA",
    description:
      "Analyze documents with AI privately. Summarize, Review, Extract, or Ask — structured results in your browser or via Deep Analysis.",
    siteName: "PIA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Private AI Document Analysis | PIA",
    description:
      "Analyze documents with AI privately. Summarize, Review, Extract, or Ask — structured results in your browser or via Deep Analysis.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      url: siteUrl,
      name: "PIA",
      description:
        "Analyze documents with AI privately in your browser or via a privacy-conscious API.",
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "Yups",
      url: siteUrl,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-surface-0 text-text-primary">
        {GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-consent-default" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('consent', 'default', {
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  analytics_storage: 'denied',
                  functionality_storage: 'granted',
                  security_storage: 'granted'
                });
              `}
            </Script>
            <Script id="ga-config" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        ) : null}
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? (
          <Script
            src={`https://www.google.com/recaptcha/enterprise.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
            strategy="afterInteractive"
          />
        ) : null}
        <ClerkWrapper>
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            suppressHydrationWarning
          />
          <CookieBanner />
          {children}
        </ClerkWrapper>
      </body>
    </html>
  );
}


