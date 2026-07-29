import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';

/** Routes anyone can open without a session cookie. */
const PUBLIC_EXACT = new Set([
  '/',
  '/login',
  '/signup',
  '/features',
  '/privacy',
  '/terms',
  '/forgot-password',
]);

const PUBLIC_PREFIXES = [
  '/_next',
  '/api/',
  '/icon',
  '/favicon',
  '/apple-touch-icon',
  '/manifest',
  '/sw.js',
  '/workbox',
  '/swe-worker',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (pathname.startsWith('/privacy/') || pathname.startsWith('/terms/') || pathname.startsWith('/features/')) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  // Firebase + Next + Vercel Analytics need a relatively open script/connect policy.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com https://apis.google.com https://va.vercel-scripts.com https://*.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://api.dicebear.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.vercel-insights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://*.sentry.io",
      "media-src 'self' blob: https://firebasestorage.googleapis.com https://storage.googleapis.com",
      "worker-src 'self' blob:",
      "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://www.youtube.com https://youtube.com",
    ].join('; '),
  );
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all paths except static file extensions commonly served as assets.
     */
    '/((?!.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|txt|xml|webmanifest)$).*)',
  ],
};
