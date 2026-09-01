import { describe, expect, it } from 'vitest';
import { differenceInCalendarWeeks } from 'date-fns';
import {
  calculatePlanProgressToDatePercent,
  countPlanPassagesDueThrough,
  getPlanHeatmapRange,
  getWeekPassageKeys,
} from '@/lib/reading-utils';
import { makePassageKey } from '@/lib/passage-keys';
import type { DailyReading } from '@/types';

function day(date: string, passages: string[]): DailyReading {
  return {
    date,
    passages: passages.map((displayText) => ({
      displayText,
      book: displayText.split(' ')[0],
      chapter: Number(displayText.split(' ')[1] || 1),
    })),
  };
}

describe('plan progress to date', () => {
  const readings = [
    day('2026-01-01', ['Genesis 1', 'Genesis 2']),
    day('2026-01-02', ['Genesis 3']),
    day('2026-01-10', ['Exodus 1', 'Exodus 2']),
  ];

  it('counts passages due through asOf inclusive', () => {
    expect(countPlanPassagesDueThrough(readings, new Date(2026, 0, 2))).toBe(3);
    expect(countPlanPassagesDueThrough(readings, new Date(2026, 0, 1))).toBe(2);
    expect(countPlanPassagesDueThrough(readings, new Date(2025, 11, 31))).toBe(0);
  });

  it('matches leaderboard-style percent against due-through-today', () => {
    const completed = [
      makePassageKey('2026-01-01', 'Genesis 1'),
      makePassageKey('2026-01-01', 'Genesis 2'),
      makePassageKey('2026-01-02', 'Genesis 3'),
    ];
    expect(
      calculatePlanProgressToDatePercent(readings, completed, new Date(2026, 0, 2)),
    ).toBe(100);
    expect(
      calculatePlanProgressToDatePercent(readings, completed, new Date(2026, 0, 10)),
    ).toBe(60);
  });
});

describe('getPlanHeatmapRange', () => {
  it('fits a short plan instead of a 53-week year', () => {
    const readings = [
      day('2026-03-01', ['Genesis 1']),
      day('2026-04-12', ['Exodus 1']),
    ];
    const range = getPlanHeatmapRange(readings, new Date(2026, 2, 15));
    expect(range).not.toBeNull();
    const weeks = differenceInCalendarWeeks(range!.end, range!.start, { weekStartsOn: 0 }) + 1;
    expect(weeks).toBeLessThanOrEqual(10);
    expect(weeks).toBeGreaterThanOrEqual(6);
  });

  it('caps a multi-year plan at 53 weeks', () => {
    const readings = [
      day('2024-01-01', ['Genesis 1']),
      day('2026-12-31', ['Revelation 22']),
    ];
    const range = getPlanHeatmapRange(readings, new Date(2026, 5, 1));
    expect(range).not.toBeNull();
    expect(differenceInCalendarWeeks(range!.end, range!.start, { weekStartsOn: 0 }) + 1).toBe(53);
  });
});

describe('getWeekPassageKeys', () => {
  it('collects date-scoped keys for valid passages only', () => {
    const readings = [
      day('2026-01-01', ['Genesis 1', 'Genesis 2']),
      day('2026-01-02', ['Genesis 3']),
    ];
    expect(getWeekPassageKeys(readings)).toEqual([
      makePassageKey('2026-01-01', 'Genesis 1'),
      makePassageKey('2026-01-01', 'Genesis 2'),
      makePassageKey('2026-01-02', 'Genesis 3'),
    ]);
  });

  it('skips error passages', () => {
    const readings: DailyReading[] = [
      {
        date: '2026-01-01',
        passages: [
          { displayText: 'Genesis 1', book: 'Genesis', chapter: 1 },
          { displayText: 'Error: missing', book: '', chapter: 0 },
        ],
      },
    ];
    expect(getWeekPassageKeys(readings)).toEqual([
      makePassageKey('2026-01-01', 'Genesis 1'),
    ]);
  });
});
