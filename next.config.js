
/** @type {import('next').NextConfig} */

const pwa = require("@ducanh2912/next-pwa");

const withPWA = pwa.default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
  // Firebase messaging SW — included as a separate import  
  importScripts: ["/firebase-messaging-sw.js"],
  // Workbox runtime caching strategy
  workboxOptions: {
    // Use GenerateSW mode (default) with our custom runtime caching rules
    runtimeCaching: [
      // ── Next.js static assets (hashed) — safe to cache long-term ───────────
      {
        urlPattern: /^\/_next\/static\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // ── Next.js image optimisation ─────────────────────────────────────────
      {
        urlPattern: /^\/_next\/image\?.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-images",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // ── Firebase Storage — chord sheets, media uploads ─────────────────────
      // CacheFirst: once an image is downloaded it lives on-device.
      // 300 entries, 90-day TTL, auto-purge on quota pressure.
      {
        urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "firebase-storage-images",
          expiration: {
            maxEntries: 300,
            maxAgeSeconds: 90 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Google Fonts ───────────────────────────────────────────────────────
      {
        urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Firebase gstatic assets ────────────────────────────────────────────
      {
        urlPattern: /^https:\/\/www\.gstatic\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "firebase-cdn",
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Page navigations — NetworkFirst with 5s timeout ───────────────────
      // Falls back to cached page HTML when offline.
      {
        urlPattern: /^https?.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

const nextConfig = {
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
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '6.0',
  },
};

module.exports = withPWA(nextConfig);
