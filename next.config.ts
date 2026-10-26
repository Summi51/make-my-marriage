import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  serverExternalPackages: ["argon2"],
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/account",
        permanent: false,
      },
    ];
  },
  // Baseline hardening applied to every response. A Referrer-Policy is
  // deliberately not set here: the public invitation page sets its own
  // `no-referrer` metadata, and a header would override it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
