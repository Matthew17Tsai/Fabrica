/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'better-sqlite3', 'potrace'],
  },
  allowedDevOrigins: [
    'https://a7221111-1916-43b2-b248-ee0da20ef3c6-00-1t0jzdjxe7bfb.worf.replit.dev',
    'http://127.0.0.1',
  ],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
}

module.exports = nextConfig
