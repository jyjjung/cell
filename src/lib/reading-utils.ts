import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import {
    makeManualPassageKey,
    makePassageKey
} from '@/lib/passage-keys';
import type { DailyReading, StructuredPassage } from '@/types';
import { differenceInCalendarDays, isBefore, isSameDay, isValid, startOfDay } from 'date-fns';
import { parseDay } from './event-occurrences';

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
    const firstOccurrenceByDisplayText = buildFirstOccurrenceByDisplayText(dailyReadings);
    const isFullyCompleted = validPassages.every((p) =>
      isPassageCompletedForPlan(reading.date, p.displayText, completedPassages, {
        firstOccurrenceByDisplayText,
      }),
    );
    
    if (!isFullyCompleted) {
      return reading; // This is the first reading (chronologically) that is not fully completed
    }
  }
  return null; // All readings are completed
}

type PassageCompletionOptions = {
  /** When set, legacy bare keys only count toward the first plan occurrence. */
  firstOccurrenceByDisplayText?: Map<string, string>;
  dailyReadings?: DailyReading[] | null;
};

/** Earliest plan date for each passage displayText (M'Cheyne repeats). */
export function buildFirstOccurrenceByDisplayText(
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

function resolveFirstOccurrenceMap(
  options?: PassageCompletionOptions,
): Map<string, string> | undefined {
  if (options?.firstOccurrenceByDisplayText) return options.firstOccurrenceByDisplayText;
  if (options?.dailyReadings) return buildFirstOccurrenceByDisplayText(options.dailyReadings);
  return undefined;
}

/**
 * Whether a plan passage is marked complete.
 * Recognizes date-scoped keys, manual marks, and legacy bare keys until migration runs.
 */
export function isPassageCompletedForPlan(
  date: string,
  displayText: string,
  completedPassages: string[],
  options?: PassageCompletionOptions,
): boolean {
  if (!displayText || displayText.startsWith('Error:')) return false;

  const scopedKey = makePassageKey(date, displayText);
  if (completedPassages.includes(scopedKey)) return true;
  if (completedPassages.includes(makeManualPassageKey(displayText))) return true;

  if (!completedPassages.includes(displayText)) return false;

  const firstDate = resolveFirstOccurrenceMap(options)?.get(displayText);
  return firstDate === undefined || firstDate === date;
}

function isCountablePlanPassage(
  passage: StructuredPassage | null | undefined,
): passage is StructuredPassage {
  return !!passage?.displayText && !passage.displayText.startsWith('Error:');
}

/** Normalize plan passage metadata, parsing book/chapter from displayText when missing. */
function resolvePlanPassage(
  passage: StructuredPassage | null | undefined,
): { book: string; chapter: number; displayText: string } | null {
  if (!isCountablePlanPassage(passage)) return null;

  if (passage.book && passage.chapter) {
    return {
      book: passage.book,
      chapter: passage.chapter,
      displayText: passage.displayText,
    };
  }

  const parsed = parsePassageReferenceForNavigation(passage.displayText);
  if (!parsed) return null;

  return {
    book: parsed.book,
    chapter: parsed.chapter,
    displayText: passage.displayText,
  };
}

export type PlanPassageProgress = {
  total: number;
  completed: number;
  passagesLeft: number;
};

/** Date-scoped keys for every valid passage in a week detail view. */
export function getWeekPassageKeys(readings: DailyReading[]): string[] {
  const keys: string[] = [];
  readings.forEach((day) => {
    day.passages?.forEach((passage) => {
      if (!isCountablePlanPassage(passage)) return;
      keys.push(makePassageKey(day.date, passage.displayText));
    });
  });
  return keys;
}

/** Count plan passage slots using the same completion rules as the checklist. */
export function countPlanPassageProgress(
  dailyReadings: DailyReading[] | undefined | null,
  completedPassages: string[],
): PlanPassageProgress {
  if (!dailyReadings?.length) {
    return { total: 0, completed: 0, passagesLeft: 0 };
  }

  let total = 0;
  let completed = 0;
  const firstOccurrenceByDisplayText = buildFirstOccurrenceByDisplayText(dailyReadings);

  dailyReadings.forEach((day) => {
    day.passages?.forEach((passage) => {
      if (!isCountablePlanPassage(passage)) return;
      total += 1;
      if (
        isPassageCompletedForPlan(day.date, passage.displayText, completedPassages, {
          firstOccurrenceByDisplayText,
        })
      ) {
        completed += 1;
      }
    });
  });

  return { total, completed, passagesLeft: Math.max(0, total - completed) };
}

/** Share of all plan passages marked complete (0–100, rounded). */
export function calculatePlanProgressPercent(
  dailyReadings: DailyReading[] | undefined | null,
  completedPassages: string[],
): number {
  const { total, completed } = countPlanPassageProgress(dailyReadings, completedPassages);
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Count valid plan passages scheduled through `asOf` (inclusive).
 * Same denominator the leaderboard uses for “progress so far.”
 */
export function countPlanPassagesDueThrough(
  dailyReadings: DailyReading[] | undefined | null,
  asOf: Date = startOfDay(new Date()),
): number {
  if (!dailyReadings?.length) return 0;

  const day = startOfDay(asOf);
  let total = 0;

  for (const reading of dailyReadings) {
    const date = parseDay(reading.date);
    if (!isValid(date) || !(isBefore(date, day) || isSameDay(date, day))) continue;
    for (const passage of reading.passages ?? []) {
      if (!isCountablePlanPassage(passage)) continue;
      total += 1;
    }
  }

  return total;
}

/**
 * Completed passages vs passages due through `asOf` (leaderboard-style %).
 * Can exceed 100 when the reader is ahead of schedule.
 */
export function calculatePlanProgressToDatePercent(
  dailyReadings: DailyReading[] | undefined | null,
  completedPassages: string[],
  asOf: Date = startOfDay(new Date()),
): number {
  const due = countPlanPassagesDueThrough(dailyReadings, asOf);
  if (due === 0) return 0;
  const { completed } = countPlanPassageProgress(dailyReadings, completedPassages);
  return parseFloat(((completed / due) * 100).toFixed(1));
}

type ChapterPlanMatch = {
  key: string;
  date: string;
  displayText: string;
};

export type ChapterPlanAssignment = ChapterPlanMatch & {
  completed: boolean;
};

export type ChapterPlanAssignmentStatus = {
  assignments: ChapterPlanAssignment[];
  total: number;
  completedCount: number;
  allComplete: boolean;
  partialComplete: boolean;
  hasMultipleAssignments: boolean;
};

/** Every plan assignment for a given chapter, in plan order, with completion state. */
export function getChapterPlanAssignmentStatus(
  dailyReadings: DailyReading[] | undefined | null,
  book: string,
  chapter: number,
  completedPassages: string[],
): ChapterPlanAssignmentStatus {
  if (!dailyReadings?.length) {
    return {
      assignments: [],
      total: 0,
      completedCount: 0,
      allComplete: false,
      partialComplete: false,
      hasMultipleAssignments: false,
    };
  }

  const assignments: ChapterPlanAssignment[] = [];
  const firstOccurrenceByDisplayText = buildFirstOccurrenceByDisplayText(dailyReadings);

  for (const day of dailyReadings) {
    for (const passage of day.passages ?? []) {
      const resolved = resolvePlanPassage(passage);
      if (!resolved || resolved.book !== book || resolved.chapter !== chapter) continue;

      const key = makePassageKey(day.date, resolved.displayText);
      assignments.push({
        key,
        date: day.date,
        displayText: resolved.displayText,
        completed: isPassageCompletedForPlan(day.date, resolved.displayText, completedPassages, {
          firstOccurrenceByDisplayText,
        }),
      });
    }
  }

  const total = assignments.length;
  const completedCount = assignments.filter((assignment) => assignment.completed).length;

  return {
    assignments,
    total,
    completedCount,
    allComplete: total > 0 && completedCount === total,
    partialComplete: completedCount > 0 && completedCount < total,
    hasMultipleAssignments: total > 1,
  };
}

export function isChapterMarkedCompleteInPlan(
  dailyReadings: DailyReading[] | undefined | null,
  book: string,
  chapter: number,
  completedPassages: string[],
): boolean {
  const status = getChapterPlanAssignmentStatus(dailyReadings, book, chapter, completedPassages);
  if (status.total === 0) {
    const chapterRef = `${book} ${chapter}`;
    return (
      completedPassages.includes(makeManualPassageKey(chapterRef)) ||
      completedPassages.includes(chapterRef)
    );
  }
  return status.allComplete;
}

/** First incomplete plan slot for a chapter (popup marks one assignment at a time). */
export function findEarliestIncompletePlanPassageKeyForChapter(
  dailyReadings: DailyReading[] | undefined | null,
  book: string,
  chapter: number,
  completedPassages: string[],
): string | null {
  if (!dailyReadings?.length) return null;

  const firstOccurrenceByDisplayText = buildFirstOccurrenceByDisplayText(dailyReadings);

  for (const day of dailyReadings) {
    for (const passage of day.passages ?? []) {
      const resolved = resolvePlanPassage(passage);
      if (!resolved || resolved.book !== book || resolved.chapter !== chapter) continue;

      const key = makePassageKey(day.date, resolved.displayText);
      if (
        !isPassageCompletedForPlan(day.date, resolved.displayText, completedPassages, {
          firstOccurrenceByDisplayText,
        })
      ) {
        return key;
      }
    }
  }

  return null;
}

export type PlanPaceStats = {
  passagesLeft: number;
  daysLeft: number;
  passagesPerDay: number;
  passagesToCatchUp: number;
  catchUpPace: number;
};

const EMPTY_PLAN_PACE_STATS: PlanPaceStats = {
  passagesLeft: 0,
  daysLeft: 0,
  passagesPerDay: 0,
  passagesToCatchUp: 0,
  catchUpPace: 0,
};

/** Pace metrics based on remaining plan passage slots (aligned with overall progress). */
export function calculatePlanPaceStats(
  dailyReadings: DailyReading[] | undefined | null,
  completedPassages: string[],
  today: Date = startOfDay(new Date()),
): PlanPaceStats {
  if (!dailyReadings?.length) return EMPTY_PLAN_PACE_STATS;

  const readingDays = dailyReadings
    .map((day) => ({ day, date: parseDay(day.date) }))
    .filter((x) => isValid(x.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const lastReadingDate = readingDays[readingDays.length - 1]?.date;
  if (!lastReadingDate) return EMPTY_PLAN_PACE_STATS;

  const firstOccurrenceByDisplayText = buildFirstOccurrenceByDisplayText(dailyReadings);
  const { passagesLeft } = countPlanPassageProgress(dailyReadings, completedPassages);

  let passagesToCatchUp = 0;
  readingDays.forEach(({ day, date }) => {
    if (!isBefore(date, today)) return;
    day.passages?.forEach((passage) => {
      if (!isCountablePlanPassage(passage)) return;
      const done = isPassageCompletedForPlan(day.date, passage.displayText, completedPassages, {
        firstOccurrenceByDisplayText,
      });
      if (!done) passagesToCatchUp += 1;
    });
  });

  const daysLeft = Math.max(0, differenceInCalendarDays(lastReadingDate, today) + 1);
  const passagesPerDay =
    daysLeft > 0 && passagesLeft > 0
      ? parseFloat((passagesLeft / daysLeft).toFixed(2))
      : 0;
  const catchUpPace =
    daysLeft > 0 && passagesToCatchUp > 0
      ? parseFloat((passagesToCatchUp / daysLeft).toFixed(2))
      : 0;

  return { passagesLeft, daysLeft, passagesPerDay, passagesToCatchUp, catchUpPace };
}
