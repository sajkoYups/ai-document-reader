import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSeoForPath } from "@/seo";

/**
 * Single source of truth for document head. Renders inside the Router so it
 * re-runs on every navigation. A useEffect syncs title/meta/canonical/JSON-LD
 * on every route change.
 */
export default function PageHelmet() {
  const { pathname } = useLocation();
  const seo = getSeoForPath(pathname);
  const canonical =
    typeof window !== "undefined" ? `${window.location.origin}${pathname}` : "";

  const websiteSchema =
    pathname === "/" && canonical && seo
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Doc Analyzer",
          url: canonical,
          description: seo.description,
        }
      : null;

  const organizationSchema =
    pathname === "/" && canonical
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Yups",
          url: canonical,
        }
      : null;

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const title = seo ? seo.title : "Doc Analyzer";
    document.title = title;

    const upsertMeta = (
      attrName: "name" | "property",
      attrValue: string,
      content: string | null,
    ) => {
      const selector = `meta[${attrName}="${attrValue}"]`;
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;

      if (!content) {
        el?.parentNode?.removeChild(el);
        return;
      }

      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }

      el.setAttribute("content", content);
    };

    // Description
    upsertMeta("name", "description", seo ? seo.description : null);

    // Canonical
    let link = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;

    if (!canonical) {
      link?.parentNode?.removeChild(link);
    } else {
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }

      link.setAttribute("href", canonical);
    }

    const hasSocial = Boolean(canonical && seo?.withSocial);

    if (hasSocial && seo && canonical) {
      upsertMeta("property", "og:type", "website");
      upsertMeta("property", "og:title", seo.title);
      upsertMeta("property", "og:description", seo.description);
      upsertMeta("property", "og:url", canonical);

      upsertMeta("name", "twitter:card", "summary_large_image");
      upsertMeta("name", "twitter:title", seo.title);
      upsertMeta("name", "twitter:description", seo.description);
    } else {
      upsertMeta("property", "og:type", null);
      upsertMeta("property", "og:title", null);
      upsertMeta("property", "og:description", null);
      upsertMeta("property", "og:url", null);

      upsertMeta("name", "twitter:card", null);
      upsertMeta("name", "twitter:title", null);
      upsertMeta("name", "twitter:description", null);
    }

    const upsertJsonLdScript = (id: string, data: unknown | null) => {
      const existing = document.getElementById(id);

      if (!data) {
        existing?.parentNode?.removeChild(existing);
        return;
      }

      const json = JSON.stringify(data);

      if (existing && existing.tagName.toLowerCase() === "script") {
        existing.textContent = json;
        return;
      }

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      script.textContent = json;
      document.head.appendChild(script);
    };

    upsertJsonLdScript("seo-website-schema", websiteSchema);
    upsertJsonLdScript("seo-organization-schema", organizationSchema);
  }, [canonical, organizationSchema, pathname, seo, websiteSchema]);

  return null;
}
