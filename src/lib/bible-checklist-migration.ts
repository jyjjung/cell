import { makePassageKey } from '@/lib/passage-keys';
import type { DailyReading } from '@/types';

export type ChecklistMigrationResult = {
  migratedPassages: string[];
  convertedCount: number;
  unmatchedCount: number;
  changed: boolean;
};

/** Earliest plan date for each passage displayText (M'Cheyne repeats). */
export function buildFirstOccurrenceMapFromPlan(
  dailyReadings: DailyReading[] | undefined | null,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!dailyReadings?.length) return map;

  for (const day of dailyReadings) {
    for (const passage of day.passages ?? []) {
      if (!passage.displayText || map.has(passage.displayText)) continue;
      map.set(passage.displayText, day.date);
    }
  }

  return map;
}

/**
 * Convert legacy bare keys (e.g. "Matthew 1") to date-scoped keys without
 * reducing how many completions are stored.
 */
export function migrateCompletedPassages(
  completedPassages: string[],
  firstOccurrenceMap: Map<string, string>,
): ChecklistMigrationResult {
  const existingKeys = new Set(completedPassages);
  let convertedCount = 0;
  let unmatchedCount = 0;

  const migratedPassages = completedPassages.map((key) => {
    if (key.includes('::')) return key;

    const date = firstOccurrenceMap.get(key);
    if (!date) {
      unmatchedCount += 1;
      return key;
    }

    const scopedKey = makePassageKey(date, key);
    if (existingKeys.has(scopedKey)) {
      unmatchedCount += 1;
      return key;
    }

    existingKeys.add(scopedKey);
    convertedCount += 1;
    return scopedKey;
  });

  if (migratedPassages.length < completedPassages.length) {
    throw new Error('Migration aborted because it would reduce reading progress.');
  }

  const changed = migratedPassages.some((key, index) => key !== completedPassages[index]);

  return {
    migratedPassages,
    convertedCount,
    unmatchedCount,
    changed,
  };
}
