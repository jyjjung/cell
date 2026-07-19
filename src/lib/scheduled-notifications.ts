import type { Timestamp } from 'firebase/firestore';
import { getCommunityTodayIso } from '@/lib/duty-reminders';

const DEFAULT_TIMEZONE = 'Australia/Brisbane';

function timestampToMillis(value: Timestamp | { toMillis?: () => number; seconds?: number }): number {
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function getScheduledDateIso(
  scheduledFor: Timestamp | { toMillis?: () => number; seconds?: number },
  timeZone = process.env.DUTY_REMINDER_TIMEZONE || DEFAULT_TIMEZONE,
): string {
  const millis = timestampToMillis(scheduledFor);
  if (!millis) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(millis));
}

/** Defer push until the morning cron on the scheduled calendar day (community timezone). */
export function shouldDeferScheduledAnnouncement(
  scheduledFor: Timestamp | null | undefined,
  timeZone = process.env.DUTY_REMINDER_TIMEZONE || DEFAULT_TIMEZONE,
): boolean {
  if (!scheduledFor) return false;
  const scheduledDateIso = getScheduledDateIso(scheduledFor, timeZone);
  if (!scheduledDateIso) return false;
  const todayIso = getCommunityTodayIso(timeZone);
  return scheduledDateIso > todayIso;
}
