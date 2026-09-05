/** @type {import('next').NextConfig} */

const path = require('path');

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

/** Skip Workbox/PWA during local dev — its dependency tree can hang config load. */
function createWithPWA() {
  const skipPwa =
    process.env.SKIP_PWA === '1' ||
    process.env.NODE_ENV === 'development' ||
    process.env.npm_lifecycle_event === 'dev';

  if (skipPwa) {
    return (config) => config;
  }

  const pwa = require('@ducanh2912/next-pwa');
  const defaultRuntimeCaching = pwa.runtimeCaching;

  return pwa.default({
    dest: 'public',
    register: false,
    skipWaiting: true,
    workboxOptions: {
      runtimeCaching: [
        ...FIREBASE_MEDIA_CACHING,
        ...patchCrossOriginCaching(defaultRuntimeCaching),
      ],
    },
  });
}

const withPWA = createWithPWA();

const nextConfig = {
  experimental: {
    // Keep lucide-react out: Turbopack HMR can break when icon imports are removed
    // ("module factory is not available") under optimizePackageImports.
    optimizePackageImports: ['date-fns', 'framer-motion'],
  },
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.js',
      [path.join(__dirname, 'src/lib/app-fonts-google')]: path.join(
        __dirname,
        'src/lib/app-fonts-google.stub.ts',
      ),
    },
  },
  /**
   * Cell home is `/cell`. Feature pages still live at root (`/chat`, `/events`, …).
   * Rewrite `/cell/<feature>` → `/<feature>` so sidebar and bookmarks under `/cell/…` work.
   * Use `fallback` (not afterFiles) so real `/cell/*` routes — including dynamic
   * `/cell/chat/[chatId]` — win before rewrite. Array/afterFiles rewrites run before
   * dynamic routes and would send chat detail to legacy `/chat/[id]` (blank redirect loop).
   * `:path+` requires at least one segment, so exact `/cell` keeps `app/cell/page.tsx`.
   */
  async rewrites() {
    return {
      fallback: [
        {
          source: '/cell/:path+',
          destination: '/:path+',
        },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: '/full-plan',
        destination: '/bible-checklist',
        permanent: true,
      },
    ];
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
      // youtube-nocookie is used for chapter clips (start/end) so watch history
      // does not override the seek; allow both hosts for embeds and player API.
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app https://api.dicebear.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.vercel-insights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://*.sentry.io https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com",
      "media-src 'self' blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app",
      "worker-src 'self' blob:",
      "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com",
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

    const skipGoogleFonts =
      process.env.SKIP_GOOGLE_FONTS === '1' ||
      process.env.NODE_ENV === 'development' ||
      process.env.npm_lifecycle_event === 'dev';

    if (skipGoogleFonts) {
      config.resolve.alias[path.join(__dirname, 'src/lib/app-fonts-google')] = path.join(
        __dirname,
        'src/lib/app-fonts-google.stub.ts',
      );
    }

    return config;
  },
};

function createWithSentry(config) {
  const skipSentry =
    process.env.SKIP_SENTRY === '1' ||
    process.env.NODE_ENV === 'development' ||
    process.env.npm_lifecycle_event === 'dev';

  if (skipSentry) {
    return config;
  }

  const { withSentryConfig } = require('@sentry/nextjs');
  return withSentryConfig(config, {
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
}

module.exports = createWithSentry(withPWA(nextConfig));
