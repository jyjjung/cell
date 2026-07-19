export type FontFamilyChoice =
  | 'geist-sans'
  | 'inter'
  | 'dm-sans'
  | 'ibm-plex-sans'
  | 'nunito'
  | 'lora'
  | 'merriweather'
  | 'literata'
  | 'source-serif'
  | 'ibm-plex-serif'
  | 'crimson-pro'
  | 'playfair'
  | 'geist-mono'
  | 'jetbrains-mono'
  | 'ibm-plex-mono'
  | 'system-sans'
  | 'system-serif'
  | 'system-mono';

export type FontFamilyGroup = {
  label: string;
  fonts: { id: FontFamilyChoice; label: string }[];
};

const FONT_FAMILY_STACKS: Record<FontFamilyChoice, string> = {
  'geist-sans': 'var(--font-geist-sans), system-ui, sans-serif',
  inter: 'var(--font-inter), system-ui, sans-serif',
  'dm-sans': 'var(--font-dm-sans), system-ui, sans-serif',
  'ibm-plex-sans': 'var(--font-ibm-plex-sans), system-ui, sans-serif',
  nunito: 'var(--font-nunito), system-ui, sans-serif',
  lora: 'var(--font-lora), ui-serif, Georgia, serif',
  merriweather: 'var(--font-merriweather), ui-serif, Georgia, serif',
  literata: 'var(--font-literata), ui-serif, Georgia, serif',
  'source-serif': 'var(--font-source-serif), ui-serif, Georgia, serif',
  'ibm-plex-serif': 'var(--font-ibm-plex-serif), ui-serif, Georgia, serif',
  'crimson-pro': 'var(--font-crimson-pro), ui-serif, Georgia, serif',
  playfair: 'var(--font-playfair), ui-serif, Georgia, serif',
  'geist-mono': 'var(--font-geist-mono), ui-monospace, monospace',
  'jetbrains-mono': 'var(--font-jetbrains-mono), ui-monospace, monospace',
  'ibm-plex-mono': 'var(--font-ibm-plex-mono), ui-monospace, monospace',
  'system-sans': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'system-serif': 'ui-serif, Georgia, "Times New Roman", serif',
  'system-mono': 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace',
};

export const FONT_FAMILY_GROUPS: FontFamilyGroup[] = [
  {
    label: 'Sans',
    fonts: [
      { id: 'geist-sans', label: 'Geist Sans' },
      { id: 'inter', label: 'Inter' },
      { id: 'dm-sans', label: 'DM Sans' },
      { id: 'ibm-plex-sans', label: 'IBM Plex Sans' },
      { id: 'nunito', label: 'Nunito' },
      { id: 'system-sans', label: 'System Sans' },
    ],
  },
  {
    label: 'Serif',
    fonts: [
      { id: 'lora', label: 'Lora' },
      { id: 'merriweather', label: 'Merriweather' },
      { id: 'literata', label: 'Literata' },
      { id: 'source-serif', label: 'Source Serif 4' },
      { id: 'ibm-plex-serif', label: 'IBM Plex Serif' },
      { id: 'crimson-pro', label: 'Crimson Pro' },
      { id: 'playfair', label: 'Playfair Display' },
      { id: 'system-serif', label: 'System Serif' },
    ],
  },
  {
    label: 'Mono',
    fonts: [
      { id: 'geist-mono', label: 'Geist Mono' },
      { id: 'jetbrains-mono', label: 'JetBrains Mono' },
      { id: 'ibm-plex-mono', label: 'IBM Plex Mono' },
      { id: 'system-mono', label: 'System Mono' },
    ],
  },
];

const LEGACY_FONT_MAP: Record<string, FontFamilyChoice> = {
  sans: 'geist-sans',
  serif: 'lora',
  mono: 'geist-mono',
};

export function normalizeFontFamilyChoice(value: string | undefined | null): FontFamilyChoice {
  if (!value) return 'geist-sans';
  if (value in FONT_FAMILY_STACKS) return value as FontFamilyChoice;
  if (value in LEGACY_FONT_MAP) return LEGACY_FONT_MAP[value];
  return 'geist-sans';
}

export function getFontFamilyStack(id: FontFamilyChoice): string {
  return FONT_FAMILY_STACKS[id];
}
