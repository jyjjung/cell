export type ColorPaletteTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  border: string;
  input: string;
  ring: string;
  glassBg: string;
  glassBgAlpha: string;
  glassBorderAlpha: string;
  glassRingAlpha: string;
  glassShadowAlpha: string;
  routeAccent: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

export type AppThemeId =
  | 'classic'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'rose'
  | 'lavender'
  | 'slate'
  | 'amber'
  | 'mint'
  | 'coral'
  | 'indigo'
  | 'monochrome'
  | 'parchment'
  | 'charcoal'
  | 'plum'
  | 'midnight';

type AppThemeAccent = {
  h: number;
  s: number;
  lightL: number;
  darkL: number;
};

type AppThemeSurface = {
  h: number;
  s: number;
  bg: number;
  card: number;
};

type AppThemeDefinition = {
  id: AppThemeId;
  label: string;
  accent: AppThemeAccent;
  light: AppThemeSurface;
  dark: AppThemeSurface;
};

export const APP_THEME_STORAGE_KEY = 'appTheme';
export const DEFAULT_APP_THEME_ID: AppThemeId = 'classic';

const THEME_LIST: AppThemeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic',
    accent: { h: 221, s: 83, lightL: 53, darkL: 62 },
    light: { h: 240, s: 14, bg: 97, card: 100 },
    dark: { h: 240, s: 10, bg: 4, card: 6 },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    accent: { h: 199, s: 89, lightL: 48, darkL: 58 },
    light: { h: 200, s: 25, bg: 96, card: 100 },
    dark: { h: 210, s: 30, bg: 7, card: 9 },
  },
  {
    id: 'forest',
    label: 'Forest',
    accent: { h: 142, s: 72, lightL: 36, darkL: 52 },
    light: { h: 140, s: 20, bg: 96, card: 100 },
    dark: { h: 145, s: 18, bg: 6, card: 8 },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    accent: { h: 25, s: 95, lightL: 53, darkL: 62 },
    light: { h: 35, s: 40, bg: 96, card: 100 },
    dark: { h: 25, s: 20, bg: 7, card: 9 },
  },
  {
    id: 'rose',
    label: 'Rose',
    accent: { h: 346, s: 77, lightL: 50, darkL: 62 },
    light: { h: 350, s: 30, bg: 97, card: 100 },
    dark: { h: 345, s: 18, bg: 6, card: 8 },
  },
  {
    id: 'lavender',
    label: 'Lavender',
    accent: { h: 262, s: 83, lightL: 58, darkL: 68 },
    light: { h: 265, s: 25, bg: 97, card: 100 },
    dark: { h: 265, s: 22, bg: 6, card: 8 },
  },
  {
    id: 'slate',
    label: 'Slate',
    accent: { h: 215, s: 25, lightL: 42, darkL: 72 },
    light: { h: 220, s: 12, bg: 92, card: 98 },
    dark: { h: 220, s: 10, bg: 10, card: 12 },
  },
  {
    id: 'amber',
    label: 'Amber',
    accent: { h: 38, s: 92, lightL: 50, darkL: 60 },
    light: { h: 40, s: 35, bg: 96, card: 100 },
    dark: { h: 35, s: 15, bg: 7, card: 9 },
  },
  {
    id: 'mint',
    label: 'Mint',
    accent: { h: 173, s: 80, lightL: 40, darkL: 55 },
    light: { h: 165, s: 25, bg: 97, card: 100 },
    dark: { h: 170, s: 18, bg: 6, card: 8 },
  },
  {
    id: 'coral',
    label: 'Coral',
    accent: { h: 12, s: 85, lightL: 55, darkL: 65 },
    light: { h: 20, s: 35, bg: 96, card: 100 },
    dark: { h: 15, s: 18, bg: 7, card: 9 },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    accent: { h: 239, s: 84, lightL: 67, darkL: 72 },
    light: { h: 235, s: 20, bg: 97, card: 100 },
    dark: { h: 235, s: 25, bg: 5, card: 7 },
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    accent: { h: 240, s: 6, lightL: 10, darkL: 98 },
    light: { h: 240, s: 5, bg: 98, card: 100 },
    dark: { h: 240, s: 8, bg: 4, card: 6 },
  },
  {
    id: 'parchment',
    label: 'Parchment',
    accent: { h: 30, s: 45, lightL: 38, darkL: 58 },
    light: { h: 40, s: 55, bg: 96, card: 99 },
    dark: { h: 35, s: 14, bg: 8, card: 10 },
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    accent: { h: 210, s: 70, lightL: 52, darkL: 65 },
    light: { h: 220, s: 8, bg: 90, card: 96 },
    dark: { h: 240, s: 6, bg: 8, card: 10 },
  },
  {
    id: 'plum',
    label: 'Plum',
    accent: { h: 300, s: 65, lightL: 48, darkL: 62 },
    light: { h: 300, s: 20, bg: 96, card: 100 },
    dark: { h: 295, s: 22, bg: 6, card: 8 },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    accent: { h: 235, s: 80, lightL: 48, darkL: 68 },
    light: { h: 230, s: 30, bg: 95, card: 100 },
    dark: { h: 230, s: 35, bg: 3, card: 5 },
  },
];

