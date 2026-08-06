import { format } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';

export const FORM_WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

export function formatDateValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDateValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m! - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return parseDay(value);
}

export function isWeekdayAllowed(date: Date, allowedWeekdays?: number[]): boolean {
  if (!allowedWeekdays?.length) return true;
  return allowedWeekdays.includes(date.getDay());
}

export function isValidIsoDateString(value: string): boolean {
  return parseDateValue(value) !== null;
}

export function validateDateAnswer(
  value: string,
  allowedWeekdays?: number[],
): string | null {
  if (!value.trim()) return null;
  if (!isValidIsoDateString(value)) return 'Enter a valid date.';
  const date = parseDateValue(value)!;
  if (!isWeekdayAllowed(date, allowedWeekdays)) {
    return 'Pick a date on an allowed day of the week.';
  }
  return null;
}

export function validateDatesAnswer(
  values: string[],
  allowedWeekdays?: number[],
): string | null {
  if (values.length === 0) return null;
  for (const value of values) {
    const error = validateDateAnswer(value, allowedWeekdays);
    if (error) return error;
  }
  return null;
}

export function toggleWeekday(current: number[], value: number, checked: boolean): number[] {
  if (checked) {
    return [...new Set([...current, value])].sort((a, b) => a - b);
  }
  return current.filter((day) => day !== value);
}

export function normalizeAllowedWeekdays(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const days = raw
    .filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 6);
  const unique = [...new Set(days)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : undefined;
}
