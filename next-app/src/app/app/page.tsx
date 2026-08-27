import type { Metadata } from "next";
import App from "@/App";
import { pageUrl } from "@/seo";

const fullUrl = pageUrl("/app");

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "App",
  description:
    "Use PIA to privately summarize, explain, extract, and chat with your documents.",
  alternates: {
    canonical: fullUrl,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppPage() {
  return <App />;
}
