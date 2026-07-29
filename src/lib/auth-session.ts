/** HttpOnly cookie used by middleware for page-level auth gating. */
export const SESSION_COOKIE_NAME = '__session';

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
