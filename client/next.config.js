/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  ...(process.env.CLOAK_BUILD_OUTPUT
    ? { distDir: process.env.CLOAK_BUILD_OUTPUT }
    : {}),
};