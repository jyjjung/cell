import type { DailyReading, StructuredPassage } from '@/types';
import { isValid, isSameDay, startOfDay } from 'date-fns';
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
  completedPassages: string[]
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
    // A reading is "unread" if not all its passages are in completedPassages
    // Ensure reading.passages is an array and has items before checking every()
    const validPassages = reading.passages?.filter(p => p && p.displayText && typeof p.displayText === 'string' && !p.displayText.startsWith("Error:")) || [];

    if (validPassages.length === 0) { // If a day has no valid passages, it's effectively "read" or skipped.
        continue;
    }
    const isFullyCompleted = validPassages.every(p => completedPassages.includes(p.displayText));
    
    if (!isFullyCompleted) {
      return reading; // This is the first reading (chronologically) that is not fully completed
    }
  }
  return null; // All readings are completed
}
