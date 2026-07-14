import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/anfragen', destination: '/vorgaenge?phase=anfrage', permanent: false },
      { source: '/angebote', destination: '/vorgaenge?phase=angebot', permanent: false },
      { source: '/auftraege', destination: '/vorgaenge?phase=auftrag', permanent: false },
      { source: '/rechnungen', destination: '/vorgaenge?phase=rechnung', permanent: false },
    ]
  },
  eslint: {
    // Netlify/CI: viele bestehende Lint-Warnungen; Build soll nicht an unused-vars scheitern
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    }
    if (isServer) {
      config.externals = [...(config.externals || []), 'puppeteer-core', '@puppeteer/browsers', 'archiver']
    }
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@puppeteer/browsers', '@sparticuz/chromium', 'archiver'],
    /** Sparticuz-Binaries für Angebot-PDF auf Netlify/Lambda mit deployen */
    outputFileTracingIncludes: {
      '/**': [
        './node_modules/@sparticuz/chromium/bin/**',
        './node_modules/@sparticuz/chromium/build/**',
        './scripts/ki-analyse/**/*',
      ],
    },
  },
};

export default nextConfig;
