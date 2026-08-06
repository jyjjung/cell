import { describe, expect, it } from 'vitest';
import { makePassageKey } from '@/lib/passage-keys';
import type { DailyReading } from '@/types';
import {
  buildFirstOccurrenceMapFromPlan,
  migrateCompletedPassages,
} from '@/lib/bible-checklist-migration';

function day(date: string, displayText: string): DailyReading {
  const [book, chapterText] = displayText.split(' ');
  return {
    date,
    passages: [{
      displayText,
      book,
      chapter: Number(chapterText || 1),
    }],
  };
}

describe('bible checklist migration', () => {
  const plan = [
    day('2026-01-01', 'Matthew 1'),
    day('2026-07-01', 'Matthew 1'),
  ];

  it('maps bare keys to the first plan occurrence', () => {
    const map = buildFirstOccurrenceMapFromPlan(plan);
    const result = migrateCompletedPassages(['Matthew 1', makePassageKey('2026-07-01', 'Matthew 1')], map);

    expect(result.changed).toBe(true);
    expect(result.convertedCount).toBe(1);
    expect(result.migratedPassages).toEqual([
      makePassageKey('2026-01-01', 'Matthew 1'),
      makePassageKey('2026-07-01', 'Matthew 1'),
    ]);
  });

  it('preserves bare keys that do not match the current plan', () => {
    const result = migrateCompletedPassages(['Old Plan Passage'], new Map());

    expect(result.changed).toBe(false);
    expect(result.unmatchedCount).toBe(1);
    expect(result.migratedPassages).toEqual(['Old Plan Passage']);
  });
});
