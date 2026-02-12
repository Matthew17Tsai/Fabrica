/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'better-sqlite3', 'potrace'],
  },
  allowedDevOrigins: ['https://*.replit.dev', 'https://*.repl.co', 'https://*.worf.replit.dev', 'http://127.0.0.1'],
}

module.exports = nextConfig
