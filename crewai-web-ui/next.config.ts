import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig = {
  output: 'standalone',
  webpack: (config: Configuration, { isServer, webpack }: { isServer: boolean; webpack: any }) => { // Added webpack to access webpack.IgnorePlugin
    // Add a rule to handle .node files using node-loader
    if (!config.module) {
      config.module = { rules: [] };
    }
    if (!config.module.rules) {
      config.module.rules = [];
    }
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Mark ssh2 as external to avoid bundling issues on the server
    if (isServer) {
      if (!config.externals) {
        config.externals = [];
      }
      // Ensure we are using the array form of externals
      if (Array.isArray(config.externals)) {
         config.externals.push({
           'ssh2': 'commonjs ssh2',
         });
      }
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
