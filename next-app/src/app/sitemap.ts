import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://doc-analyzer.example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/+$/, "");

  const routes = [
    "/",
    "/pricing",
    "/about",
    "/who-is-this-for",
    "/how-does-it-work",
    "/what-else-do-we-do",
    "/mission",
    "/vision",
    "/app",
  ];

  const now = new Date();

  return routes.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : path === "/app" ? 0.6 : path === "/pricing" ? 0.9 : 0.8,
  }));
}

