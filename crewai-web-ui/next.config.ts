import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Add a rule to handle .node files using node-loader
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Important: return the modified config
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
