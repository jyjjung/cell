
import { format as formatDateFns, addDays, getDay, startOfDay } from 'date-fns';
import type { DailyReading } from '@/types';
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER, PRESET_CUSTOM_ORDER_STRINGS, BOOK_NAME_LOOKUP_MAP } from './bible-data';

export interface ReadingUnit {
  book: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number | 'end'; // 'end' signifies to the end of the chapter
  displayText: string; // e.g., "Genesis 1", "Acts 18:1-11"
}

function resolveBookName(name: string): string | null {
  const cleanedName = name.trim().toLowerCase().replace(/\.$/, ''); // Remove trailing period if any
  return BOOK_NAME_LOOKUP_MAP.get(cleanedName) || null;
}

export function parsePassageString(entry: string): ReadingUnit[] {
  const units: ReadingUnit[] = [];
  const originalEntry = entry;

  // Attempt to extract book name first
  let bookNamePart = "";
  let remainingSpec = "";
  let resolvedBookFullName: string | null = null;

  // Iterate from longest possible book name part to shortest
  for (let i = Math.min(entry.length, 30); i > 0; i--) {
      const potentialBook = entry.substring(0, i).trim();
      const foundBook = resolveBookName(potentialBook);
      if (foundBook) {
          resolvedBookFullName = foundBook;
          bookNamePart = potentialBook;
          remainingSpec = entry.substring(i).trim();
          break;
      }
  }
  
  if (!resolvedBookFullName) {
    console.warn(`Could not parse book name from entry: "${originalEntry}"`);
    return units;
  }

  const bookData = BIBLE_BOOKS_DATA[resolvedBookFullName];
  if (!bookData) { // Should be caught by resolveBookName
    console.warn(`Book data not found for: "${resolvedBookFullName}"`);
    return units;
  }

  // Case 1: Whole book (no chapter/verse spec)
  if (remainingSpec === "") {
    for (let ch = 1; ch <= bookData.chapters; ch++) {
      units.push({ book: resolvedBookFullName, chapter: ch, displayText: `${resolvedBookFullName} ${ch}` });
    }
    return units;
  }

  // Try to match complex patterns first
  // Pattern: C1(:Vstart)-C2(:Vend)  e.g., Acts 18(:12)-19(:20)
  const complexRangeMatch = remainingSpec.match(/^(\d+)\s*\(:(\d+)\)\s*-\s*(\d+)\s*\(:(\d+)\)$/);
  if (complexRangeMatch) {
    const startCh = parseInt(complexRangeMatch[1], 10);
    const startV = parseInt(complexRangeMatch[2], 10);
    const endCh = parseInt(complexRangeMatch[3], 10);
    const endV = parseInt(complexRangeMatch[4], 10);

    // First part: StartCh:StartV - end of chapter
    units.push({ book: resolvedBookFullName, chapter: startCh, startVerse: startV, endVerse: 'end', displayText: `${resolvedBookFullName} ${startCh}:${startV}-end` });
    // Intermediate full chapters
    for (let ch = startCh + 1; ch < endCh; ch++) {
      if (ch <= bookData.chapters) { // Ensure chapter exists
        units.push({ book: resolvedBookFullName, chapter: ch, displayText: `${resolvedBookFullName} ${ch}` });
      }
    }
    // Last part: EndCh:1 - EndV (if EndCh is different from StartCh)
    if (endCh > startCh && endCh <= bookData.chapters) {
         units.push({ book: resolvedBookFullName, chapter: endCh, startVerse: 1, endVerse: endV, displayText: `${resolvedBookFullName} ${endCh}:1-${endV}` });
    }
    return units;
  }
  
  // Pattern: C1-C2(:Vend) e.g., Acts 1-18(:11)
  const rangeEndVerseMatch = remainingSpec.match(/^(\d+)\s*-\s*(\d+)\s*\(:(\d+)\)$/);
  if (rangeEndVerseMatch) {
    const startCh = parseInt(rangeEndVerseMatch[1], 10);
    const endCh = parseInt(rangeEndVerseMatch[2], 10);
    const endV = parseInt(rangeEndVerseMatch[3], 10);
    for (let ch = startCh; ch < endCh; ch++) {
       if (ch <= bookData.chapters) {
        units.push({ book: resolvedBookFullName, chapter: ch, displayText: `${resolvedBookFullName} ${ch}` });
      }
    }
    if (endCh <= bookData.chapters) {
      units.push({ book: resolvedBookFullName, chapter: endCh, startVerse: 1, endVerse: endV, displayText: `${resolvedBookFullName} ${endCh}:1-${endV}` });
    }
    return units;
  }

  // Pattern: C1(:Vstart) e.g., Acts 18(:12)
  const chapterStartVerseMatch = remainingSpec.match(/^(\d+)\s*\(:(\d+)\)$/);
  if (chapterStartVerseMatch) {
    const ch = parseInt(chapterStartVerseMatch[1], 10);
    const startV = parseInt(chapterStartVerseMatch[2], 10);
    if (ch <= bookData.chapters) {
      units.push({ book: resolvedBookFullName, chapter: ch, startVerse: startV, endVerse: 'end', displayText: `${resolvedBookFullName} ${ch}:${startV}-end` });
    }
    return units;
  }
  
  // Pattern: C1:Vstart-Vend e.g., Jude 1:1-10
  const chapterVerseRangeMatch = remainingSpec.match(/^(\d+):(\d+)-(\d+)$/);
  if (chapterVerseRangeMatch) {
    const ch = parseInt(chapterVerseRangeMatch[1], 10);
    const startV = parseInt(chapterVerseRangeMatch[2], 10);
    const endV = parseInt(chapterVerseRangeMatch[3], 10);
     if (ch <= bookData.chapters) {
      units.push({ book: resolvedBookFullName, chapter: ch, startVerse: startV, endVerse: endV, displayText: `${resolvedBookFullName} ${ch}:${startV}-${endV}` });
    }
    return units;
  }

  // Pattern: C1-C2 e.g., Exodus 1-10
  const chapterRangeMatch = remainingSpec.match(/^(\d+)-(\d+)$/);
  if (chapterRangeMatch) {
    const startCh = parseInt(chapterRangeMatch[1], 10);
    const endCh = Math.min(parseInt(chapterRangeMatch[2], 10), bookData.chapters); // Cap at actual chapters
    for (let ch = startCh; ch <= endCh; ch++) {
       if (ch > 0) { // Ensure valid chapter num
        units.push({ book: resolvedBookFullName, chapter: ch, displayText: `${resolvedBookFullName} ${ch}` });
      }
    }
    return units;
  }

  // Pattern: C (single chapter) e.g., 2 Kings 14
  const singleChapterMatch = remainingSpec.match(/^(\d+)$/);
  if (singleChapterMatch) {
    const ch = parseInt(singleChapterMatch[1], 10);
    if (ch > 0 && ch <= bookData.chapters) {
         units.push({ book: resolvedBookFullName, chapter: ch, displayText: `${resolvedBookFullName} ${ch}` });
    }
    return units;
  }
  
  console.warn(`Unhandled passage format for entry: "${originalEntry}" (Book: ${resolvedBookFullName}, Spec: "${remainingSpec}")`);
  return units;
}


