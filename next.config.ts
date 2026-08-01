import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  distDir:
    process.env.NEXT_PUBLIC_TEZOS_NETWORK === "shadownet"
      ? ".next-shadownet"
      : process.env.NEXT_PUBLIC_TEZOS_NETWORK === "localnet"
        ? ".next-localnet"
        : ".next",
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
