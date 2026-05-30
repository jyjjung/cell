/** @type {import('next').NextConfig} */

const pwa = require("@ducanh2912/next-pwa");
const defaultRuntimeCaching = pwa.runtimeCaching;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const MEDIA_CACHE_MAX_ENTRIES = 2500;

/** Long-lived local (service worker) cache for Firebase / GCS media. */
const FIREBASE_MEDIA_CACHING = [
  {
    urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "firebase-storage-media",
      expiration: { maxEntries: MEDIA_CACHE_MAX_ENTRIES, maxAgeSeconds: ONE_YEAR_SECONDS },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: /^https:\/\/storage\.googleapis\.com\/cell-abca4\.firebasestorage\.app\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "google-cloud-storage-media",
      expiration: { maxEntries: MEDIA_CACHE_MAX_ENTRIES, maxAgeSeconds: ONE_YEAR_SECONDS },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
];

/** Default cross-origin rule only caches 1h — exclude our media hosts (handled above). */
function patchCrossOriginCaching(entries) {
  return entries.map((entry) => {
    if (entry.options?.cacheName !== "cross-origin") return entry;
    return {
      ...entry,
      urlPattern: ({ sameOrigin, url }) => {
        if (sameOrigin) return false;
        const host = url.hostname;
        if (
          host === "firebasestorage.googleapis.com" ||
          host === "storage.googleapis.com"
        ) {
          return false;
        }
        return true;
      },
    };
  });
}

const withPWA = pwa.default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
  workboxOptions: {
    runtimeCaching: [
      ...FIREBASE_MEDIA_CACHING,
      ...patchCrossOriginCaching(defaultRuntimeCaching),
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
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '6.1',
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = withPWA(nextConfig);
