import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import { EventCategory, type AppEvent, type EventRecurrence } from '@/types';

function day(d: Date): Date {
  return startOfDay(d);
}

export function parseDay(iso: string): Date {
  const s = iso.includes('T') ? iso : `${iso}T12:00:00`;
  return day(parseISO(s));
}

function isBirthdayEvent(event: AppEvent): boolean {
  return event.category === EventCategory.Birthday;
}

/** Calendar YYYY-MM-DD for an instant in a community timezone (no startOfDay shift). */
function communityCalendarDayFromInstant(isoOrDate: string, timeZone: string): string {
  const instant = new Date(isoOrDate);
  if (Number.isNaN(instant.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(instant);
}

/** Whether a birthday event falls on today in the community timezone. */
export function birthdayOccursOnCommunityDate(
  event: AppEvent,
  todayIso: string,
  timeZone = 'Australia/Brisbane',
): boolean {
  if (!isBirthdayEvent(event) || !event.date) return false;
  const todayMd = todayIso.slice(5, 10);
  if (!/^\d{2}-\d{2}$/.test(todayMd)) return false;

  const raw = event.date.trim();
  // Plain calendar dates (YYYY-MM-DD) must not be timezone-shifted.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.slice(5, 10) === todayMd;
  }

  // Firestore Timestamp → ISO instant: interpret the civil day in community TZ.
  const birthDay = communityCalendarDayFromInstant(raw, timeZone);
  if (!birthDay || birthDay.length < 10) return false;
  return birthDay.slice(5, 10) === todayMd;
}

function birthdayMonthDay(event: AppEvent): { month: number; day: number } {
  const start = parseDay(event.date);
  return { month: start.getMonth(), day: start.getDate() };
}

function birthdayOnDate(event: AppEvent, targetDay: Date): boolean {
  const { month, day: dom } = birthdayMonthDay(event);
  const target = day(targetDay);
  return target.getMonth() === month && target.getDate() === dom;
}

/**
 * Whether `targetDay` falls on an occurrence of this event (non-recurring span, recurrence, or weekday filter).
 */
export function eventOccursOnDate(event: AppEvent, targetDay: Date): boolean {
  if (isBirthdayEvent(event)) {
    return birthdayOnDate(event, targetDay);
  }

  const target = day(targetDay);
  const recurrence: EventRecurrence = event.recurrence ?? 'none';
  const start = parseDay(event.date);

  if (isBefore(target, start)) return false;

  if (recurrence === 'daily' || recurrence === 'weekly') {
    const until = event.recurrenceUntil ? parseDay(event.recurrenceUntil) : start;
    if (isAfter(target, until)) return false;
    let weekdays = event.weekdays ?? [];
    if (recurrence === 'weekly' && weekdays.length === 0) {
      weekdays = [start.getDay()];
    }
    const dow = target.getDay();
    if (weekdays.length > 0 && !weekdays.includes(dow)) return false;
    return true;
  }

  const end = event.endDate ? parseDay(event.endDate) : start;
  if (isAfter(target, end)) return false;
  const wds = event.weekdays;
  if (wds?.length && !wds.includes(target.getDay())) return false;
  return true;
}

/** Sorted YYYY-MM-DD occurrence strings from start through end of relevant range (for listing / grouping). */
function getOccurrenceDateStrings(
  event: AppEvent,
  options?: { listUntil?: Date; listFrom?: Date }
): string[] {
  const cap = options?.listUntil ? day(options.listUntil) : null;
  const listFrom = options?.listFrom ? day(options.listFrom) : null;

  if (isBirthdayEvent(event)) {
    const { month, day: dom } = birthdayMonthDay(event);
    const out: string[] = [];
    const capDay = cap ?? day(addDays(new Date(), 365 * 2));
    const startYear = listFrom?.getFullYear() ?? parseDay(event.date).getFullYear();
    const endYear = capDay.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      const occurrence = day(new Date(year, month, dom));
      if (listFrom && isBefore(occurrence, listFrom)) continue;
      if (isAfter(occurrence, capDay)) break;
      out.push(format(occurrence, 'yyyy-MM-dd'));
    }

    return out;
  }

  const recurrence: EventRecurrence = event.recurrence ?? 'none';
  const start = parseDay(event.date);

  const pushRange = (from: Date, to: Date, weekdays: number[] | undefined) => {
    const out: string[] = [];
    let d = from;
    const end = to;
    while (!isAfter(d, end)) {
      if (!weekdays?.length || weekdays.includes(d.getDay())) {
        out.push(format(d, 'yyyy-MM-dd'));
      }
      d = addDays(d, 1);
    }
    return out;
  };

  if (recurrence === 'daily' || recurrence === 'weekly') {
    const until = event.recurrenceUntil ? parseDay(event.recurrenceUntil) : start;
    let weekdays = event.weekdays ?? [];
    if (recurrence === 'weekly' && weekdays.length === 0) {
      weekdays = [start.getDay()];
    }
    const effectiveUntil = cap && isBefore(cap, until) ? cap : until;
    if (isBefore(effectiveUntil, start)) return [];
    return pushRange(start, effectiveUntil, recurrence === 'daily' && weekdays.length === 0 ? undefined : weekdays);
  }

  const end = event.endDate ? parseDay(event.endDate) : start;
  const effectiveEnd = cap && isBefore(cap, end) ? cap : end;
  if (isBefore(effectiveEnd, start)) return [];
  const weekdays = event.weekdays?.length ? event.weekdays : undefined;
  return pushRange(start, effectiveEnd, weekdays);
}

