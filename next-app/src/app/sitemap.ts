import type { MetadataRoute } from "next";
import { pageUrl, SITEMAP_ROUTES } from "@/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_ROUTES.map((path) => ({
    url: pageUrl(path),
    changeFrequency: "monthly",
    priority:
      path === "/"
        ? 1
        : path === "/pricing"
          ? 0.9
          : path === "/trust-center"
            ? 0.85
            : 0.8,
  }));
}
