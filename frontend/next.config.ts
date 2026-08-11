import type { NextConfig } from 'next';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:44300';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, '..'),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
