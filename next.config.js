
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
  experimental: {
    allowedDevOrigins: [
        "http://localhost:9002",
        "https://6000-firebase-studio-1747563616638.cluster-ikxjzjhlifcwuroomfkjrx437g.cloudworkstations.dev",
        "https://9000-firebase-studio-1747563616638.cluster-ikxjzjhlifcwuroomfkjrx437g.cloudworkstations.dev"
    ]
  }
};

module.exports = withPWA(nextConfig);
