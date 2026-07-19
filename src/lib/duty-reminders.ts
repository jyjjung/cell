import { differenceInCalendarDays, format } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import type { CleaningDay, CleaningRosterEntry, QTRosterEntry, WorshipRoster } from '@/types';

const DUTY_REMINDER_WEEK_WINDOW = 7;
const DUTY_REMINDER_DAY_BEFORE = 1;
const DUTY_REMINDER_TODAY = 0;
type DutyReminderOffset =
  | typeof DUTY_REMINDER_WEEK_WINDOW
  | typeof DUTY_REMINDER_DAY_BEFORE
  | typeof DUTY_REMINDER_TODAY;
type DutyKind = 'cleaning' | 'qt' | 'worship';

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

function formatDisplayDate(isoDate: string): string {
  return format(parseDay(isoDate), 'EEE, MMM d');
}

function daysUntilDuty(todayIso: string, dutyDate: string): number {
  return differenceInCalendarDays(parseDay(dutyDate), parseDay(todayIso));
}

function buildDutyReminderDedupeId(
  userId: string,
  kind: DutyKind,
  dutyDate: string,
  daysBefore: number,
): string {
  return `${userId}_${kind}_${dutyDate}_${daysBefore}d`;
}

function weekLeadLabel(daysUntil: number): string {
  if (daysUntil === DUTY_REMINDER_WEEK_WINDOW) return 'in one week';
  return `in ${daysUntil} days`;
}

function pushWeekReminder(
  results: DutyReminderPayload[],
  params: {
    userId: string;
    kind: DutyKind;
    dutyDate: string;
    daysUntil: number;
    titlePrefix: string;
    detail: string;
    relatedUrl: string;
  },
) {
  const { userId, kind, dutyDate, daysUntil, titlePrefix, detail, relatedUrl } = params;
  const displayDate = formatDisplayDate(dutyDate);
  const lead = weekLeadLabel(daysUntil);
  results.push({
    userId,
    kind,
    dutyDate,
    daysBefore: DUTY_REMINDER_WEEK_WINDOW,
    title: `${titlePrefix} coming up`,
    message: `${detail} ${lead} — ${displayDate}.`,
    relatedUrl,
    dedupeId: buildDutyReminderDedupeId(userId, kind, dutyDate, DUTY_REMINDER_WEEK_WINDOW),
  });
}

function pushDayBeforeReminder(
  results: DutyReminderPayload[],
  params: {
    userId: string;
    kind: DutyKind;
    dutyDate: string;
    titlePrefix: string;
    detail: string;
    relatedUrl: string;
  },
) {
  const { userId, kind, dutyDate, titlePrefix, detail, relatedUrl } = params;
  const displayDate = formatDisplayDate(dutyDate);
  results.push({
    userId,
    kind,
    dutyDate,
    daysBefore: DUTY_REMINDER_DAY_BEFORE,
    title: `${titlePrefix} tomorrow`,
    message: `${detail} tomorrow — ${displayDate}.`,
    relatedUrl,
    dedupeId: buildDutyReminderDedupeId(userId, kind, dutyDate, DUTY_REMINDER_DAY_BEFORE),
  });
}

