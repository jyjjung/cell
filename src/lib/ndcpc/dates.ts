import { addWeeks, format, isSunday, nextSunday, parseISO, startOfDay, subWeeks } from 'date-fns';

export function getSundays() {
  const sundays = [];
  const currentSunday = startOfDay(nextSunday(new Date()));

  for (let i = 10; i > 0; i--) {
    sundays.push(subWeeks(currentSunday, i));
  }

  for (let i = 0; i < 20; i++) {
    sundays.push(addWeeks(currentSunday, i));
  }

  return sundays;
}

export function getDefaultSunday() {
  return startOfDay(nextSunday(new Date()));
}

export function getUpcomingSunday(from = new Date()) {
  const today = startOfDay(from);
  if (isSunday(today)) return today;
  return startOfDay(nextSunday(today));
}

export function toCalendarDate(timestamp?: { seconds: number }) {
  if (!timestamp?.seconds) return null;
  return startOfDay(new Date(timestamp.seconds * 1000));
}

export function isSameCalendarDay(
  timestamp: { seconds: number } | undefined,
  date: Date
) {
  const itemDate = toCalendarDate(timestamp);
  if (!itemDate) return false;
  return itemDate.getTime() === startOfDay(date).getTime();
}

export function findBySunday<T extends { date?: { seconds: number } }>(
  items: T[] | null | undefined,
  sunday: Date
): T | undefined {
  if (!items) return undefined;
  return items.find((item) => isSameCalendarDay(item.date, sunday));
}

/** True when the Sunday is before the current/upcoming service Sunday. */
export function isPastSundayDate(timestamp?: { seconds: number } | null): boolean {
  const calendar = toCalendarDate(timestamp ?? undefined);
  if (!calendar) return false;
  return calendar.getTime() < getUpcomingSunday().getTime();
}

/** True when the calendar day is before today (any weekday). */
export function isPastCalendarDate(timestamp?: { seconds: number } | null): boolean {
  const calendar = toCalendarDate(timestamp ?? undefined);
  if (!calendar) return false;
  return calendar.getTime() < startOfDay(new Date()).getTime();
}

/** Firestore timestamp → `yyyy-MM-dd` for `<input type="date">`. */
export function timestampToDateInputValue(timestamp?: { seconds: number } | null): string {
  const calendar = toCalendarDate(timestamp ?? undefined);
  return format(calendar ?? startOfDay(new Date()), 'yyyy-MM-dd');
}

/** `yyyy-MM-dd` → start-of-day Date. */
export function dateInputValueToDate(value: string): Date {
  return startOfDay(parseISO(value));
}

/** Match a stored schedule date to a Sunday option ISO (or build one). */
export function scheduleDateToSundayIso(
  timestamp: { seconds: number } | undefined,
  sundays: Date[],
  fallback: Date,
): string {
  const calendar = toCalendarDate(timestamp);
  if (!calendar) return startOfDay(fallback).toISOString();
  const match = sundays.find((sunday) => startOfDay(sunday).getTime() === calendar.getTime());
  return (match ? startOfDay(match) : calendar).toISOString();
}
