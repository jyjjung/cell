import { retryFailedNotificationPushes } from '@/lib/retry-failed-notification-pushes';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
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
