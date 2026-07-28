export type FontFamilyChoice = 'geist-sans' | 'literata' | 'ibm-plex-mono';

export type FontFamilyGroup = {
  label: string;
  fonts: { id: FontFamilyChoice; label: string }[];
};

const FONT_FAMILY_STACKS: Record<FontFamilyChoice, string> = {
  'geist-sans': 'var(--font-geist-sans), system-ui, sans-serif',
  literata: 'var(--font-literata), ui-serif, Georgia, serif',
  'ibm-plex-mono': 'var(--font-ibm-plex-mono), ui-monospace, monospace',
};

/** Kept choices: one sans, one serif, one mono. */
export const FONT_FAMILY_GROUPS: FontFamilyGroup[] = [
  {
    label: 'Style',
    fonts: [
      { id: 'geist-sans', label: 'Sans' },
      { id: 'literata', label: 'Serif' },
      { id: 'ibm-plex-mono', label: 'Mono' },
    ],
  },
];

const SANS_FONTS = new Set([
  'geist-sans',
  'inter',
  'dm-sans',
  'ibm-plex-sans',
  'nunito',
  'system-sans',
  'sans',
]);

const SERIF_FONTS = new Set([
  'literata',
  'lora',
  'merriweather',
  'source-serif',
  'ibm-plex-serif',
  'crimson-pro',
  'playfair',
  'system-serif',
  'serif',
]);

const MONO_FONTS = new Set([
  'ibm-plex-mono',
  'geist-mono',
  'jetbrains-mono',
  'system-mono',
  'mono',
]);

/** Map any legacy/custom font id onto the simplified catalog by group. */
export function normalizeFontFamilyChoice(value: string | undefined | null): FontFamilyChoice {
  if (!value) return 'geist-sans';
  if (value === 'geist-sans' || value === 'literata' || value === 'ibm-plex-mono') {
    return value;
  }
  if (SANS_FONTS.has(value)) return 'geist-sans';
  if (SERIF_FONTS.has(value)) return 'literata';
  if (MONO_FONTS.has(value)) return 'ibm-plex-mono';
  return 'geist-sans';
}

export function getFontFamilyStack(id: FontFamilyChoice): string {
  return FONT_FAMILY_STACKS[id];
}
