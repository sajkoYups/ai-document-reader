import type { Metadata } from "next";
import ClerkWrapper from "@/components/ClerkWrapper";
import CookieBanner from "@/components/CookieBanner";
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
    "Analyze documents with AI privately. Summarize, Review, Extract, or Ask — structured results in your browser or via Deep Analysis. No account for Standard mode; PIA does not store documents.",
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


