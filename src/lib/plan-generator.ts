
import { format as formatDateFns, addDays, getDay, startOfDay } from 'date-fns';
import type { DailyReading, StructuredPassage } from '@/types';
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER, PRESET_CUSTOM_ORDER_STRINGS, BOOK_NAME_LOOKUP_MAP } from './bible-data';

// ReadingUnit now directly matches StructuredPassage for internal consistency
export type ReadingUnit = StructuredPassage;

function resolveBookName(name: string): string | null {
  const cleanedName = name.trim().toLowerCase().replace(/\.$/, ''); // Remove trailing period if any
  return BOOK_NAME_LOOKUP_MAP.get(cleanedName) || null;
}

export function parsePassageString(entry: string): ReadingUnit[] {
  const units: ReadingUnit[] = [];
  const originalEntry = entry;

  let bookNamePart = "";
  let remainingSpec = "";
  let resolvedBookFullName: string | null = null;

  // Try to match longest possible book name first
  for (let i = Math.min(entry.length, 30); i > 0; i--) {
      const potentialBook = entry.substring(0, i).trim();
      const foundBook = resolveBookName(potentialBook);
      if (foundBook) {
          resolvedBookFullName = foundBook;
          bookNamePart = potentialBook; // Not used further, but good for debugging
          remainingSpec = entry.substring(i).trim();
          break;
      }
  }
  
  if (!resolvedBookFullName) {
    console.warn(`[parsePassageString] Could not parse book name from entry: "${originalEntry}"`);
    return units;
  }

  const bookData = BIBLE_BOOKS_DATA[resolvedBookFullName];
  if (!bookData) {
    console.warn(`[parsePassageString] Book data not found for: "${resolvedBookFullName}" from entry "${originalEntry}"`);
    return units;
  }

  // Case 1: Whole book (no chapter/verse spec)
  if (remainingSpec === "") {
    for (let ch = 1; ch <= bookData.chapters; ch++) {
      units.push({ book: resolvedBookFullName, chapter: ch, displayText: `${resolvedBookFullName} ${ch}` });
    }
    return units;
  }

  // Pattern: C1(:Vstart)-C2(:Vend) e.g., Acts 18(:12)-19(:20)
  const complexRangeMatch = remainingSpec.match(/^(\d+)\s*\(:(\d+)\)\s*-\s*(\d+)\s*\(:(\d+)\)$/);
  if (complexRangeMatch) {
    const startCh = parseInt(complexRangeMatch[1], 10);
    const startV = parseInt(complexRangeMatch[2], 10);
    const endCh = parseInt(complexRangeMatch[3], 10);
    const endV = parseInt(complexRangeMatch[4], 10);

    if (startCh > 0 && startCh <= bookData.chapters) {
      units.push({ book: resolvedBookFullName, chapter: startCh, startVerse: startV, endVerse: 'end', displayText: `${resolvedBookFullName} ${startCh}:${startV}-end` });
    }
    for (let ch = startCh + 1; ch < endCh; ch++) {
      if (ch > 0 && ch <= bookData.chapters) {
        units.push({ book: resolvedBookFullName, chapter: ch, displayText: `${resolvedBookFullName} ${ch}` });
      }
    }
    // Ensure endCh is different from startCh if we are adding a new segment for endCh
    // and that endCh is valid
    if (endCh > startCh && endCh > 0 && endCh <= bookData.chapters) {
         units.push({ book: resolvedBookFullName, chapter: endCh, startVerse: 1, endVerse: endV, displayText: `${resolvedBookFullName} ${endCh}:1-${endV}` });
    } else if (startCh === endCh && startV < endV && startCh > 0 && startCh <= bookData.chapters) { 
        // If complex range is within the same chapter, e.g. "Book 1(:5)-1(:10)"
        // The first push already handled "Book 1:5-end". This might need refinement
        // if such specific same-chapter complex ranges are common.
        // For now, we assume such cases would use a simpler C:Vstart-Vend format.
        // The current logic might result in "Book 1:5-end" and then try to add "Book 1:1-10",
        // which is redundant if the intent was just Book 1:5-10.
        // This specific case "Book 1(:5)-1(:10)" is not directly handled by this pattern optimally.
        // It would be better parsed by a "Book C:V1-V2" pattern.
        // However, given the current parsing, "Acts 18(:12)-19(:20)" is the primary target.
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
       if (ch > 0 && ch <= bookData.chapters) {
        units.push({ book: resolvedBookFullName, chapter: ch, displayText: `${resolvedBookFullName} ${ch}` });
      }
    }
    if (endCh > 0 && endCh <= bookData.chapters) {
      units.push({ book: resolvedBookFullName, chapter: endCh, startVerse: 1, endVerse: endV, displayText: `${resolvedBookFullName} ${endCh}:1-${endV}` });
    }
    return units;
  }

  // Pattern: C1(:Vstart) e.g., Acts 18(:12) or John 3(:16) -> John 3:16-end
  const chapterStartVerseMatch = remainingSpec.match(/^(\d+)\s*\(:(\d+)\)$/);
  if (chapterStartVerseMatch) {
    const ch = parseInt(chapterStartVerseMatch[1], 10);
    const startV = parseInt(chapterStartVerseMatch[2], 10);
    if (ch > 0 && ch <= bookData.chapters && startV > 0) {
      units.push({ book: resolvedBookFullName, chapter: ch, startVerse: startV, endVerse: 'end', displayText: `${resolvedBookFullName} ${ch}:${startV}-end` });
    }
    return units;
  }
  
  // NEW Pattern: C1:Vstart-end e.g., Acts 18:12-end
  const chapterStartVerseToEndMatch = remainingSpec.match(/^(\d+):(\d+)-end$/i); // Added /i for case-insensitive "end"
  if (chapterStartVerseToEndMatch) {
    const ch = parseInt(chapterStartVerseToEndMatch[1], 10);
    const startV = parseInt(chapterStartVerseToEndMatch[2], 10);
    if (ch > 0 && ch <= bookData.chapters && startV > 0) {
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
     if (ch > 0 && ch <= bookData.chapters && startV > 0 && endV >= startV) {
      units.push({ book: resolvedBookFullName, chapter: ch, startVerse: startV, endVerse: endV, displayText: `${resolvedBookFullName} ${ch}:${startV}-${endV}` });
    }
    return units;
  }

  // Pattern: C1-C2 e.g., Exodus 1-10
  const chapterRangeMatch = remainingSpec.match(/^(\d+)-(\d+)$/);
  if (chapterRangeMatch) {
    const startCh = parseInt(chapterRangeMatch[1], 10);
    const endCh = Math.min(parseInt(chapterRangeMatch[2], 10), bookData.chapters);
    for (let ch = startCh; ch <= endCh; ch++) {
       if (ch > 0) { // Ensure chapter is positive
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
  
  console.warn(`[parsePassageString] Unhandled passage format for entry: "${originalEntry}" (Book: ${resolvedBookFullName}, Spec: "${remainingSpec}")`);
  return units; // Return empty if no pattern matches, to be handled by caller
}


export function generateReadingUnitsForCanonical(startBookName: string): ReadingUnit[] {
  const units: ReadingUnit[] = [];
  const startIndex = CANONICAL_BIBLE_ORDER.indexOf(startBookName);
  if (startIndex === -1) {
    console.error(`[plan-generator] Invalid starting book for canonical plan: ${startBookName}`);
    return units; 
  }

  for (let i = startIndex; i < CANONICAL_BIBLE_ORDER.length; i++) {
    const bookFullName = CANONICAL_BIBLE_ORDER[i];
    const bookData = BIBLE_BOOKS_DATA[bookFullName];
    if (!bookData) {
        console.error(`[plan-generator] Missing book data for ${bookFullName} in CANONICAL_BIBLE_ORDER`);
        continue;
    }
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
    if (unitsForEntry.length === 0) {
        console.warn(`[plan-generator] No units generated for custom preset entry: "${entry}"`);
    }
    allUnits.push(...unitsForEntry);
  });
  return allUnits;
}

export function scheduleReadings(units: ReadingUnit[], startDateInput: Date, readingsPerDay: number): DailyReading[] {
  const plan: DailyReading[] = [];
  if (units.length === 0) return plan;

  let currentDate = startOfDay(startDateInput); // Ensure we start at the beginning of the day
  let unitIndex = 0;

  while (unitIndex < units.length) {
    // Skip Sundays (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    if (getDay(currentDate) === 0) { 
      currentDate = addDays(currentDate, 1);
      continue;
    }

    const dailyPassagesUnits: StructuredPassage[] = [];
    for (let i = 0; i < readingsPerDay && unitIndex < units.length; i++) {
      // Ensure the unit itself is valid before pushing
      const currentUnit = units[unitIndex];
      if (currentUnit && currentUnit.book && currentUnit.chapter > 0 && currentUnit.displayText) {
        dailyPassagesUnits.push(currentUnit);
      } else {
        console.warn(`[plan-generator] Skipping invalid reading unit during scheduling:`, currentUnit);
      }
      unitIndex++;
    }

    if (dailyPassagesUnits.length > 0) {
      plan.push({
        // Store date as YYYY-MM-DD string, consistent with Firestore and date-fns usage
        date: formatDateFns(currentDate, 'yyyy-MM-dd'), 
        passages: dailyPassagesUnits,
      });
    }
    currentDate = addDays(currentDate, 1);
  }
  return plan;
}
