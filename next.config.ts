import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Note: API routes are not supported with 'export', 
  // but we are proxying them to Vercel via api-client.
};

export default nextConfig;