const APP_THEMES: Record<AppThemeId, AppThemeDefinition> = Object.fromEntries(
  THEME_LIST.map((t) => [t.id, t]),
) as Record<AppThemeId, AppThemeDefinition>;

export const APP_THEME_LIST = THEME_LIST;

function buildThemeTokens(isDark: boolean, theme: AppThemeDefinition): ColorPaletteTokens {
  const { accent } = theme;
  const surface = isDark ? theme.dark : theme.light;
  const surfaceSat = Math.max(surface.s, 0);
  const borderL = isDark ? Math.min(surface.bg + 12, 22) : Math.max(surface.bg - 9, 82);
  const mutedL = isDark ? Math.min(surface.bg + 10, 18) : Math.max(surface.bg - 2, 94);
  const secondaryL = isDark ? Math.min(surface.bg + 10, 16) : Math.max(surface.bg - 1, 95);
  const accentSurfaceL = isDark ? Math.min(surface.bg + 14, 20) : Math.max(surface.bg - 7, 88);
  const mutedFgL = isDark ? 64 : 40;
  const primary = `${accent.h} ${accent.s}% ${isDark ? accent.darkL : accent.lightL}%`;
  const primaryFg = isDark ? `${surface.h} 12% 6%` : '0 0% 100%';

  return {
    background: `${surface.h} ${surfaceSat}% ${surface.bg}%`,
    foreground: isDark ? '0 0% 98%' : `${surface.h} 12% 8%`,
    card: `${surface.h} ${Math.max(surfaceSat - 2, 0)}% ${surface.card}%`,
    cardForeground: isDark ? '0 0% 98%' : `${surface.h} 12% 8%`,
    popover: `${surface.h} ${Math.max(surfaceSat - 2, 0)}% ${surface.card}%`,
    popoverForeground: isDark ? '0 0% 98%' : `${surface.h} 12% 8%`,
    primary,
    primaryForeground: primaryFg,
    secondary: `${surface.h} ${Math.max(surfaceSat - 1, 0)}% ${secondaryL}%`,
    secondaryForeground: isDark ? '0 0% 98%' : `${surface.h} 10% 12%`,
    muted: `${surface.h} ${Math.max(surfaceSat - 1, 0)}% ${mutedL}%`,
    mutedForeground: `${surface.h} 6% ${mutedFgL}%`,
    accent: `${surface.h} ${Math.max(surfaceSat - 1, 0)}% ${accentSurfaceL}%`,
    accentForeground: isDark ? '0 0% 98%' : `${surface.h} 10% 12%`,
    destructive: isDark ? '350 80% 60%' : '350 82% 55%',
    destructiveForeground: '0 0% 100%',
    success: isDark ? '142 65% 48%' : '142 72% 34%',
    successForeground: isDark ? `${surface.h} 12% 6%` : '0 0% 100%',
    border: `${surface.h} ${Math.max(surfaceSat - 1, 0)}% ${borderL}%`,
    input: `${surface.h} ${Math.max(surfaceSat - 1, 0)}% ${borderL}%`,
    ring: isDark
      ? `${accent.h} ${accent.s}% ${Math.min(accent.darkL + 10, 80)}%`
      : `${accent.h} ${accent.s}% ${Math.max(accent.lightL - 25, 25)}%`,
    glassBg: isDark ? `${surface.h} 12% 10%` : '0 0% 100%',
    glassBgAlpha: isDark ? '0.48' : '0.52',
    glassBorderAlpha: isDark ? '0.52' : '0.88',
    glassRingAlpha: isDark ? '0.4' : '0.3',
    glassShadowAlpha: isDark ? '0.42' : '0.2',
    routeAccent: primary,
    chart1: primary,
    chart2: isDark
      ? `${accent.h} ${Math.max(accent.s - 20, 10)}% ${Math.min(accent.darkL + 8, 75)}%`
      : `${accent.h} ${Math.max(accent.s - 15, 10)}% ${Math.max(accent.lightL - 12, 30)}%`,
    chart3: isDark
      ? `${accent.h} ${Math.max(accent.s - 30, 8)}% ${accent.darkL - 5}%`
      : `${accent.h} ${Math.max(accent.s - 25, 8)}% ${Math.max(accent.lightL - 22, 25)}%`,
    chart4: isDark
      ? `${accent.h} ${Math.max(accent.s - 40, 6)}% ${accent.darkL - 18}%`
      : `${accent.h} ${Math.max(accent.s - 35, 6)}% ${Math.max(accent.lightL - 32, 20)}%`,
    chart5: isDark
      ? `${accent.h} ${Math.max(accent.s - 50, 4)}% ${accent.darkL - 30}%`
      : `${accent.h} ${Math.max(accent.s - 45, 4)}% ${Math.max(accent.lightL - 42, 15)}%`,
    sidebarBackground: `${surface.h} ${surfaceSat}% ${surface.bg}%`,
    sidebarForeground: isDark ? '0 0% 98%' : `${surface.h} 12% 8%`,
    sidebarAccent: `${surface.h} ${Math.max(surfaceSat - 1, 0)}% ${secondaryL}%`,
    sidebarAccentForeground: isDark ? '0 0% 98%' : `${surface.h} 10% 12%`,
    sidebarBorder: `${surface.h} ${Math.max(surfaceSat - 1, 0)}% ${borderL}%`,
    sidebarRing: isDark
      ? `${accent.h} ${accent.s}% ${Math.min(accent.darkL + 10, 80)}%`
      : `${accent.h} ${accent.s}% ${Math.max(accent.lightL - 25, 25)}%`,
  };
}

export function getAppThemeTokens(id: AppThemeId, isDark: boolean): ColorPaletteTokens {
  return buildThemeTokens(isDark, APP_THEMES[id]);
}

export function appThemePreviewCss(id: AppThemeId, isDark: boolean): string {
  const theme = APP_THEMES[id];
  const surface = isDark ? theme.dark : theme.light;
  const accentL = isDark ? theme.accent.darkL : theme.accent.lightL;
  const bg = `hsl(${surface.h} ${surface.s}% ${surface.bg}%)`;
  const accent = `hsl(${theme.accent.h} ${theme.accent.s}% ${accentL}%)`;
  return `linear-gradient(135deg, ${bg} 55%, ${accent} 55%)`;
}

function isAppThemeId(value: string | undefined | null): value is AppThemeId {
  return !!value && value in APP_THEMES;
}

export function normalizeAppThemeId(
  value: string | undefined | null,
): AppThemeId {
  return isAppThemeId(value) ? value : DEFAULT_APP_THEME_ID;
}
