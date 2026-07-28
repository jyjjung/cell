import { describe, expect, it } from 'vitest';
import { collectEventDayReminders } from './event-reminders';
import { normalizeEventFromFirestore } from './event-doc';
import { EventCategory, type AppEvent, type UserProfileData } from '@/types';

const users = [
  { uid: 'u1', roleIds: ['role-a'] },
  { uid: 'u2', roleIds: ['role-b'] },
  { uid: 'u3', roleIds: [] },
] as UserProfileData[];

const birthday: AppEvent = {
  id: 'bday-1',
  title: 'Alex Kim',
  date: '1995-06-26',
  category: EventCategory.Birthday,
  allowedRoleIds: ['role-a'],
};

describe('collectEventDayReminders', () => {
  it('notifies the community once about birthdays (global)', () => {
    const reminders = collectEventDayReminders({
      todayIso: '2026-06-26',
      events: [birthday],
      users,
      timeZone: 'Australia/Brisbane',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].isGlobal).toBe(true);
    expect(reminders[0].title).toBe('Birthday today');
    expect(reminders[0].message.includes('Alex Kim')).toBe(true);
    expect(reminders[0].dedupeId).toBe('global_event_bday-1_2026-06-26_0d');
  });

  it('limits ordinary events to eligible roles', () => {
    const event: AppEvent = {
      id: 'evt-1',
      title: 'Youth Night',
      date: '2026-06-26',
      category: 'Event',
      allowedRoleIds: ['role-a'],
    };
    const reminders = collectEventDayReminders({
      todayIso: '2026-06-26',
      events: [event],
      users,
    });

    expect(reminders.map((reminder) => reminder.userId)).toEqual(['u1']);
  });

  it('only emits leap-day birthdays on February 29', () => {
    const leapYearBirthday: AppEvent = {
      ...birthday,
      id: 'bday-2',
      title: 'Jordan Lee',
      date: '2000-02-29',
    };

    expect(collectEventDayReminders({
      todayIso: '2026-02-28',
      events: [leapYearBirthday],
      users,
    })).toHaveLength(0);
    expect(collectEventDayReminders({
      todayIso: '2026-03-01',
      events: [leapYearBirthday],
      users,
    })).toHaveLength(0);
    expect(collectEventDayReminders({
      todayIso: '2028-02-29',
      events: [leapYearBirthday],
      users,
      timeZone: 'Australia/Brisbane',
    })).toHaveLength(1);
  });

  it('normalizes Firestore Timestamp birthdays', () => {
    const event = normalizeEventFromFirestore('ts-1', {
      title: 'Taylor Swift',
      date: { toDate: () => new Date('1995-06-26T00:00:00.000Z') },
      category: EventCategory.Birthday,
    });

    expect(collectEventDayReminders({
      todayIso: '2026-06-26',
      events: [event],
      users,
      timeZone: 'Australia/Brisbane',
    })).toHaveLength(1);
  });
});
