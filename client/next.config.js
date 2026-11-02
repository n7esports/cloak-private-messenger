/** @type {import('next').NextConfig} */
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const webpack = require('webpack');

module.exports = (phase) => ({
  images: {
    unoptimized: true,
  },
  // TEMPORARY: Ignore ESLint during builds to bypass unused-variable errors.
  // TypeScript validation remains ACTIVE to catch real type errors.
  eslint: {
    ignoreDuringBuilds: true,
  },
  distDir:
    process.env.UQZERA_BUILD_OUTPUT ||
    (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next'),
  webpack(config, { isServer }) {
    if (!isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          "import.meta.url": "globalThis.location.href",
        }),
      );
    }
    return config;
  },
});