function getLatestOccurrenceDay(event: AppEvent): Date {
  if (isBirthdayEvent(event)) {
    const { month, day: dom } = birthdayMonthDay(event);
    const today = day(new Date());
    const thisYear = day(new Date(today.getFullYear(), month, dom));
    if (!isBefore(thisYear, today)) return thisYear;
    return day(new Date(today.getFullYear() + 1, month, dom));
  }

  const recurrence: EventRecurrence = event.recurrence ?? 'none';
  if (recurrence === 'daily' || recurrence === 'weekly') {
    return event.recurrenceUntil ? parseDay(event.recurrenceUntil) : parseDay(event.date);
  }
  return event.endDate ? parseDay(event.endDate) : parseDay(event.date);
}

/** Whether any occurrence falls on `fromDay` or later (walks day-by-day; bounded). */
function eventHasFutureOccurrence(event: AppEvent, fromDay: Date): boolean {
  const from = day(fromDay);
  const last = getLatestOccurrenceDay(event);
  if (isBefore(last, from)) return false;
  let d = from;
  for (let i = 0; i < 800; i++) {
    if (isAfter(d, last)) break;
    if (eventOccursOnDate(event, d)) return true;
    d = addDays(d, 1);
  }
  return false;
}

/** True if there is no occurrence on or after `fromDay`. */
export function eventIsFullyBefore(event: AppEvent, fromDay: Date): boolean {
  return !eventHasFutureOccurrence(event, fromDay);
}

export type EventOccurrenceRow = {
  occurrenceKey: string;
  occurrenceDate: Date;
  event: AppEvent;
};

/** Expand stored events into per-day rows for calendars and lists (within optional window). */
export function expandEventsToOccurrenceRows(
  events: AppEvent[],
  options?: { from?: Date; until?: Date }
): EventOccurrenceRow[] {
  const from = options?.from ? day(options.from) : undefined;
  const until = options?.until ? day(options.until) : undefined;
  const rows: EventOccurrenceRow[] = [];

  for (const event of events) {
    const listUntil = until ?? addDays(new Date(), 365 * 2);
    const ymds = getOccurrenceDateStrings(event, { listUntil, listFrom: from });
    for (const ymd of ymds) {
      const d = parseDay(ymd);
      if (from && isBefore(d, from)) continue;
      if (until && isAfter(d, until)) continue;
      rows.push({
        occurrenceKey: `${event.id}:${ymd}`,
        occurrenceDate: d,
        event,
      });
    }
  }

  return rows.sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
}
