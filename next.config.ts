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
};

export default nextConfig;
