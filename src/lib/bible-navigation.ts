
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER } from './bible-data';

export interface ParsedPassage {
  book: string;
  chapter: number;
  // Verses are not strictly needed for chapter navigation but can be parsed if present
}

export function parsePassageReferenceForNavigation(passageRef: string): ParsedPassage | null {
  if (!passageRef) return null;

  // Regex to capture "BookName Chapter" from various formats like "Book Name Chapter:Verse-Verse" or "Book Name Chapter"
  // It tries to find the longest book name match first.
  let bestMatch: { book: string; chapter: number } | null = null;

  for (const bookName of CANONICAL_BIBLE_ORDER) {
    const bookMeta = BIBLE_BOOKS_DATA[bookName];
    if (!bookMeta) continue;

    const possibleNames = [bookName, ...(bookMeta.shortNames || [])];
    for (const nameToTest of possibleNames) {
      const regex = new RegExp(`^${nameToTest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)([:.\\s(].*)?$`, 'i');
      const match = passageRef.match(regex);
      if (match && match[1]) {
        const chapter = parseInt(match[1], 10);
        if (chapter > 0 && chapter <= bookMeta.chapters) {
          // Prioritize longer book name matches if abbreviations overlap
          if (!bestMatch || nameToTest.length > bestMatch.book.length) {
            bestMatch = { book: bookName, chapter };
          }
        }
      }
    }
  }
  
  // Fallback for simple regex if canonical order loop fails for complex names
  // This is similar to the API route's regex but we need the canonical book name.
  if (!bestMatch) {
    const BOOK_CHAPTER_REGEX = /^([1-3]?\s?[A-Za-z\s]+?)\s*(\d+)([:.\s(].*)?$/;
    const match = passageRef.match(BOOK_CHAPTER_REGEX);
    if (match && match[1] && match[2]) {
        const bookNamePart = match[1].trim();
        const chapter = parseInt(match[2], 10);
        
        // Resolve bookNamePart to canonical name
        let canonicalBookName: string | null = null;
        for (const book of CANONICAL_BIBLE_ORDER) {
            const bookMeta = BIBLE_BOOKS_DATA[book];
            const namesToTest = [book, ...(bookMeta?.shortNames || [])].map(n => n.toLowerCase());
            if (namesToTest.includes(bookNamePart.toLowerCase())) {
                canonicalBookName = book;
                break;
            }
        }

        if (canonicalBookName) {
            const bookMeta = BIBLE_BOOKS_DATA[canonicalBookName];
            if (bookMeta && chapter > 0 && chapter <= bookMeta.chapters) {
                bestMatch = { book: canonicalBookName, chapter };
            }
        }
    }
  }


  return bestMatch;
}

export function getPreviousChapterRef(currentBook: string, currentChapter: number): string | null {
  const bookIndex = CANONICAL_BIBLE_ORDER.indexOf(currentBook);
  if (bookIndex === -1) return null; // Should not happen if currentBook is valid

  if (currentChapter > 1) {
    return `${currentBook} ${currentChapter - 1}`;
  } else { // currentChapter is 1
    if (bookIndex > 0) {
      const prevBookName = CANONICAL_BIBLE_ORDER[bookIndex - 1];
      const prevBookMeta = BIBLE_BOOKS_DATA[prevBookName];
      if (!prevBookMeta) return null;
      return `${prevBookName} ${prevBookMeta.chapters}`; // Last chapter of previous book
    } else {
      return null; // Already at the first chapter of the first book
    }
  }
}

export function getNextChapterRef(currentBook: string, currentChapter: number): string | null {
  const bookMeta = BIBLE_BOOKS_DATA[currentBook];
  if (!bookMeta) return null;

  const bookIndex = CANONICAL_BIBLE_ORDER.indexOf(currentBook);
  if (bookIndex === -1) return null;

  if (currentChapter < bookMeta.chapters) {
    return `${currentBook} ${currentChapter + 1}`;
  } else { // currentChapter is the last chapter of the current book
    if (bookIndex < CANONICAL_BIBLE_ORDER.length - 1) {
      const nextBookName = CANONICAL_BIBLE_ORDER[bookIndex + 1];
      return `${nextBookName} 1`; // First chapter of the next book
    } else {
      return null; // Already at the last chapter of the last book
    }
  }
}
