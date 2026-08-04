import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { addDays, format } from 'date-fns';
import { deliverDueScheduledAnnouncements } from '@/lib/deliver-scheduled-announcements';
import {
  EMPTY_REMINDER_COUNTS,
  shouldSkipCatchupFullScan,
} from '@/lib/duty-reminder-catchup';
import {
  collectDutyReminders,
  getCommunityTodayIso,
  type CustomRosterDutySource,
} from '@/lib/duty-reminders';
import { normalizeEventFromFirestore } from '@/lib/event-doc';
import { collectEventDayReminders } from '@/lib/event-reminders';
import { parseDay } from '@/lib/event-occurrences';
import { retryFailedNotificationPushes } from '@/lib/retry-failed-notification-pushes';
import { sendUserNotification } from '@/lib/server-notifications';
import type {
  CleaningDay,
  CleaningRosterEntry,
  CustomRosterEntry,
  QTRosterEntry,
  RosterDefinition,
  UserProfileData,
  WorshipRoster,
} from '@/types';

const DEFAULT_TIMEZONE = 'Australia/Brisbane';

/** Sends run 8 at a time so a busy roster day still finishes well inside the function limit. */
const SEND_CONCURRENCY = 8;

/** Heartbeat lives in `config` so admins can read it without a new rules deploy. */
const CRON_HEARTBEAT_COLLECTION = 'config';
const CRON_HEARTBEAT_DOC_ID = 'dutyReminderCron';

/** Match duty-reminders week window: today through +7 days inclusive. */
const CUSTOM_ROSTER_LOOKAHEAD_DAYS = 7;

/**
 * `scheduled` is the morning run, `catchup` the midday safety net, `manual` a
 * hand-triggered backfill. Recorded on the heartbeat so a run that only ever
 * succeeds on the catch-up schedule is visible rather than silent.
 */
export type DutyReminderRunSource = 'scheduled' | 'catchup' | 'manual';

export interface ReminderCounts {
  candidates: number;
  sent: number;
  skipped: number;
}

export interface DutyReminderSweepResult {
  todayIso: string;
  timeZone: string;
  source: DutyReminderRunSource;
  durationMs: number;
  duty: ReminderCounts;
  events: ReminderCounts;
  scheduledAnnouncements: ReminderCounts;
  pushRetries: ReminderCounts;
  /** True when catch-up skipped roster/event/user scans (morning already OK). */
  fullScanSkipped?: boolean;
}

interface SendableReminder {
  userId: string;
  title: string;
  message: string;
  relatedUrl: string;
  dedupeId: string;
  isGlobal?: boolean;
}

async function sendBatched(
  reminders: SendableReminder[],
  adminDb: Firestore,
  adminMessaging: Messaging,
  dedupeCollection: string,
): Promise<ReminderCounts> {
  let sent = 0;
  let skipped = 0;

  for (let i = 0; i < reminders.length; i += SEND_CONCURRENCY) {
    const chunk = reminders.slice(i, i + SEND_CONCURRENCY);
    const results = await Promise.all(
      chunk.map((reminder) =>
        sendUserNotification(adminDb, adminMessaging, {
          userId: reminder.userId,
          title: reminder.title,
          message: reminder.message,
          relatedUrl: reminder.relatedUrl,
          dedupeId: reminder.dedupeId,
          dedupeCollection,
          isGlobal: reminder.isGlobal,
        }),
      ),
    );
    for (const result of results) {
      if (result === 'sent') sent++;
      else skipped++;
    }
  }

  return { candidates: reminders.length, sent, skipped };
}

/**
 * One full reminder sweep: duty rosters, same-day events, due scheduled
 * announcements, and failed-push retries.
 *
 * Safe to run more than once a day. Every send is guarded by a dedupe document,
 * so a repeat sweep re-sends nothing and simply fills gaps left by a run that
 * never happened.
 */
