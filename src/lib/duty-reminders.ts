import { differenceInCalendarDays, format } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import type {
  CleaningDay,
  CleaningRosterEntry,
  CustomRosterEntry,
  QTRosterEntry,
  RosterFieldDefinition,
  WorshipRoster,
} from '@/types';

const DUTY_REMINDER_WEEK_WINDOW = 7;
const DUTY_REMINDER_DAY_BEFORE = 1;
const DUTY_REMINDER_TODAY = 0;
type DutyReminderOffset =
  | typeof DUTY_REMINDER_WEEK_WINDOW
  | typeof DUTY_REMINDER_DAY_BEFORE
  | typeof DUTY_REMINDER_TODAY;
type DutyKind = 'cleaning' | 'qt' | 'worship' | 'custom';

export interface CustomRosterDutySource {
  rosterDefId: string;
  rosterName: string;
  fields?: RosterFieldDefinition[];
  entries: CustomRosterEntry[];
}

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
  scopeId?: string,
): string {
  if (scopeId) {
    return `${userId}_${kind}_${scopeId}_${dutyDate}_${daysBefore}d`;
  }
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
    dedupeScope?: string;
  },
) {
  const { userId, kind, dutyDate, daysUntil, titlePrefix, detail, relatedUrl, dedupeScope } = params;
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
    dedupeId: buildDutyReminderDedupeId(
      userId,
      kind,
      dutyDate,
      DUTY_REMINDER_WEEK_WINDOW,
      dedupeScope,
    ),
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
    dedupeScope?: string;
  },
) {
  const { userId, kind, dutyDate, titlePrefix, detail, relatedUrl, dedupeScope } = params;
  const displayDate = formatDisplayDate(dutyDate);
  results.push({
    userId,
    kind,
    dutyDate,
    daysBefore: DUTY_REMINDER_DAY_BEFORE,
    title: `${titlePrefix} tomorrow`,
    message: `${detail} tomorrow — ${displayDate}.`,
    relatedUrl,
    dedupeId: buildDutyReminderDedupeId(
      userId,
      kind,
      dutyDate,
      DUTY_REMINDER_DAY_BEFORE,
      dedupeScope,
    ),
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
    dedupeScope?: string;
  },
) {
  const { userId, kind, dutyDate, titlePrefix, detail, relatedUrl, dedupeScope } = params;
  const displayDate = formatDisplayDate(dutyDate);
  results.push({
    userId,
    kind,
    dutyDate,
    daysBefore: DUTY_REMINDER_TODAY,
    title: `${titlePrefix} today`,
    message: `${detail} today — ${displayDate}.`,
    relatedUrl,
    dedupeId: buildDutyReminderDedupeId(
      userId,
      kind,
      dutyDate,
      DUTY_REMINDER_TODAY,
      dedupeScope,
    ),
  });
}

function pushOffsetReminders(
  results: DutyReminderPayload[],
  daysUntil: number,
  params: {
    userId: string;
    kind: DutyKind;
    dutyDate: string;
    titlePrefix: string;
    detail: string;
    relatedUrl: string;
    dedupeScope?: string;
  },
) {
  if (daysUntil >= 2) {
    pushWeekReminder(results, { ...params, daysUntil });
  }
  if (daysUntil === DUTY_REMINDER_DAY_BEFORE) {
    pushDayBeforeReminder(results, params);
  }
  if (daysUntil === DUTY_REMINDER_TODAY) {
    pushTodayReminder(results, params);
  }
}

export function collectDutyReminders(params: {
  todayIso: string;
  cleaningRoster: CleaningRosterEntry[];
  cleaningDays: CleaningDay[];
  qtRoster: QTRosterEntry[];
  worshipRosters: WorshipRoster[];
  customRosters?: CustomRosterDutySource[];
}): DutyReminderPayload[] {
  const {
    todayIso,
    cleaningRoster,
    cleaningDays,
    qtRoster,
    worshipRosters,
    customRosters = [],
  } = params;
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
      pushOffsetReminders(results, daysUntil, {
        userId,
        kind: 'cleaning',
        dutyDate: entry.date,
        titlePrefix: 'Cleaning duty',
        detail,
        relatedUrl: '/cleaning-roster',
      });
    }
  }

  for (const entry of qtRoster) {
    if (!entry.userId) continue;
    const daysUntil = daysUntilDuty(todayIso, entry.date);
    if (daysUntil < DUTY_REMINDER_TODAY || daysUntil > DUTY_REMINDER_WEEK_WINDOW) continue;

    const topic = entry.title || entry.passage || entry.personName;
    const detail = `You're sharing QT${topic ? `: ${topic}` : ''}`;

    pushOffsetReminders(results, daysUntil, {
      userId: entry.userId,
      kind: 'qt',
      dutyDate: entry.date,
      titlePrefix: 'QT sharing',
      detail,
      relatedUrl: '/qt',
    });
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

      pushOffsetReminders(results, daysUntil, {
        userId,
        kind: 'worship',
        dutyDate,
        titlePrefix: 'Worship team',
        detail,
        relatedUrl: '/worship',
      });
    }
  }

  for (const custom of customRosters) {
    const rosterName = custom.rosterName?.trim() || 'Roster';
    const relatedUrl = `/rosters/${custom.rosterDefId}`;

    for (const entry of custom.entries) {
      const daysUntil = daysUntilDuty(todayIso, entry.date);
      if (daysUntil < DUTY_REMINDER_TODAY || daysUntil > DUTY_REMINDER_WEEK_WINDOW) continue;

      const byUser = new Map<string, string[]>();
      for (const field of custom.fields ?? []) {
        if (field.type !== 'user') continue;
        const userId = entry.fieldValues?.[field.id]?.userId;
        if (!userId) continue;
        const labels = byUser.get(userId) ?? [];
        labels.push(field.label);
        byUser.set(userId, labels);
      }

      // If field metadata is missing, still notify anyone with a Member userId set
      if (byUser.size === 0) {
        for (const value of Object.values(entry.fieldValues ?? {})) {
          if (value?.userId && !byUser.has(value.userId)) {
            byUser.set(value.userId, []);
          }
        }
      }

      for (const [userId, labels] of byUser) {
        const uniqueLabels = [...new Set(labels)];
        const rolePart = uniqueLabels.length > 0 ? `. Roles: ${uniqueLabels.join(', ')}` : '';
        const detail = `You're on ${rosterName}${rolePart}`;

        pushOffsetReminders(results, daysUntil, {
          userId,
          kind: 'custom',
          dutyDate: entry.date,
          titlePrefix: rosterName,
          detail,
          relatedUrl,
          dedupeScope: custom.rosterDefId,
        });
      }
    }
  }

  return results;
}
