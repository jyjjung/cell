import type { DailyReading, StructuredPassage } from '@/types';
import { isValid, isSameDay, startOfDay } from 'date-fns';
import { parseDay } from './event-occurrences';
import { makePassageKey } from '@/hooks/use-user-bible-checklist';

export function findTodaysReading(dailyReadings: DailyReading[]): DailyReading | null {
  if (!dailyReadings || dailyReadings.length === 0) return null;
  const today = startOfDay(new Date());
  return dailyReadings.find(reading => {
    try {
      const readingDate = parseDay(reading.date);
      // Ensure the date is valid before comparison
      return isValid(readingDate) && isSameDay(readingDate, today);
    } catch (e) {
      console.error("[reading-utils] Error parsing date for today's reading:", reading.date, e);
      return false;
    }
  }) || null;
}

export function findNextUnreadReading(
  dailyReadings: DailyReading[],
  completedPassages: string[],
  beforeDate?: Date
): DailyReading | null {
  if (!dailyReadings || dailyReadings.length === 0) return null;

  // Sort readings chronologically
  const sortedReadings = [...dailyReadings].sort((a, b) => {
    try {
      const dateA = parseDay(a.date);
      const dateB = parseDay(b.date);
      if (!isValid(dateA) || !isValid(dateB)) return 0; // Handle invalid dates in sort
      return dateA.getTime() - dateB.getTime();
    } catch (e) {
      console.error("[reading-utils] Error sorting readings for next unread:", a.date, b.date, e);
      return 0;
    }
  });

  for (const reading of sortedReadings) {
    // If beforeDate is provided, only consider readings strictly before that date
    if (beforeDate) {
      try {
        const readingDate = parseDay(reading.date);
        if (!isValid(readingDate) || readingDate >= beforeDate) continue;
      } catch (e) {
        continue;
      }
    }

    // A reading is "unread" if not all its passages are in completedPassages
    // Ensure reading.passages is an array and has items before checking every()
    const validPassages = reading.passages?.filter(p => p && p.displayText && typeof p.displayText === 'string' && !p.displayText.startsWith("Error:")) || [];

    if (validPassages.length === 0) { // If a day has no valid passages, it's effectively "read" or skipped.
        continue;
    }
    const isFullyCompleted = validPassages.every(p => 
      completedPassages.includes(makePassageKey(reading.date, p.displayText)) ||
      completedPassages.includes(p.displayText) // legacy fallback for old bare-key entries
    );
    
    if (!isFullyCompleted) {
      return reading; // This is the first reading (chronologically) that is not fully completed
    }
  }
  return null; // All readings are completed
}

/**
 * Whether a plan passage is marked complete.
 * Achievement progress uses date-scoped keys only — legacy bare keys (e.g. "Matthew 1")
 * match every repeat in M'Cheyne and would inflate plan % to 100%.
 */
export function isPassageCompletedForPlan(
  date: string,
  displayText: string,
  completedPassages: string[],
  options?: { allowLegacyBareKey?: boolean },
): boolean {
  if (!displayText || displayText.startsWith('Error:')) return false;

  const scopedKey = makePassageKey(date, displayText);
  if (completedPassages.includes(scopedKey)) return true;

  if (options?.allowLegacyBareKey !== false) {
    return completedPassages.includes(displayText);
  }

  return false;
}

/** Share of all plan passages marked complete (0–100, rounded). */
export function calculatePlanProgressPercent(
  dailyReadings: DailyReading[] | undefined | null,
  completedPassages: string[],
): number {
  if (!dailyReadings?.length) return 0;

  let total = 0;
  let completed = 0;

  dailyReadings.forEach((day) => {
    day.passages?.forEach((passage) => {
      if (!passage.displayText || passage.displayText.startsWith('Error:')) return;
      total += 1;
      if (isPassageCompletedForPlan(day.date, passage.displayText, completedPassages, { allowLegacyBareKey: false })) {
        completed += 1;
      }
    });
  });

  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
