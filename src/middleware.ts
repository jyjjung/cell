import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';

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

/** Rewrite /cell/* to legacy internal routes until all links use /cell prefix. */
function maybeRewriteCellPath(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname === '/cell') return null;
  if (!pathname.startsWith('/cell/')) return null;

  const internalPath = pathname.slice('/cell'.length) || '/';
  const url = request.nextUrl.clone();
  url.pathname = internalPath;
  return NextResponse.rewrite(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cellRewrite = maybeRewriteCellPath(request);
  if (cellRewrite) return cellRewrite;

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
    '/((?!api(?:/|$)|_next/static|_next/image|_next/webpack-hmr|login(?:/|$)|signup(?:/|$)|forgot-password(?:/|$)|features(?:/|$)|privacy(?:/|$)|terms(?:/|$)|favicon|icon|apple-touch-icon|manifest|sw\\.js|workbox|swe-worker|$|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|otf|txt|xml|webmanifest|js|css|map|json)$).*)',
  ],
};
