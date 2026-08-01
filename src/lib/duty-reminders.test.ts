import { describe, expect, it } from 'vitest';
import { collectDutyReminders } from './duty-reminders';
import type { CustomRosterDutySource } from './duty-reminders';

const emptyBase = {
  cleaningRoster: [],
  cleaningDays: [],
  qtRoster: [],
  worshipRosters: [],
};

const customSource: CustomRosterDutySource = {
  rosterDefId: 'def-1',
  rosterName: 'Usher Team',
  fields: [
    { id: 'leader', label: 'Leader', type: 'user', order: 0 },
    { id: 'helper', label: 'Helper', type: 'user', order: 1 },
    { id: 'notes', label: 'Notes', type: 'text', order: 2 },
  ],
  entries: [
    {
      id: 'entry-1',
      date: '2026-08-05',
      fieldValues: {
        leader: { userId: 'u1' },
        helper: { userId: 'u2' },
        notes: { text: 'Front door' },
      },
    },
  ],
};

describe('collectDutyReminders — custom (other) rosters', () => {
  it('emits week-ahead reminders for Member-field assignees', () => {
    const reminders = collectDutyReminders({
      ...emptyBase,
      todayIso: '2026-08-01',
      customRosters: [customSource],
    });

    expect(reminders).toHaveLength(2);
    expect(reminders.map((r) => r.userId).sort()).toEqual(['u1', 'u2']);
    const forLeader = reminders.find((r) => r.userId === 'u1')!;
    expect(forLeader.kind).toBe('custom');
    expect(forLeader.title).toBe('Usher Team coming up');
    expect(forLeader.relatedUrl).toBe('/rosters/def-1');
    expect(forLeader.dedupeId).toBe('u1_custom_def-1_2026-08-05_7d');
    expect(forLeader.message).toContain('Roles: Leader');
  });

  it('emits tomorrow and today reminders', () => {
    const tomorrow = collectDutyReminders({
      ...emptyBase,
      todayIso: '2026-08-04',
      customRosters: [customSource],
    });
    expect(tomorrow.some((r) => r.title === 'Usher Team tomorrow')).toBe(true);

    const today = collectDutyReminders({
      ...emptyBase,
      todayIso: '2026-08-05',
      customRosters: [customSource],
    });
    expect(today.some((r) => r.title === 'Usher Team today')).toBe(true);
  });

  it('scopes dedupe ids per roster definition', () => {
    const other: CustomRosterDutySource = {
      ...customSource,
      rosterDefId: 'def-2',
      rosterName: 'Greeting',
      entries: [
        {
          id: 'entry-2',
          date: '2026-08-05',
          fieldValues: { leader: { userId: 'u1' } },
        },
      ],
    };

    const reminders = collectDutyReminders({
      ...emptyBase,
      todayIso: '2026-08-05',
      customRosters: [customSource, other],
    });

    const u1Ids = reminders.filter((r) => r.userId === 'u1').map((r) => r.dedupeId).sort();
    expect(u1Ids).toEqual([
      'u1_custom_def-1_2026-08-05_0d',
      'u1_custom_def-2_2026-08-05_0d',
    ]);
  });

  it('ignores Name/Text-only fields with no userId', () => {
    const reminders = collectDutyReminders({
      ...emptyBase,
      todayIso: '2026-08-05',
      customRosters: [
        {
          rosterDefId: 'def-3',
          rosterName: 'Names Only',
          fields: [{ id: 'person', label: 'Person', type: 'person', order: 0 }],
          entries: [
            {
              id: 'entry-3',
              date: '2026-08-05',
              fieldValues: { person: { text: 'Alex' } },
            },
          ],
        },
      ],
    });

    expect(reminders).toHaveLength(0);
  });
});
