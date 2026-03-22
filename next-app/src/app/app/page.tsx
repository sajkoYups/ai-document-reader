import type { Metadata } from "next";
import App from "@/App";

const path = "/app";
const fullUrl = `${
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com").replace(
    /\/+$/,
    "",
  )
}${path}`;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "App",
  description:
    "Use PIA to privately summarize, explain, extract, and chat with your documents.",
  alternates: {
    canonical: fullUrl,
  },
  openGraph: {
    url: fullUrl,
    title: "PIA — Private AI document analysis",
    description:
      "Open PIA to use private AI on your documents directly in the browser.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PIA — Private AI document analysis",
    description:
      "Analyze your documents privately with the PIA web app.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AppPage() {
  return <App />;
}




