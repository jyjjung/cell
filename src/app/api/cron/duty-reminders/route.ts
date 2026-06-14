import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import {
  collectDutyReminders,
  getCommunityTodayIso,
  type DutyReminderPayload,
} from '@/lib/duty-reminders';
import { deliverNotificationPush } from '@/lib/server-push';
import type {
  AppNotification,
  CleaningDay,
  CleaningRosterEntry,
  QTRosterEntry,
  WorshipRoster,
} from '@/types';

const DUTY_REMINDER_LOG = 'dutyReminderLog';
const DEFAULT_TIMEZONE = 'Australia/Brisbane';

function isAuthorized(request: NextRequest): boolean {
  if (request.headers.get('x-vercel-cron') === '1') return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

async function sendDutyReminder(
  reminder: DutyReminderPayload,
  adminDb: FirebaseFirestore.Firestore,
  adminMessaging: ReturnType<typeof getAdminMessaging>,
): Promise<'sent' | 'skipped'> {
  const logRef = adminDb.collection(DUTY_REMINDER_LOG).doc(reminder.dedupeId);
  const existing = await logRef.get();
  if (existing.exists) return 'skipped';

  const notifRef = adminDb.collection('notifications').doc();
  const notification: AppNotification = {
    id: notifRef.id,
    title: reminder.title,
    message: reminder.message,
    type: 'reminder',
    isGlobal: false,
    userId: reminder.userId,
    createdAt: FieldValue.serverTimestamp() as AppNotification['createdAt'],
    readBy: [],
    relatedUrl: reminder.relatedUrl,
  };

  await notifRef.set(notification);
  await deliverNotificationPush(notification, adminDb, adminMessaging);
  await logRef.set({
    userId: reminder.userId,
    kind: reminder.kind,
    dutyDate: reminder.dutyDate,
    daysBefore: reminder.daysBefore,
    notificationId: notifRef.id,
    sentAt: FieldValue.serverTimestamp(),
  });

  return 'sent';
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);
    const timeZone = process.env.DUTY_REMINDER_TIMEZONE || DEFAULT_TIMEZONE;
    const todayIso = getCommunityTodayIso(timeZone);

    const [cleaningSnap, cleaningDaysSnap, qtSnap, worshipSnap] = await Promise.all([
      adminDb.collection('cleaningRosters').get(),
      adminDb.collection('cleaningDays').get(),
      adminDb.collection('qtRosters').get(),
      adminDb.collection('worshipRosters').get(),
    ]);

    const cleaningRoster = cleaningSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CleaningRosterEntry,
    );
    const cleaningDays = cleaningDaysSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CleaningDay,
    );
    const qtRoster = qtSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as QTRosterEntry);
    const worshipRosters = worshipSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as WorshipRoster,
    );

    const reminders = collectDutyReminders({
      todayIso,
      cleaningRoster,
      cleaningDays,
      qtRoster,
      worshipRosters,
    });

    let sent = 0;
    let skipped = 0;

    for (const reminder of reminders) {
      const result = await sendDutyReminder(reminder, adminDb, adminMessaging);
      if (result === 'sent') sent++;
      else skipped++;
    }

    return NextResponse.json({
      success: true,
      todayIso,
      timeZone,
      candidates: reminders.length,
      sent,
      skipped,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/duty-reminders]', message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
