/**
 * Per-route SEO config: unique title (~50–60 chars) and description (~150–160 chars).
 * Canonical URL is built at runtime from window.location.origin + path.
 * withSocial: when true, include Open Graph and Twitter Card meta (Landing handles its own).
 * /app is intentionally omitted — no SEO meta there.
 */
export interface SeoMeta {
  title: string;
  description: string;
  withSocial?: boolean;
}

export const SEO_CONFIG: Record<string, SeoMeta> = {
  "/": {
    title: "Private AI Document Analysis | PIA",
    description:
      "Analyze documents with AI privately. Summarize, Review, Extract, or Ask — structured results in your browser or via Deep Analysis. No account for Standard mode; PIA does not store documents.",
    withSocial: true,
  },
  "/about": {
    title: "About Us | PIA – Private AI for Your Documents",
    description:
      "We're Yups — a team building PIA so you can use AI on documents privately. Tech, marketing, and data enthusiasts putting privacy first.",
    withSocial: true,
  },
  "/who-is-this-for": {
    title: "Who Is PIA For? | Private Document AI",
    description:
      "PIA is for anyone with sensitive documents: contracts, reports, policies. Run Summarize, Review, Extract, or Ask on-device, or use Deep Analysis with named providers. Free in-browser option.",
  },
  "/how-does-it-work": {
    title: "How PIA Works | Private AI in Your Browser",
    description:
      "Add your document, choose Summarize, Review, Extract, or Ask. Standard mode runs in your browser. Optional Deep Analysis encrypts the request to our API for stronger workflows.",
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
    title: "Privacy Policy | PIA",
    description:
      "How PIA handles documents, accounts, analytics, and subprocessors in Standard and Deep Analysis modes.",
  },
  "/cookies": {
    title: "Cookie Policy | PIA",
    description:
      "Necessary cookies, optional analytics, and waitlist reCAPTCHA on PIA.",
  },
  "/vision": {
    title: "Our Vision | Privacy-First AI for Everyone | PIA",
    description:
      "We envision a world where people use AI on sensitive work without sending data to third parties. Private AI as the default — free tools and private servers that respect you.",
  },
};

export function getSeoForPath(path: string): SeoMeta | null {
  return SEO_CONFIG[path] ?? null;
}
