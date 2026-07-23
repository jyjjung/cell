import { describe, expect, it } from 'vitest';
import {
  COMMUNITY_TIMEZONE_DEFAULT,
  communityWallTimeToUtcDate,
  countUnreadNotificationsForUser,
  isNotificationUnreadForUser,
  isNotificationVisibleToUser,
} from '@/lib/notification-visibility';

describe('notification visibility', () => {
  it('shows personal, global, and announcement notifications to the user', () => {
    expect(isNotificationVisibleToUser({ userId: 'u1' }, 'u1')).toBe(true);
    expect(isNotificationVisibleToUser({ userId: 'u2' }, 'u1')).toBe(false);
    expect(isNotificationVisibleToUser({ isGlobal: true, type: 'admin' }, 'u1')).toBe(true);
    expect(isNotificationVisibleToUser({ type: 'announcement' }, 'u1')).toBe(true);
  });

  it('counts unread with dedupe across overlapping global/announcement docs', () => {
    const count = countUnreadNotificationsForUser(
      [
        { id: 'a', type: 'announcement', isGlobal: true, readBy: [] },
        { id: 'a', type: 'announcement', isGlobal: true, readBy: [] },
        { id: 'b', type: 'admin', isGlobal: true, readBy: ['u1'] },
        { id: 'c', userId: 'u1', type: 'reminder', readBy: [] },
        { id: 'd', userId: 'u2', type: 'reminder', readBy: [] },
      ],
      'u1',
    );
    expect(count).toBe(2);
    expect(isNotificationUnreadForUser({ id: 'b', isGlobal: true, readBy: ['u1'] }, 'u1')).toBe(false);
  });
});

describe('communityWallTimeToUtcDate', () => {
  it('interprets Brisbane wall time as UTC+10 (no DST)', () => {
    const date = communityWallTimeToUtcDate('2026-07-23', '08:00', COMMUNITY_TIMEZONE_DEFAULT);
    expect(date.toISOString()).toBe('2026-07-22T22:00:00.000Z');
  });

  it('does not depend on the host timezone for the same Brisbane wall clock', () => {
    const morning = communityWallTimeToUtcDate('2026-01-15', '09:30', COMMUNITY_TIMEZONE_DEFAULT);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: COMMUNITY_TIMEZONE_DEFAULT,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(morning).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
    );
    expect(parts.year).toBe('2026');
    expect(parts.month).toBe('01');
    expect(parts.day).toBe('15');
    expect(Number(parts.hour === '24' ? 0 : parts.hour)).toBe(9);
    expect(parts.minute).toBe('30');
  });
});
