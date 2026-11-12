import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.js',
    },
  },
  serverExternalPackages: ['canvas'],
};

export default nextConfig;