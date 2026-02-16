import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    // This proxies /api/v1 to the backend URL defined in your environment
    // This solves the Mixed Content error by letting Vercel handle the HTTPS-to-HTTP jump server-side
    const backendUrl = process.env.BACKEND_SERVER_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
