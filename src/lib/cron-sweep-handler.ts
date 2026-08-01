import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import {
  recordSweepFailure,
  runDutyReminderSweep,
  type DutyReminderRunSource,
} from '@/lib/run-duty-reminder-sweep';

/**
 * Shared body for every duty-reminder cron route. Lives outside the route files
 * so the scheduled and catch-up endpoints cannot drift apart.
 */
export async function handleDutyReminderSweepRequest(
  request: NextRequest,
  source: DutyReminderRunSource,
): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);

  try {
    const result = await runDutyReminderSweep({
      adminDb,
      adminMessaging: getAdminMessaging(adminApp),
      source,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/duty-reminders]', source, message);
    await recordSweepFailure(adminDb, source, message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
