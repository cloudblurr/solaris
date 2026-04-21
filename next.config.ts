import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type checking is done in CI before the Docker build.
    // This prevents Prisma version mismatches from breaking the image build.
    ignoreBuildErrors: process.env.NEXT_SKIP_TYPE_CHECK === "1",
  },
};

export default nextConfig;
