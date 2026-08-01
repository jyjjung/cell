import { describe, expect, it } from 'vitest';
import {
  calculatePlanProgressToDatePercent,
  countPlanPassagesDueThrough,
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
