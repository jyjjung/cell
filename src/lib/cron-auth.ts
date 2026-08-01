import type { NextRequest } from 'next/server';

/**
 * Cron endpoints accept either an explicit Bearer secret (manual/backfill runs)
 * or Vercel's own cron invocation header. With no CRON_SECRET configured
 * nothing is authorized, so a missing secret fails closed rather than open.
 */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (request.headers.get('authorization') === `Bearer ${secret}`) return true;
  if (process.env.VERCEL === '1' && request.headers.get('x-vercel-cron') === '1') return true;
  return false;
}
