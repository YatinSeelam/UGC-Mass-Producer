/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Exclude native modules and puppeteer from client-side bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@napi-rs/canvas': false,
        'puppeteer': false,
      }

      // Ignore .node files in client bundle
      config.module = config.module || {}
      config.module.rules = config.module.rules || []
      config.module.rules.push({
        test: /\.node$/,
        loader: 'ignore-loader',
      })
    } else {
      // For server-side, handle .node files
      config.externals = config.externals || []
      config.externals.push({
        'canvas': 'commonjs canvas',
        '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
      })
    }

    return config
  },
}

module.exports = nextConfig