export async function runDutyReminderSweep(params: {
  adminDb: Firestore;
  adminMessaging: Messaging;
  source: DutyReminderRunSource;
}): Promise<DutyReminderSweepResult> {
  const { adminDb, adminMessaging, source } = params;
  const startedAt = Date.now();

  const timeZone = process.env.DUTY_REMINDER_TIMEZONE || DEFAULT_TIMEZONE;
  const todayIso = getCommunityTodayIso(timeZone);

  // Catch-up: if morning already succeeded today, skip full collection scans
  // (Vercel Fluid CPU + Admin Firestore). Still deliver announcements + push retries.
  if (source === 'catchup') {
    const heartbeatSnap = await adminDb
      .collection(CRON_HEARTBEAT_COLLECTION)
      .doc(CRON_HEARTBEAT_DOC_ID)
      .get();
    const heartbeat = heartbeatSnap.data() as
      | {
          lastRunTodayIso?: string;
          lastRunSource?: string;
          lastError?: string;
        }
      | undefined;

    if (
      shouldSkipCatchupFullScan({
        todayIso,
        lastRunTodayIso: heartbeat?.lastRunTodayIso,
        lastRunSource: heartbeat?.lastRunSource,
        lastError: heartbeat?.lastError,
      })
    ) {
      const scheduledAnnouncements = await deliverDueScheduledAnnouncements(
        adminDb,
        adminMessaging,
        timeZone,
      );
      const pushRetries = await retryFailedNotificationPushes(adminDb, adminMessaging);
      const result: DutyReminderSweepResult = {
        todayIso,
        timeZone,
        source,
        durationMs: Date.now() - startedAt,
        duty: { ...EMPTY_REMINDER_COUNTS },
        events: { ...EMPTY_REMINDER_COUNTS },
        scheduledAnnouncements,
        pushRetries,
        fullScanSkipped: true,
      };
      await recordSweepHeartbeat(adminDb, result);
      return result;
    }
  }

  const [cleaningSnap, cleaningDaysSnap, qtSnap, worshipSnap, eventsSnap, usersSnap, customDefsSnap] =
    await Promise.all([
      adminDb.collection('cleaningRosters').get(),
      adminDb.collection('cleaningDays').get(),
      adminDb.collection('qtRosters').get(),
      adminDb.collection('worshipRosters').get(),
      adminDb.collection('events').get(),
      adminDb.collection('users').get(),
      adminDb.collection('rosterDefinitions').get(),
    ]);

  const cleaningRoster = cleaningSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as CleaningRosterEntry,
  );
  const cleaningDays = cleaningDaysSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as CleaningDay);
  const qtRoster = qtSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as QTRosterEntry);
  const worshipRosters = worshipSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorshipRoster);
  const events = eventsSnap.docs.map((d) =>
    normalizeEventFromFirestore(d.id, d.data() as Record<string, unknown>),
  );
  const users = usersSnap.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as UserProfileData)
    .filter((u) => u.isApproved !== false);

  const windowEndIso = format(
    addDays(parseDay(todayIso), CUSTOM_ROSTER_LOOKAHEAD_DAYS),
    'yyyy-MM-dd',
  );
  const customRosters = await loadCustomRosterDutySources(
    adminDb,
    customDefsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RosterDefinition),
    todayIso,
    windowEndIso,
  );

  const dutyReminders = collectDutyReminders({
    todayIso,
    cleaningRoster,
    cleaningDays,
    qtRoster,
    worshipRosters,
    customRosters,
  });
  const eventReminders = collectEventDayReminders({ todayIso, events, users, timeZone });

  const duty = await sendBatched(
    dutyReminders.map((reminder) => ({
      userId: reminder.userId,
      title: reminder.title,
      message: reminder.message,
      relatedUrl: reminder.relatedUrl,
      dedupeId: reminder.dedupeId,
    })),
    adminDb,
    adminMessaging,
    'dutyReminderLog',
  );
  const eventCounts = await sendBatched(
    eventReminders,
    adminDb,
    adminMessaging,
    'eventReminderLog',
  );

  const scheduledAnnouncements = await deliverDueScheduledAnnouncements(
    adminDb,
    adminMessaging,
    timeZone,
  );
  const pushRetries = await retryFailedNotificationPushes(adminDb, adminMessaging);

  const result: DutyReminderSweepResult = {
    todayIso,
    timeZone,
    source,
    durationMs: Date.now() - startedAt,
    duty,
    events: eventCounts,
    scheduledAnnouncements,
    pushRetries,
  };

  await recordSweepHeartbeat(adminDb, result);

  return result;
}

async function loadCustomRosterDutySources(
  adminDb: Firestore,
  definitions: RosterDefinition[],
  fromDate: string,
  toDate: string,
): Promise<CustomRosterDutySource[]> {
  if (definitions.length === 0) return [];

  const sources = await Promise.all(
    definitions.map(async (def) => {
      const entriesSnap = await adminDb
        .collection('rosterDefinitions')
        .doc(def.id)
        .collection('entries')
        .where('date', '>=', fromDate)
        .where('date', '<=', toDate)
        .get();

      return {
        rosterDefId: def.id,
        rosterName: def.name,
        fields: def.fields,
        entries: entriesSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as CustomRosterEntry,
        ),
      } satisfies CustomRosterDutySource;
    }),
  );

  return sources.filter((source) => source.entries.length > 0);
}

async function recordSweepHeartbeat(
  adminDb: Firestore,
  result: DutyReminderSweepResult,
): Promise<void> {
  const base: Record<string, unknown> = {
    lastRunAt: FieldValue.serverTimestamp(),
    lastRunSource: result.source,
    lastRunTodayIso: result.todayIso,
    lastRunTimeZone: result.timeZone,
    lastRunDurationMs: result.durationMs,
    lastRunPushRetriesSent: result.pushRetries.sent,
    lastRunFullScanSkipped: Boolean(result.fullScanSkipped),
    lastError: FieldValue.delete(),
    lastErrorAt: FieldValue.delete(),
  };

  // Light catch-up must not wipe morning duty/event send counts in admin health.
  if (!result.fullScanSkipped) {
    base.lastRunDutySent = result.duty.sent;
    base.lastRunDutyCandidates = result.duty.candidates;
    base.lastRunEventsSent = result.events.sent;
  }

  await adminDb
    .collection(CRON_HEARTBEAT_COLLECTION)
    .doc(CRON_HEARTBEAT_DOC_ID)
    .set(base, { merge: true })
    // A heartbeat failure must never fail the sweep that already sent reminders.
    .catch((error) => {
      console.error('[runDutyReminderSweep] heartbeat write failed', error);
    });
}

/** Records a failed sweep so the admin health check can distinguish an error from a run that never fired. */
export async function recordSweepFailure(
  adminDb: Firestore,
  source: DutyReminderRunSource,
  message: string,
): Promise<void> {
  await adminDb
    .collection(CRON_HEARTBEAT_COLLECTION)
    .doc(CRON_HEARTBEAT_DOC_ID)
    .set(
      {
        lastError: message,
        lastErrorAt: FieldValue.serverTimestamp(),
        lastErrorSource: source,
      },
      { merge: true },
    )
    .catch(() => {});
}
