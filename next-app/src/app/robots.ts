import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: ["/api/", "/app"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
