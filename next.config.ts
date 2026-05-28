import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js", "archiver", "yauzl"]
};

export default nextConfig;
