/**
 * Quick sanity check for event reminder targeting.
 * Run: npx tsx scripts/test-event-reminders.ts
 */
import assert from 'node:assert/strict';
import { collectEventDayReminders } from '../src/lib/event-reminders';
import { normalizeEventFromFirestore } from '../src/lib/event-doc';
import { EventCategory, type AppEvent, type UserProfileData } from '../src/types';

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

const restrictedEvent: AppEvent = {
  id: 'evt-1',
  title: 'Youth Night',
  date: '2026-06-26',
  category: 'Event',
  allowedRoleIds: ['role-a'],
};

const todayIso = '2026-06-26';

const birthdayReminders = collectEventDayReminders({
  todayIso,
  events: [birthday],
  users,
  timeZone: 'Australia/Brisbane',
});
assert.equal(birthdayReminders.length, 3, 'birthday reminders go to every approved user');
assert.ok(
  birthdayReminders.every((r) => r.title === 'Birthday today'),
  'birthday reminders use birthday title',
);
assert.ok(
  birthdayReminders.every((r) => r.message.includes('Alex Kim')),
  'birthday reminders include the member name',
);

const eventReminders = collectEventDayReminders({
  todayIso,
  events: [restrictedEvent],
  users,
});
assert.equal(eventReminders.length, 1, 'role-restricted events only notify eligible users');
assert.equal(eventReminders[0]?.userId, 'u1');

const leapYearBirthday: AppEvent = {
  ...birthday,
  id: 'bday-2',
  title: 'Jordan Lee',
  date: '2000-02-29',
};
const feb28 = collectEventDayReminders({
  todayIso: '2026-02-28',
  events: [leapYearBirthday],
  users,
});
assert.equal(feb28.length, 0, 'Feb 29 birthday does not fire on Feb 28');

const mar1 = collectEventDayReminders({
  todayIso: '2026-03-01',
  events: [leapYearBirthday],
  users,
});
assert.equal(mar1.length, 0, 'Feb 29 birthday does not fire on Mar 1 in non-leap years');

const leapDay = collectEventDayReminders({
  todayIso: '2028-02-29',
  events: [leapYearBirthday],
  users,
  timeZone: 'Australia/Brisbane',
});
assert.equal(leapDay.length, 3, 'Feb 29 birthday fires on leap day');

const fromTimestamp = normalizeEventFromFirestore('ts-1', {
  title: 'Taylor Swift',
  date: { toDate: () => new Date('1995-06-26T00:00:00.000Z') },
  category: EventCategory.Birthday,
});
const tsReminders = collectEventDayReminders({
  todayIso: '2026-06-26',
  events: [fromTimestamp],
  users,
  timeZone: 'Australia/Brisbane',
});
assert.equal(tsReminders.length, 3, 'Firestore Timestamp birthdays normalize correctly');

console.log('event reminder tests passed');
