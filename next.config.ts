import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable in dev mode to avoid caching issues while developing
  register: true,
  // skipWaiting: true, // Not needed as it's not in the type definition for this plugin (handled automatically or via workboxOptions)
})(nextConfig);
