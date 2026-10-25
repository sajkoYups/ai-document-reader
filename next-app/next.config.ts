import type { NextConfig } from "next";
import path from "path";

const appDir = __dirname;

const reportOnlyCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://huggingface.co https://*.huggingface.co https://cdn-lfs.huggingface.co https://*.hf.co https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://www.google.com",
  "worker-src 'self' blob:",
  "frame-src https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  // Pin Turbopack root to next-app so module resolution (e.g. tailwindcss) uses next-app/node_modules
  turbopack: {
    root: appDir,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp },
        ],
      },
    ];
  },
};

export default nextConfig;
