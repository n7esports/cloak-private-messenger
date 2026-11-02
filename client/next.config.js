/** @type {import('next').NextConfig} */
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const webpack = require('webpack');

module.exports = (phase) => ({
  images: {
    unoptimized: true,
  },
  // NOTE: eslint.ignoreDuringBuilds and typescript.ignoreBuildErrors were
  // intentionally REMOVED so the Vercel build actually runs ESLint + TS
  // validation instead of silently skipping it.
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
