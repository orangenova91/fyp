import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Must stay above MAX_UPLOAD_BYTES in src/lib/files.ts plus multipart overhead.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
