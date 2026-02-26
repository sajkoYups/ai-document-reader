import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: ["/api/"],
    },
    sitemap: `${siteUrl.replace(/\/+$/, "")}/sitemap.xml`,
  };
}

