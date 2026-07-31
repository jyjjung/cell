import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';

/**
 * Routes anyone can open without a session cookie.
 * Kept as defense-in-depth — the matcher already skips most of these.
 */
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
  if (
    pathname.startsWith('/privacy/') ||
    pathname.startsWith('/terms/') ||
    pathname.startsWith('/features/')
  ) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Cookie presence gate only — no Firebase Admin / Firestore on the Edge.
 * Security headers (incl. CSP) live in next.config.js so they apply without
 * invoking this middleware on static assets or public pages.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Auth gate only. Skip:
     * - API routes (own auth)
     * - Next static / image optimizer
     * - Public marketing + auth pages (no cookie required)
     * - Common static asset extensions
     * This is the main lever for Vercel Edge/middleware CPU.
     */
    '/((?!api(?:/|$)|_next/static|_next/image|_next/webpack-hmr|login(?:/|$)|signup(?:/|$)|forgot-password(?:/|$)|features(?:/|$)|privacy(?:/|$)|terms(?:/|$)|favicon|icon|apple-touch-icon|manifest|sw\\.js|workbox|swe-worker|$|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|otf|txt|xml|webmanifest|js|css|map|json)$).*)',
  ],
};
