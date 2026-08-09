/** @type {import('next').NextConfig} */

const { withSentryConfig } = require('@sentry/nextjs');
const pwa = require('@ducanh2912/next-pwa');
const defaultRuntimeCaching = pwa.runtimeCaching;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const MEDIA_CACHE_MAX_ENTRIES = 2500;

/** Long-lived local (service worker) cache for Firebase / GCS media. */
const FIREBASE_MEDIA_CACHING = [
  {
    urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'firebase-storage-media',
      expiration: { maxEntries: MEDIA_CACHE_MAX_ENTRIES, maxAgeSeconds: ONE_YEAR_SECONDS },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: /^https:\/\/storage\.googleapis\.com\/cell-abca4\.firebasestorage\.app\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-cloud-storage-media',
      expiration: { maxEntries: MEDIA_CACHE_MAX_ENTRIES, maxAgeSeconds: ONE_YEAR_SECONDS },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'dicebear-avatars',
      expiration: { maxEntries: 512, maxAgeSeconds: ONE_YEAR_SECONDS },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith('/api/bible'),
    handler: 'NetworkFirst',
    options: {
      cacheName: 'bible-passage-api',
      networkTimeoutSeconds: 4,
      expiration: { maxEntries: 512, maxAgeSeconds: ONE_YEAR_SECONDS },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
];

/** Default cross-origin rule only caches 1h — exclude our media hosts (handled above). */
function patchCrossOriginCaching(entries) {
  return entries.map((entry) => {
    if (entry.options?.cacheName !== 'cross-origin') return entry;
    return {
      ...entry,
      urlPattern: ({ sameOrigin, url }) => {
        if (sameOrigin) return false;
        const host = url.hostname;
        if (
          host === 'firebasestorage.googleapis.com' ||
          host === 'storage.googleapis.com' ||
          host === 'api.dicebear.com' ||
          host.endsWith('.firebasestorage.app')
        ) {
          return false;
        }
        return true;
      },
    };
  });
}

const withPWA = pwa.default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Production PWA stays enabled. Disable only in local `next dev` so the
  // service worker does not cache stale chunks during development (no prod cost change).
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      ...FIREBASE_MEDIA_CACHING,
      ...patchCrossOriginCaching(defaultRuntimeCaching),
    ],
  },
});

const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
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
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/s2/favicons/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '6.1',
  },
  async headers() {
    // Static headers at the CDN (CSP and related security headers).
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // www.youtube.com serves the IFrame Player API; it in turn loads the
      // widget bundle from s.ytimg.com.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com https://apis.google.com https://va.vercel-scripts.com https://*.vercel-scripts.com https://www.youtube.com https://s.ytimg.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app https://api.dicebear.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.vercel-insights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://*.sentry.io https://www.youtube.com https://s.ytimg.com",
      "media-src 'self' blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app",
      "worker-src 'self' blob:",
      "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://www.youtube.com https://youtube.com",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = withSentryConfig(withPWA(nextConfig), {
  // Optional source-map upload — set these in CI/Vercel when you want readable stack traces.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
