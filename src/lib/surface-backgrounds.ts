export type SurfaceBackgroundId = 'light' | 'cream' | 'gray' | 'dark' | 'black';

export type SurfaceBackgroundDef = {
  id: SurfaceBackgroundId;
  label: string;
  /** HSL components for light theme */
  light: string;
  /** HSL components for dark theme */
  dark: string;
};

export const SURFACE_BACKGROUND_LIST: SurfaceBackgroundDef[] = [
  {
    id: 'light',
    label: 'Light',
    light: '0 0% 98%',
    dark: '220 8% 9%',
  },
  {
    id: 'cream',
    label: 'Cream',
    light: '40 55% 96%',
    dark: '35 14% 8%',
  },
  {
    id: 'gray',
    label: 'Gray',
    light: '220 8% 90%',
    dark: '220 6% 12%',
  },
  {
    id: 'dark',
    label: 'Dark',
    light: '240 6% 16%',
    dark: '240 8% 6%',
  },
  {
    id: 'black',
    label: 'Black',
    light: '0 0% 4%',
    dark: '0 0% 0%',
  },
];

export const SURFACE_BACKGROUNDS: Record<SurfaceBackgroundId, SurfaceBackgroundDef> = Object.fromEntries(
  SURFACE_BACKGROUND_LIST.map((entry) => [entry.id, entry]),
) as Record<SurfaceBackgroundId, SurfaceBackgroundDef>;

export const DEFAULT_SURFACE_BACKGROUND_ID: SurfaceBackgroundId = 'light';
export const SURFACE_BACKGROUND_STORAGE_KEY = 'surfaceBackground';

const SURFACE_BACKGROUND_IDS = new Set(SURFACE_BACKGROUND_LIST.map((entry) => entry.id));

/** Map legacy stored values to the current preset list. */
const LEGACY_SURFACE_BACKGROUND_MAP: Record<string, SurfaceBackgroundId> = {
  scenic: 'light',
  palette: 'light',
  ivory: 'cream',
  white: 'light',
  pearl: 'light',
  mist: 'gray',
  stone: 'gray',
  'warm-gray': 'gray',
  sand: 'cream',
  linen: 'cream',
  slate: 'dark',
  graphite: 'dark',
  charcoal: 'dark',
  espresso: 'black',
  black: 'black',
};

export function normalizeSurfaceBackgroundId(
  value: string | undefined | null,
): SurfaceBackgroundId {
  if (!value) return DEFAULT_SURFACE_BACKGROUND_ID;
  if (isSurfaceBackgroundId(value)) return value;
  if (LEGACY_SURFACE_BACKGROUND_MAP[value]) return LEGACY_SURFACE_BACKGROUND_MAP[value];
  if (value.startsWith('solid-') || value.startsWith('pastel-')) {
    return 'gray';
  }
  return DEFAULT_SURFACE_BACKGROUND_ID;
}

export function isSurfaceBackgroundId(value: string | undefined | null): value is SurfaceBackgroundId {
  return !!value && SURFACE_BACKGROUND_IDS.has(value as SurfaceBackgroundId);
}

export function getSurfaceBackgroundHsl(id: SurfaceBackgroundId, isDark: boolean): string {
  const entry = SURFACE_BACKGROUNDS[id];
  return isDark ? entry.dark : entry.light;
}

export function surfaceBackgroundPreviewCss(id: SurfaceBackgroundId, isDark: boolean): string {
  return `hsl(${getSurfaceBackgroundHsl(id, isDark)})`;
}
