import type { NextConfig } from "next";

/**
 * How the frontend reaches the API.
 *
 * Proxy mode (default): the browser calls `/api/*` on this same origin and Next/Vercel
 * forwards it to API_PROXY_TARGET. That keeps the page same-origin, so there is no
 * mixed-content block and no CORS — which is what lets an HTTPS Vercel site talk to a
 * plain-HTTP EC2 box at http://13.48.12.56:8000.
 *
 * Direct mode: setting NEXT_PUBLIC_API_BASE makes the browser call that origin itself
 * (needed only when the API has its own HTTPS domain).
 */
const proxyTarget = (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const directApiBase = (process.env.NEXT_PUBLIC_API_BASE ?? "").trim();
// Template values from .env.example must never switch the browser to direct mode.
const placeholderBase = /api\.example\.com|example\.com|your-app\.vercel\.app/.test(directApiBase);
const useDirectApiBase = Boolean(directApiBase) && !placeholderBase;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dev server is reached as 127.0.0.1 by tooling and as localhost in the browser;
  // without this, Next blocks its own dev resources for the 127.0.0.1 origin.
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  async rewrites() {
    if (useDirectApiBase) {
      return [];
    }
    return [{ source: "/api/:path*", destination: `${proxyTarget}/api/:path*` }];
  },
};

export default nextConfig;
