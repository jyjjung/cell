import { addDays, format } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import type { CleaningDay, CleaningRosterEntry, QTRosterEntry, WorshipRoster } from '@/types';

export const DUTY_REMINDER_OFFSETS = [1, 7] as const;
export type DutyReminderOffset = (typeof DUTY_REMINDER_OFFSETS)[number];
export type DutyKind = 'cleaning' | 'qt' | 'worship';

export interface DutyReminderPayload {
  userId: string;
  kind: DutyKind;
  dutyDate: string;
  daysBefore: DutyReminderOffset;
  title: string;
  message: string;
  relatedUrl: string;
  dedupeId: string;
}

export function getCommunityTodayIso(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

function addDaysToIso(isoDate: string, days: number): string {
  return format(addDays(parseDay(isoDate), days), 'yyyy-MM-dd');
}

function formatDisplayDate(isoDate: string): string {
  return format(parseDay(isoDate), 'EEE, MMM d');
}

export function buildDutyReminderDedupeId(
  userId: string,
  kind: DutyKind,
  dutyDate: string,
  daysBefore: number,
): string {
  return `${userId}_${kind}_${dutyDate}_${daysBefore}d`;
}

export function collectDutyReminders(params: {
  todayIso: string;
  cleaningRoster: CleaningRosterEntry[];
  cleaningDays: CleaningDay[];
  qtRoster: QTRosterEntry[];
  worshipRosters: WorshipRoster[];
}): DutyReminderPayload[] {
  const { todayIso, cleaningRoster, cleaningDays, qtRoster, worshipRosters } = params;
  const cleaningDaysMap = new Map(cleaningDays.map((d) => [d.id, d.name.trim()]));
  const results: DutyReminderPayload[] = [];

  for (const daysBefore of DUTY_REMINDER_OFFSETS) {
    const dutyDate = addDaysToIso(todayIso, daysBefore);
    const whenLabel = daysBefore === 1 ? 'tomorrow' : 'in one week';
    const displayDate = formatDisplayDate(dutyDate);

    const cleaningEntry = cleaningRoster.find((r) => r.date === dutyDate);
    if (cleaningEntry?.assignedUserIds?.length) {
      const dayName = cleaningDaysMap.get(cleaningEntry.dayId);
      const dayPart = dayName ? ` (${dayName})` : '';
      for (const userId of cleaningEntry.assignedUserIds) {
        results.push({
          userId,
          kind: 'cleaning',
          dutyDate,
          daysBefore,
          title: daysBefore === 1 ? 'Cleaning duty tomorrow' : 'Cleaning duty next week',
          message: `You're on church cleaning ${whenLabel}${dayPart} — ${displayDate}.`,
          relatedUrl: '/cleaning-roster',
          dedupeId: buildDutyReminderDedupeId(userId, 'cleaning', dutyDate, daysBefore),
        });
      }
    }

    const qtEntry = qtRoster.find((r) => r.date === dutyDate);
    if (qtEntry?.userId) {
      const detail = qtEntry.title || qtEntry.passage || qtEntry.personName;
      results.push({
        userId: qtEntry.userId,
        kind: 'qt',
        dutyDate,
        daysBefore,
        title: daysBefore === 1 ? 'QT sharing tomorrow' : 'QT sharing next week',
        message: `You're sharing QT ${whenLabel} — ${displayDate}${detail ? `: ${detail}` : ''}.`,
        relatedUrl: '/qt',
        dedupeId: buildDutyReminderDedupeId(qtEntry.userId, 'qt', dutyDate, daysBefore),
      });
    }

    const worshipOnDate = worshipRosters.filter((r) => r.date === dutyDate);
    const worshipByUser = new Map<string, { roles: string[]; rosterName: string }>();
    for (const roster of worshipOnDate) {
      for (const slot of roster.slots ?? []) {
        for (const member of slot.members ?? []) {
          if (!member.userId) continue;
          const existing = worshipByUser.get(member.userId) ?? {
            roles: [],
            rosterName: roster.name || 'Worship',
          };
          existing.roles.push(slot.role);
          worshipByUser.set(member.userId, existing);
        }
      }
    }

    for (const [userId, { roles, rosterName }] of worshipByUser) {
      const uniqueRoles = [...new Set(roles)];
      results.push({
        userId,
        kind: 'worship',
        dutyDate,
        daysBefore,
        title: daysBefore === 1 ? 'Worship team tomorrow' : 'Worship team next week',
        message: `You're on ${rosterName} ${whenLabel} — ${displayDate}. Roles: ${uniqueRoles.join(', ')}.`,
        relatedUrl: '/worship',
        dedupeId: buildDutyReminderDedupeId(userId, 'worship', dutyDate, daysBefore),
      });
    }
  }

  return results;
}
