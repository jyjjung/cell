import { retryFailedNotificationPushes } from '@/lib/retry-failed-notification-pushes';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { NextResponse, type NextRequest } from 'next/server';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (request.headers.get('authorization') === `Bearer ${secret}`) return true;
  if (process.env.VERCEL === '1' && request.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);
    const pushRetries = await retryFailedNotificationPushes(adminDb, adminMessaging);
    return NextResponse.json({ success: true, pushRetries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/push-retries]', message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
