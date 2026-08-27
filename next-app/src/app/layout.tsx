import type { Metadata } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import { getSiteUrl, OG_IMAGE, SEO_CONFIG, siteJsonLd } from "@/seo";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});

const siteUrl = getSiteUrl();
const home = SEO_CONFIG["/"];

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
    default: home.title,
    template: "%s | PIA",
  },
  description: home.description,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: home.title,
    description: home.description,
    siteName: "PIA",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: home.title,
    description: home.description,
    images: [OG_IMAGE.url],
  },
};

const jsonLd = siteJsonLd();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-surface-0 text-text-primary">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <CookieBanner />
        {children}
      </body>
    </html>
  );
}
