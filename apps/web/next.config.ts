import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@budget/domain", "@budget/db"],
};

export default nextConfig;
