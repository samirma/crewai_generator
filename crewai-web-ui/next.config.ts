import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // webpack: (config, { isServer, webpack }) => { // Added webpack to access webpack.IgnorePlugin
  //   // Add a rule to handle .node files using node-loader
  //   config.module.rules.push({
  //     test: /\.node$/,
  //     use: 'node-loader',
  //   });

  //   // Mark ssh2 as external to avoid bundling issues on the server
  //   if (isServer) {
  //     if (!config.externals) {
  //       config.externals = [];
  //     }
  //     // Ensure we are using the array form of externals
  //     if (Array.isArray(config.externals)) {
  //        config.externals.push({
  //          'ssh2': 'commonjs ssh2',
  //        });
  //     }
  //   }

  //   // Important: return the modified config
  //   return config;
  // },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
