import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/securityContacts";

/**
 * Per-route SEO: unique title (~50–60 chars) and description (~150–160 chars).
 * /app is intentionally omitted — the product UI is noindexed.
 */
export interface SeoMeta {
  title: string;
  description: string;
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be set in production so canonicals and the sitemap do not use a placeholder domain.",
      );
    }
    return "https://doc-analyzer.example.com";
  }
  return raw.replace(/\/+$/, "");
}

export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "PIA: Analyze documents using AI privately",
} as const;

export const ORGANIZATION = {
  name: "Yups",
  url: "https://yups.tech",
  email: CONTACT_EMAIL,
  sameAs: [
    "https://yups.tech",
    "https://www.linkedin.com/company/yups-tech",
  ],
} as const;

export const SEO_CONFIG: Record<string, SeoMeta> = {
  "/": {
    title: "Private AI Document Analysis in Your Browser | PIA",
    description:
      "Analyze documents with AI privately. Summarize, Review, Extract, or Ask in your browser. No account for Standard; PIA does not store documents.",
  },
  "/about": {
    title: "About Us | PIA – Private AI for Your Documents",
    description:
      "We're Yups, a team building PIA so you can use AI on documents privately. Tech, marketing, and data enthusiasts putting privacy first.",
  },
  "/who-is-this-for": {
    title: "Who Is PIA For? Private Document AI for Sensitive Files",
    description:
      "PIA is for sensitive documents: contracts, reports, policies. Run Summarize, Review, Extract, or Ask on-device. Free in-browser option.",
  },
  "/how-does-it-work": {
    title: "How PIA Works | Private AI in Your Browser",
    description:
      "Add a document, choose Summarize, Review, Extract, or Ask. Standard runs in your browser. Deep Analysis uses encrypted API requests.",
  },
  "/what-else-do-we-do": {
    title: "What Else We Do | Private AI Servers & Consulting",
    description:
      "Besides PIA, we build private AI servers for companies and advise on privacy-conscious AI. Run models on your infrastructure; keep sensitive data under your control.",
  },
  "/mission": {
    title: "Our Mission | Making Private AI Accessible | PIA",
    description:
      "Our mission is to make private AI accessible to everyone. We keep PIA free so anyone can summarize and understand documents without giving up privacy or control.",
  },
  "/privacy": {
    title: "Privacy Policy | How PIA Handles Your Documents",
    description:
      "How PIA handles documents, accounts, analytics, and subprocessors in Standard and Deep Analysis modes.",
  },
  "/cookies": {
    title: "Cookie Policy | Analytics and Necessary Cookies | PIA",
    description:
      "Necessary cookies, optional analytics, and waitlist reCAPTCHA on PIA.",
  },
  "/vision": {
    title: "Our Vision | Privacy-First AI for Everyone | PIA",
    description:
      "A world where people use AI on sensitive work without sending data to third parties. Private AI as the default, not a premium.",
  },
  "/pricing": {
    title: "Pricing for Private AI Document Analysis | PIA",
    description:
      "Private Mode is free forever. Deep Analysis paid plans start at €9/month for private AI document analysis. No account required to start in your browser.",
  },
  "/trust-center": {
    title: "Trust Center | PIA Security and Privacy Overview",
    description:
      "Learn how PIA protects your documents with privacy-first architecture, minimal data retention, and modern security practices.",
  },
  "/private-ai-vs-chatgpt": {
    title: "Private AI vs ChatGPT | Keep Documents Off Public Bots",
    description:
      "Why not paste contracts into ChatGPT. PIA analyzes documents in your browser or via privacy-constrained Deep Analysis. Free Standard mode.",
  },
};

export const SITEMAP_ROUTES = [
  "/",
  "/pricing",
  "/about",
  "/who-is-this-for",
  "/how-does-it-work",
  "/what-else-do-we-do",
  "/mission",
  "/vision",
  "/trust-center",
  "/privacy",
  "/cookies",
  "/private-ai-vs-chatgpt",
] as const;

export function pageUrl(path: string): string {
  const base = getSiteUrl();
  return path === "/" ? base : `${base}${path}`;
}

export function pageMetadata(path: keyof typeof SEO_CONFIG): Metadata {
  const seo = SEO_CONFIG[path];
  const url = pageUrl(path);

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      title: seo.title,
      description: seo.description,
      siteName: "PIA",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [OG_IMAGE.url],
    },
  };
}

export function siteJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        url: siteUrl,
        name: "PIA",
        description:
          "Analyze documents with AI privately in your browser or via a privacy-conscious API.",
        publisher: { "@id": `${siteUrl}#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: ORGANIZATION.name,
        url: ORGANIZATION.url,
        email: ORGANIZATION.email,
        logo: `${siteUrl}/android-chrome-512x512.png`,
        sameAs: [...ORGANIZATION.sameAs],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}#software`,
        name: "PIA",
        url: siteUrl,
        description:
          "Private AI document analysis: summarize, review, extract, compare, and ask questions in your browser or via Deep Analysis.",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser",
        publisher: { "@id": `${siteUrl}#organization` },
        offers: [
          {
            "@type": "Offer",
            name: "Private Mode",
            price: "0",
            priceCurrency: "EUR",
            description:
              "In-browser document analysis. No account required. Documents stay on your device.",
          },
          {
            "@type": "Offer",
            name: "Deep Analysis Lite",
            price: "9",
            priceCurrency: "EUR",
            description:
              "Server-side document analysis via privacy-constrained providers. Plans start at €9/month.",
          },
        ],
      },
    ],
  };
}

export function howToJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to analyze a document privately with PIA",
    description:
      "Add a document, choose a workflow, and get structured results in your browser or via Deep Analysis.",
    url: `${siteUrl}/how-does-it-work`,
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Add your document",
        text: "Paste text or upload a PDF, plain text, or Markdown file.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose a workflow",
        text: "Pick Summarize, Review, Extract, Compare, Timeline, or Ask.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Get results",
        text: "Structured output appears in the app. Standard mode stays on your device. Deep Analysis is optional.",
      },
    ],
  };
}

export type PricingFaq = { question: string; answer: string };

export const PRICING_FAQS: PricingFaq[] = [
  {
    question: "What is the difference between Private Mode and Deep Analysis?",
    answer:
      "Private Mode runs the AI in your browser, so your document never leaves your device. Deep Analysis encrypts the request to the PIA API and uses stronger server-side models via named privacy-constrained providers. PIA does not store documents or prompts.",
  },
  {
    question: "What counts as an analysis?",
    answer:
      "One Deep Analysis workflow run counts as one analysis. Follow-up questions do not count. Your usage this month is visible in your account Usage page.",
  },
  {
    question: "Do I need an account to use PIA?",
    answer:
      "No. Private Mode is free and does not require an account. An account is only needed for Deep Analysis waitlist and paid plans.",
  },
  {
    question: "How does PIA handle my document?",
    answer:
      "In Private Mode, parsing and inference stay on your device. In Deep Analysis, the request is encrypted to our API, decrypted in memory, and sent over TLS to providers listed in the Trust Center. Refreshing the page clears the working copy from the app.",
  },
  {
    question: "Can I start for free?",
    answer:
      "Yes. Private Mode is free forever, with no usage limits and no sign-up. Join the Deep Analysis waitlist when you need a stronger server-side model. The €9 Lite plan is free during the testing period, through 31 October 2026.",
  },
];

export function faqJsonLd(faqs: PricingFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
