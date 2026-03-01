import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@github/copilot",
    "@github/copilot-sdk",
    "@chroma-core/default-embed",
    "@chroma-core/ai-embeddings-common",
  ],
};

export default nextConfig;
