/** Bible text versions served from bundled XML (not external APIs). */
export type BibleTextVersion = 'krv' | 'esv';

/** Maps to on-disk XML filenames (e.g. engESV.xml). */
export type BibleXmlVersion = 'korRV' | 'engESV';

export const BIBLE_VERSION_STORAGE_KEY = 'bibleTextVersion';

export const BIBLE_VERSION_LABELS: Record<BibleTextVersion, string> = {
  krv: 'KRV',
  esv: 'ESV',
};

export const DEFAULT_BIBLE_TEXT_VERSION: BibleTextVersion = 'krv';

export function isBibleTextVersion(value: string | null | undefined): value is BibleTextVersion {
  return value === 'krv' || value === 'esv';
}

export function normalizeBibleVersion(input: string | null | undefined): BibleTextVersion {
  if (input === 'esv' || input === 'eng' || input === 'engESV') return 'esv';
  if (input === 'krv' || input === 'korRV') return 'krv';
  return DEFAULT_BIBLE_TEXT_VERSION;
}

export function readStoredBibleVersion(): BibleTextVersion {
  if (typeof window === 'undefined') return DEFAULT_BIBLE_TEXT_VERSION;
  try {
    const stored = localStorage.getItem(BIBLE_VERSION_STORAGE_KEY);
    return normalizeBibleVersion(stored);
  } catch {
    return DEFAULT_BIBLE_TEXT_VERSION;
  }
}

export function writeStoredBibleVersion(version: BibleTextVersion): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BIBLE_VERSION_STORAGE_KEY, version);
  } catch {
    /* best-effort */
  }
}

export function toXmlVersion(version: BibleTextVersion): BibleXmlVersion {
  return version === 'esv' ? 'engESV' : 'korRV';
}

export function bibleVersionLabel(version: BibleTextVersion): string {
  return BIBLE_VERSION_LABELS[version];
}
