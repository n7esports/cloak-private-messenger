module.exports = {
  ...(process.env.CLOAK_BUILD_OUTPUT
    ? { distDir: process.env.CLOAK_BUILD_OUTPUT }
    : {}),
};
