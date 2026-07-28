import type { FontFamilyChoice } from './font-catalog';
import { getFontFamilyStack, normalizeFontFamilyChoice } from './font-catalog';

export { FONT_FAMILY_GROUPS } from './font-catalog';
export type { FontFamilyChoice } from './font-catalog';

export type FontSizeChoice = 'sm' | 'md' | 'lg' | 'xl';

export type TypographyPreferences = {
  appFontFamily: FontFamilyChoice;
  appFontSize: FontSizeChoice;
  bibleFontFamily: FontFamilyChoice;
  bibleFontSize: FontSizeChoice;
};

export const DEFAULT_TYPOGRAPHY: TypographyPreferences = {
  appFontFamily: 'geist-sans',
  appFontSize: 'md',
  bibleFontFamily: 'literata',
  bibleFontSize: 'md',
};

export const TYPOGRAPHY_STORAGE_KEY = 'typographyPreferences';

export const FONT_SIZE_OPTIONS: { id: FontSizeChoice; label: string }[] = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
  { id: 'xl', label: 'XL' },
];

const APP_FONT_SCALES: Record<FontSizeChoice, string> = {
  sm: '0.9',
  md: '1',
  lg: '1.1',
  xl: '1.2',
};

const BIBLE_FONT_SIZES: Record<FontSizeChoice, string> = {
  sm: '0.95rem',
  md: '1.06rem',
  lg: '1.18rem',
  xl: '1.32rem',
};

const DEFAULT_LINE_HEIGHT = '1.5';
const DEFAULT_LETTER_SPACING = '0';
const DEFAULT_DENSITY_GAP = '1';
const DEFAULT_BIBLE_LINE_HEIGHT = '1.85';
const DEFAULT_BIBLE_LETTER_SPACING = '0.01em';

function isFontSizeChoice(value: string | undefined | null): value is FontSizeChoice {
  return value === 'sm' || value === 'md' || value === 'lg' || value === 'xl';
}

export function parseTypographyPreferences(raw: unknown): TypographyPreferences {
  if (!raw || typeof raw !== 'object') return DEFAULT_TYPOGRAPHY;
  const value = raw as Partial<TypographyPreferences> & {
    appFontFamily?: string;
    bibleFontFamily?: string;
  };

  return {
    appFontFamily: normalizeFontFamilyChoice(value.appFontFamily),
    appFontSize: isFontSizeChoice(value.appFontSize) ? value.appFontSize : DEFAULT_TYPOGRAPHY.appFontSize,
    // Bible reading always uses Literata.
    bibleFontFamily: 'literata',
    bibleFontSize: isFontSizeChoice(value.bibleFontSize) ? value.bibleFontSize : DEFAULT_TYPOGRAPHY.bibleFontSize,
  };
}

export function applyTypographyPreferences(preferences: TypographyPreferences) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  root.style.setProperty('--app-font-family', getFontFamilyStack(preferences.appFontFamily));
  root.style.setProperty('--app-font-size-scale', APP_FONT_SCALES[preferences.appFontSize]);
  root.style.setProperty('--app-line-height', DEFAULT_LINE_HEIGHT);
  root.style.setProperty('--app-letter-spacing', DEFAULT_LETTER_SPACING);
  root.style.setProperty('--app-density-gap', DEFAULT_DENSITY_GAP);

  root.style.setProperty('--bible-font-family', getFontFamilyStack(preferences.bibleFontFamily));
  root.style.setProperty('--bible-font-size', BIBLE_FONT_SIZES[preferences.bibleFontSize]);
  root.style.setProperty('--bible-line-height', DEFAULT_BIBLE_LINE_HEIGHT);
  root.style.setProperty('--bible-letter-spacing', DEFAULT_BIBLE_LETTER_SPACING);

  root.dataset.appFont = preferences.appFontFamily;
  root.dataset.bibleFont = preferences.bibleFontFamily;
  root.dataset.appFontSize = preferences.appFontSize;
}
