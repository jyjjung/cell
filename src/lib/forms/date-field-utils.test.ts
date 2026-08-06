import { describe, expect, it } from 'vitest';
import {
  isValidIsoDateString,
  isWeekdayAllowed,
  normalizeAllowedWeekdays,
  parseDateValue,
  toggleWeekday,
  validateDateAnswer,
  validateDatesAnswer,
} from '@/lib/forms/date-field-utils';
import { parseDay } from '@/lib/event-occurrences';

describe('date-field-utils', () => {
  it('validates ISO date strings', () => {
    expect(isValidIsoDateString('2026-08-06')).toBe(true);
    expect(isValidIsoDateString('2026-02-30')).toBe(false);
    expect(isValidIsoDateString('bad')).toBe(false);
  });

  it('checks allowed weekdays', () => {
    const thursday = parseDay('2026-08-06'); // Thursday
    expect(isWeekdayAllowed(thursday, [4])).toBe(true);
    expect(isWeekdayAllowed(thursday, [1, 2, 3])).toBe(false);
    expect(isWeekdayAllowed(thursday)).toBe(true);
  });

  it('validates single date answers with weekday constraints', () => {
    expect(validateDateAnswer('2026-08-06', [4])).toBeNull();
    expect(validateDateAnswer('2026-08-06', [1])).toBe('Pick a date on an allowed day of the week.');
    expect(validateDateAnswer('not-a-date')).toBe('Enter a valid date.');
  });

  it('validates multiple date answers', () => {
    expect(validateDatesAnswer(['2026-08-06', '2026-08-13'], [4])).toBeNull();
    expect(validateDatesAnswer(['2026-08-06', '2026-08-07'], [4])).toBe(
      'Pick a date on an allowed day of the week.',
    );
  });

  it('toggles weekdays and normalizes config', () => {
    expect(toggleWeekday([1], 4, true)).toEqual([1, 4]);
    expect(toggleWeekday([1, 4], 4, false)).toEqual([1]);
    expect(normalizeAllowedWeekdays([4, 4, 1, 9, 'x'])).toEqual([1, 4]);
    expect(normalizeAllowedWeekdays([])).toBeUndefined();
  });

  it('parses date values to local calendar dates', () => {
    const parsed = parseDateValue('2026-08-06');
    expect(parsed).not.toBeNull();
    expect(parsed!.getDay()).toBe(4);
  });
});