function pushTodayReminder(
  results: DutyReminderPayload[],
  params: {
    userId: string;
    kind: DutyKind;
    dutyDate: string;
    titlePrefix: string;
    detail: string;
    relatedUrl: string;
  },
) {
  const { userId, kind, dutyDate, titlePrefix, detail, relatedUrl } = params;
  const displayDate = formatDisplayDate(dutyDate);
  results.push({
    userId,
    kind,
    dutyDate,
    daysBefore: DUTY_REMINDER_TODAY,
    title: `${titlePrefix} today`,
    message: `${detail} today — ${displayDate}.`,
    relatedUrl,
    dedupeId: buildDutyReminderDedupeId(userId, kind, dutyDate, DUTY_REMINDER_TODAY),
  });
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

  for (const entry of cleaningRoster) {
    const daysUntil = daysUntilDuty(todayIso, entry.date);
    if (daysUntil < DUTY_REMINDER_TODAY || daysUntil > DUTY_REMINDER_WEEK_WINDOW) continue;
    if (!entry.assignedUserIds?.length) continue;

    const dayName = cleaningDaysMap.get(entry.dayId);
    const dayPart = dayName ? ` (${dayName})` : '';
    const detail = `You're on church cleaning${dayPart}`;

    for (const userId of entry.assignedUserIds) {
      if (daysUntil >= 2) {
        pushWeekReminder(results, {
          userId,
          kind: 'cleaning',
          dutyDate: entry.date,
          daysUntil,
          titlePrefix: 'Cleaning duty',
          detail,
          relatedUrl: '/cleaning-roster',
        });
      }
      if (daysUntil === DUTY_REMINDER_DAY_BEFORE) {
        pushDayBeforeReminder(results, {
          userId,
          kind: 'cleaning',
          dutyDate: entry.date,
          titlePrefix: 'Cleaning duty',
          detail,
          relatedUrl: '/cleaning-roster',
        });
      }
      if (daysUntil === DUTY_REMINDER_TODAY) {
        pushTodayReminder(results, {
          userId,
          kind: 'cleaning',
          dutyDate: entry.date,
          titlePrefix: 'Cleaning duty',
          detail,
          relatedUrl: '/cleaning-roster',
        });
      }
    }
  }

  for (const entry of qtRoster) {
    if (!entry.userId) continue;
    const daysUntil = daysUntilDuty(todayIso, entry.date);
    if (daysUntil < DUTY_REMINDER_TODAY || daysUntil > DUTY_REMINDER_WEEK_WINDOW) continue;

    const topic = entry.title || entry.passage || entry.personName;
    const detail = `You're sharing QT${topic ? `: ${topic}` : ''}`;

    if (daysUntil >= 2) {
      pushWeekReminder(results, {
        userId: entry.userId,
        kind: 'qt',
        dutyDate: entry.date,
        daysUntil,
        titlePrefix: 'QT sharing',
        detail,
        relatedUrl: '/qt',
      });
    }
    if (daysUntil === DUTY_REMINDER_DAY_BEFORE) {
      pushDayBeforeReminder(results, {
        userId: entry.userId,
        kind: 'qt',
        dutyDate: entry.date,
        titlePrefix: 'QT sharing',
        detail,
        relatedUrl: '/qt',
      });
    }
    if (daysUntil === DUTY_REMINDER_TODAY) {
      pushTodayReminder(results, {
        userId: entry.userId,
        kind: 'qt',
        dutyDate: entry.date,
        titlePrefix: 'QT sharing',
        detail,
        relatedUrl: '/qt',
      });
    }
  }

  const worshipByDate = new Map<string, WorshipRoster[]>();
  for (const roster of worshipRosters) {
    const list = worshipByDate.get(roster.date) ?? [];
    list.push(roster);
    worshipByDate.set(roster.date, list);
  }

  for (const [dutyDate, rostersOnDate] of worshipByDate) {
    const daysUntil = daysUntilDuty(todayIso, dutyDate);
    if (daysUntil < DUTY_REMINDER_TODAY || daysUntil > DUTY_REMINDER_WEEK_WINDOW) continue;

    const worshipByUser = new Map<string, { roles: string[]; rosterName: string }>();
    for (const roster of rostersOnDate) {
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
      const detail = `You're on ${rosterName}. Roles: ${uniqueRoles.join(', ')}`;

      if (daysUntil >= 2) {
        pushWeekReminder(results, {
          userId,
          kind: 'worship',
          dutyDate,
          daysUntil,
          titlePrefix: 'Worship team',
          detail,
          relatedUrl: '/worship',
        });
      }
      if (daysUntil === DUTY_REMINDER_DAY_BEFORE) {
        pushDayBeforeReminder(results, {
          userId,
          kind: 'worship',
          dutyDate,
          titlePrefix: 'Worship team',
          detail,
          relatedUrl: '/worship',
        });
      }
      if (daysUntil === DUTY_REMINDER_TODAY) {
        pushTodayReminder(results, {
          userId,
          kind: 'worship',
          dutyDate,
          titlePrefix: 'Worship team',
          detail,
          relatedUrl: '/worship',
        });
      }
    }
  }

  return results;
}

/** @internal test helper */
