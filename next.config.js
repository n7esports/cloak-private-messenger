/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Capacitor mobile builds
  output: 'export',
  
  // Disable image optimization since static export has no server runtime
  images: {
    unoptimized: true,
  },

  // Enable WebAssembly support for crypto libraries like libsodium
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fix for client-side fallback modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
