import type { NextConfig } from "next";
import path from "path";

const appDir = __dirname;

const nextConfig: NextConfig = {
  /* config options here */
  // Pin Turbopack root to next-app so module resolution (e.g. tailwindcss) uses next-app/node_modules
  turbopack: {
    root: appDir,
  },
};

export default nextConfig;
