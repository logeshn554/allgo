import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@allgo/common', '@allgo/ui', '@allgo/env', '@allgo/api-client'],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
