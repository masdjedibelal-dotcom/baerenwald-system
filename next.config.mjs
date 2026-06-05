/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Netlify/CI: viele bestehende Lint-Warnungen; Build soll nicht an unused-vars scheitern
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'puppeteer-core', '@puppeteer/browsers']
    }
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@puppeteer/browsers', '@sparticuz/chromium'],
    /** Sparticuz-Binaries für Angebot-PDF auf Netlify/Lambda mit deployen */
    outputFileTracingIncludes: {
      '/**': [
        './node_modules/@sparticuz/chromium/bin/**',
        './node_modules/@sparticuz/chromium/build/**',
      ],
    },
  },
};

export default nextConfig;
