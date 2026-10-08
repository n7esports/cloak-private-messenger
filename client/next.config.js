/** @type {import('next').NextConfig} */
const webpack = require('webpack');

module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'import.meta.url': 'globalThis.location.href',
        }),
      );
    }
    return config;
  },
  ...(process.env.CLOAK_BUILD_OUTPUT
    ? { distDir: process.env.CLOAK_BUILD_OUTPUT }
    : {}),
};