export function generateReadingUnitsForCanonical(startBookName: string): ReadingUnit[] {
  const units: ReadingUnit[] = [];
  const startIndex = CANONICAL_BIBLE_ORDER.indexOf(startBookName);
  if (startIndex === -1) {
    console.error(`Invalid starting book for canonical plan: ${startBookName}`);
    return units; // Or throw error
  }

  for (let i = startIndex; i < CANONICAL_BIBLE_ORDER.length; i++) {
    const bookFullName = CANONICAL_BIBLE_ORDER[i];
    const bookData = BIBLE_BOOKS_DATA[bookFullName];
    for (let ch = 1; ch <= bookData.chapters; ch++) {
      units.push({ book: bookFullName, chapter: ch, displayText: `${bookFullName} ${ch}` });
    }
  }
  return units;
}

export function generateReadingUnitsForCustomPreset(): ReadingUnit[] {
  const allUnits: ReadingUnit[] = [];
  PRESET_CUSTOM_ORDER_STRINGS.forEach(entry => {
    const unitsForEntry = parsePassageString(entry);
    allUnits.push(...unitsForEntry);
  });
  return allUnits;
}

export function scheduleReadings(units: ReadingUnit[], startDateInput: Date, readingsPerDay: number): DailyReading[] {
  const plan: DailyReading[] = [];
  if (units.length === 0) return plan;

  let currentDate = startOfDay(startDateInput);
  let unitIndex = 0;

  while (unitIndex < units.length) {
    // Skip Sundays (0 = Sunday for getDay())
    if (getDay(currentDate) === 0) { 
      currentDate = addDays(currentDate, 1);
      continue;
    }

    const dailyPassages: string[] = [];
    for (let i = 0; i < readingsPerDay && unitIndex < units.length; i++) {
      dailyPassages.push(units[unitIndex].displayText);
      unitIndex++;
    }

    if (dailyPassages.length > 0) {
      plan.push({
        date: formatDateFns(currentDate, 'yyyy-MM-dd'),
        passages: dailyPassages,
      });
    }
    currentDate = addDays(currentDate, 1);
  }
  return plan;
}
