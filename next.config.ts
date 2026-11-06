import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // node:sqlite is part of Node itself; keep it out of the bundle
  serverExternalPackages: ['node:sqlite'],
  async redirects() {
    return [
      // the kit's contents page is a static page in public/kit; its links are relative, so go to the file itself
      { source: '/', destination: '/kit/index.html', permanent: false },
      { source: '/kit', destination: '/kit/index.html', permanent: false },
    ]
  },
}
export default nextConfig
