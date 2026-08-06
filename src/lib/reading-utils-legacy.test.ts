import { describe, expect, it } from 'vitest';
import { makePassageKey } from '@/lib/passage-keys';
import type { DailyReading } from '@/types';
import {
  countPlanPassageProgress,
  findEarliestIncompletePlanPassageKeyForChapter,
  getChapterPlanAssignmentStatus,
  isPassageCompletedForPlan,
} from '@/lib/reading-utils';

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

describe('legacy reading progress keys', () => {
  const repeatedPlan = [
    day('2026-01-01', 'Matthew 1'),
    day('2026-07-01', 'Matthew 1'),
  ];

  it('counts a legacy bare key only toward the first plan occurrence', () => {
    const completed = ['Matthew 1'];

    expect(
      isPassageCompletedForPlan('2026-01-01', 'Matthew 1', completed, {
        firstOccurrenceByDisplayText: new Map([['Matthew 1', '2026-01-01']]),
      }),
    ).toBe(true);
    expect(
      isPassageCompletedForPlan('2026-07-01', 'Matthew 1', completed, {
        firstOccurrenceByDisplayText: new Map([['Matthew 1', '2026-01-01']]),
      }),
    ).toBe(false);
  });

  it('restores visible plan progress from legacy bare keys until migration runs', () => {
    const { completed, total } = countPlanPassageProgress(repeatedPlan, ['Matthew 1']);
    expect(total).toBe(2);
    expect(completed).toBe(1);
  });

  it('finds the earliest incomplete assignment for popup chapter marking', () => {
    const completed = [makePassageKey('2026-01-01', 'Matthew 1')];
    expect(
      findEarliestIncompletePlanPassageKeyForChapter(
        repeatedPlan,
        'Matthew',
        1,
        completed,
      ),
    ).toBe(makePassageKey('2026-07-01', 'Matthew 1'));
  });

  it('reports partial chapter completion for repeated assignments', () => {
    const status = getChapterPlanAssignmentStatus(
      repeatedPlan,
      'Matthew',
      1,
      ['Matthew 1'],
    );
    expect(status.total).toBe(2);
    expect(status.completedCount).toBe(1);
    expect(status.partialComplete).toBe(true);
  });
});
