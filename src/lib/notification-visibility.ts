/**
 * Shared rules for which in-app notifications count toward unread / badge.
 * Client list queries and server badge math must stay aligned with these filters.
 */

export const COMMUNITY_TIMEZONE_DEFAULT = 'Australia/Brisbane';

export const NOTIFICATION_UNREAD_LOOKBACK_DAYS = 30;

/** Soft caps matching client Firestore listeners (personal / announcements / globals). */
export const NOTIFICATION_QUERY_LIMITS = {
  personal: 50,
  announcements: 40,
  globals: 40,
} as const;

export type NotificationUnreadFields = {
  id?: string;
  userId?: string | null;
  isGlobal?: boolean;
  type?: string;
  readBy?: string[] | null;
  createdAt?: unknown;
};

export function isNotificationVisibleToUser(
  notification: NotificationUnreadFields,
  userId: string,
): boolean {
  if (notification.userId === userId) return true;
  if (notification.isGlobal === true) return true;
  if (notification.type === 'announcement') return true;
  return false;
}

export function isNotificationUnreadForUser(
  notification: NotificationUnreadFields,
  userId: string,
): boolean {
  if (!isNotificationVisibleToUser(notification, userId)) return false;
  const readBy = Array.isArray(notification.readBy) ? notification.readBy : [];
  return !readBy.includes(userId);
}

export function countUnreadNotificationsForUser(
  notifications: NotificationUnreadFields[],
  userId: string,
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const notification of notifications) {
    const key = notification.id || '';
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    if (isNotificationUnreadForUser(notification, userId)) {
      count++;
    }
  }
  return count;
}

/** Convert a community wall-clock date+time into a UTC Date. */
export function communityWallTimeToUtcDate(
  dateIso: string,
  timeHm: string,
  timeZone: string,
): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeHm.trim());
  if (!dateMatch || !timeMatch) {
    throw new Error('Invalid community wall time');
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  let utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(new Date(utcMillis));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '0';
    const asYear = Number(get('year'));
    const asMonth = Number(get('month'));
    const asDay = Number(get('day'));
    let asHour = Number(get('hour'));
    if (asHour === 24) asHour = 0;
    const asMinute = Number(get('minute'));
    const asSecond = Number(get('second'));

    const asUtc = Date.UTC(asYear, asMonth - 1, asDay, asHour, asMinute, asSecond);
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = wanted - asUtc;
    if (delta === 0) break;
    utcMillis += delta;
  }

  return new Date(utcMillis);
}
