import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth } from '@/lib/firebase-admin';
import {
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/auth-session';
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`auth-session:${ip}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    );
  }

  try {
    const body = await request.json();
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    if (!idToken) {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    const adminAuth = getAdminAuth(getAdminApp());
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE_MS,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionCookie,
      sessionCookieOptions(SESSION_COOKIE_MAX_AGE_MS / 1000),
    );
    return response;
  } catch (error) {
    console.error('[api/auth/session] Failed to create session cookie:', error);
    return NextResponse.json({ error: 'Unable to create session' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', sessionCookieOptions(0));
  return response;
}
