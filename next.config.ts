import type { NextConfig } from "next";
import path from "node:path";
import packageJson from "./package.json";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  // Prevent MIME-type sniffing (OWASP A05)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prevent clickjacking (OWASP A05)
  { key: "X-Frame-Options", value: "DENY" },
  // Control referrer info sent to external origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforce HTTPS for 2 years (OWASP A02)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Restrict browser feature access
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()" },
  // Content Security Policy (OWASP A03)
  // - unsafe-inline required by Next.js App Router hydration scripts + Tailwind inline styles
  // - Cloudflare Web Analytics beacon when enabled on the hosting platform
  // - CartoDB tiles for the Leaflet map (*.basemaps.cartocdn.com)
  // - blob: for Leaflet map canvas rendering
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
      "font-src 'self'",
      "connect-src 'self' ws: wss: https://static.cloudflareinsights.com https://cloudflareinsights.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

