import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { getSeoForPath } from "@/seo";

/**
 * Single source of truth for document head. Renders inside the Router so it
 * re-runs on every navigation. A useEffect syncs title/meta/canonical on every
 * route change so the tab and head update even when react-helmet-async does not.
 */
export default function PageHelmet() {
  const { pathname } = useLocation();
  const seo = getSeoForPath(pathname);
  const canonical =
    typeof window !== "undefined" ? `${window.location.origin}${pathname}` : "";

  // Sync document head on every navigation (fixes tab title when Helmet doesn't update)
  useEffect(() => {
    document.title = seo ? seo.title : "Doc Analyzer";

    if (typeof document === "undefined") return;

    if (seo) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", seo.description);

      if (typeof window !== "undefined") {
        const href = `${window.location.origin}${pathname}`;
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
          link = document.createElement("link");
          link.setAttribute("rel", "canonical");
          document.head.appendChild(link);
        }
        link.setAttribute("href", href);
      }
    }
  }, [pathname, seo]);

  // /app and unknown routes: minimal title so we don't leave index.html default
  if (!seo) {
    return (
      <Helmet>
        <title>Doc Analyzer</title>
      </Helmet>
    );
  }

  const websiteSchema =
    pathname === "/" && canonical
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

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      {canonical && <link rel="canonical" href={canonical} />}
      {canonical && seo.withSocial && (
        <>
          <meta property="og:type" content="website" />
          <meta property="og:title" content={seo.title} />
          <meta property="og:description" content={seo.description} />
          <meta property="og:url" content={canonical} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seo.title} />
          <meta name="twitter:description" content={seo.description} />
        </>
      )}
      {websiteSchema && (
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      )}
      {organizationSchema && (
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      )}
    </Helmet>
  );
}
