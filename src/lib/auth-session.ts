/** HttpOnly cookie used for SSR session hints (home/layout first paint). */
export const SESSION_COOKIE_NAME = '__session';

/**
 * Non-HttpOnly cookie mirroring last-visited community app.
 * Used for client resume on `/` without waiting on Firebase auth.
 */
export const LAST_APP_COOKIE_NAME = 'ndc_last_app';

/** Firebase session cookie lifetime (5 days). */
export const SESSION_COOKIE_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
  };
}

/** Readable by the server and client — not a secret. */
export function lastAppCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: false as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
  };
}
