import { deliverDueScheduledAnnouncements } from '@/lib/deliver-scheduled-announcements';
import {
    collectDutyReminders,
    getCommunityTodayIso,
    type DutyReminderPayload
} from '@/lib/duty-reminders';
import { normalizeEventFromFirestore } from '@/lib/event-doc';
import { collectEventDayReminders } from '@/lib/event-reminders';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { retryFailedNotificationPushes } from '@/lib/retry-failed-notification-pushes';
import { sendUserNotification } from '@/lib/server-notifications';
import type {
    CleaningDay,
    CleaningRosterEntry,
    QTRosterEntry,
    UserProfileData,
    WorshipRoster
} from '@/types';
import { NextResponse, type NextRequest } from 'next/server';

const DEFAULT_TIMEZONE = 'Australia/Brisbane';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (request.headers.get('authorization') === `Bearer ${secret}`) return true;
  if (process.env.VERCEL === '1' && request.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

async function sendReminder(
  reminder: {
    userId: string;
    title: string;
    message: string;
    relatedUrl: string;
    dedupeId: string;
    isGlobal?: boolean;
  },
  adminDb: FirebaseFirestore.Firestore,
  adminMessaging: ReturnType<typeof getAdminMessaging>,
  dedupeCollection: string,
): Promise<'sent' | 'skipped'> {
  return sendUserNotification(adminDb, adminMessaging, {
    userId: reminder.userId,
    title: reminder.title,
    message: reminder.message,
    relatedUrl: reminder.relatedUrl,
    dedupeId: reminder.dedupeId,
    dedupeCollection,
    isGlobal: reminder.isGlobal,
  });
}

function mapDutyReminder(reminder: DutyReminderPayload) {
  return {
    userId: reminder.userId,
    title: reminder.title,
    message: reminder.message,
    relatedUrl: reminder.relatedUrl,
    dedupeId: reminder.dedupeId,
  };
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

    const [cleaningSnap, cleaningDaysSnap, qtSnap, worshipSnap, eventsSnap, usersSnap] =
      await Promise.all([
        adminDb.collection('cleaningRosters').get(),
        adminDb.collection('cleaningDays').get(),
        adminDb.collection('qtRosters').get(),
        adminDb.collection('worshipRosters').get(),
        adminDb.collection('events').get(),
        adminDb.collection('users').get(),
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
    const events = eventsSnap.docs.map((d) =>
      normalizeEventFromFirestore(d.id, d.data() as Record<string, unknown>),
    );
    const users = usersSnap.docs
      .map((d) => ({ uid: d.id, ...d.data() }) as UserProfileData)
      .filter((u) => u.isApproved !== false);

    const dutyReminders = collectDutyReminders({
      todayIso,
      cleaningRoster,
      cleaningDays,
      qtRoster,
      worshipRosters,
    });
    const eventReminders = collectEventDayReminders({ todayIso, events, users, timeZone });

    let dutySent = 0;
    let dutySkipped = 0;
    let eventSent = 0;
    let eventSkipped = 0;

    for (const reminder of dutyReminders) {
      const result = await sendReminder(
        mapDutyReminder(reminder),
        adminDb,
        adminMessaging,
        'dutyReminderLog',
      );
      if (result === 'sent') dutySent++;
      else dutySkipped++;
    }

    // Parallelize with a modest concurrency cap to avoid cron timeouts
    // when many users/events need reminders on the same day.
    const EVENT_CONCURRENCY = 8;
    for (let i = 0; i < eventReminders.length; i += EVENT_CONCURRENCY) {
      const chunk = eventReminders.slice(i, i + EVENT_CONCURRENCY);
      const results = await Promise.all(
        chunk.map((reminder) => sendReminder(reminder, adminDb, adminMessaging, 'eventReminderLog')),
      );
      for (const result of results) {
        if (result === 'sent') eventSent++;
        else eventSkipped++;
      }
    }

    const scheduled = await deliverDueScheduledAnnouncements(adminDb, adminMessaging, timeZone);
    const pushRetries = await retryFailedNotificationPushes(adminDb, adminMessaging);

    return NextResponse.json({
      success: true,
      todayIso,
      timeZone,
      duty: {
        candidates: dutyReminders.length,
        sent: dutySent,
        skipped: dutySkipped,
      },
      events: {
        candidates: eventReminders.length,
        sent: eventSent,
        skipped: eventSkipped,
      },
      scheduledAnnouncements: scheduled,
      pushRetries,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/duty-reminders]', message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
