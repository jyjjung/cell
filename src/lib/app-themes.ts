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
  | 'monochrome';

/** Locked brand accent — hue + saturation define theme identity. */
type AppThemeAccent = {
  h: number;
  s: number;
  /** Light-mode primary lightness (nudged only for WCAG). */
  lightL: number;
  /** Dark-mode primary lightness (nudged only for WCAG). */
  darkL: number;
};

/** Surface wash — keeps theme hue visible on page chrome, not only on buttons. */
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
  /** Near-zero surface chroma (Monochrome). */
  nearAchromatic?: boolean;
};

export const APP_THEME_STORAGE_KEY = 'appTheme';
export const DEFAULT_APP_THEME_ID: AppThemeId = 'classic';

/**
 * Distinct Appearance themes — accent H/S locked; surfaces intentionally tinted
 * so Ocean/Rose/etc. read as full palettes, not accent-on-black.
 */
const THEME_LIST: AppThemeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic',
    accent: { h: 221, s: 83, lightL: 48, darkL: 62 },
    light: { h: 221, s: 28, bg: 97, card: 100 },
    dark: { h: 221, s: 22, bg: 9, card: 12 },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    accent: { h: 199, s: 89, lightL: 42, darkL: 58 },
    light: { h: 198, s: 36, bg: 96, card: 100 },
    dark: { h: 200, s: 28, bg: 9, card: 12 },
  },
  {
    id: 'forest',
    label: 'Forest',
    accent: { h: 142, s: 72, lightL: 34, darkL: 52 },
    light: { h: 140, s: 28, bg: 96, card: 99 },
    dark: { h: 142, s: 22, bg: 9, card: 12 },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    accent: { h: 25, s: 95, lightL: 48, darkL: 62 },
    light: { h: 28, s: 42, bg: 96, card: 100 },
    dark: { h: 22, s: 26, bg: 9, card: 12 },
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    accent: { h: 240, s: 6, lightL: 12, darkL: 96 },
    light: { h: 240, s: 4, bg: 98, card: 100 },
    dark: { h: 240, s: 5, bg: 6, card: 9 },
    nearAchromatic: true,
  },
];

/** Retired theme ids → nearest kept palette. */
const LEGACY_THEME_ALIASES: Record<string, AppThemeId> = {
  mint: 'forest',
  rose: 'sunset',
  lavender: 'classic',
  slate: 'monochrome',
  parchment: 'classic',
};

const APP_THEMES: Record<AppThemeId, AppThemeDefinition> = Object.fromEntries(
  THEME_LIST.map((t) => [t.id, t]),
) as Record<AppThemeId, AppThemeDefinition>;

export const APP_THEME_LIST = THEME_LIST;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function hsl(h: number, s: number, l: number): string {
  return `${Math.round(wrapHue(h))} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;
}

/**
 * Build a full working palette — not just primary + gray.
 *
 * Roles:
 * - background / card / muted → surface wash (theme hue)
 * - primary → locked brand accent
 * - secondary → analogous fill (chart-2 family) for soft chips / secondary buttons
 * - accent → primary-tinted interactive chrome (hover, selected, hub)
 * - charts → harmonic set used by data + decorative accents
 */
function buildThemeTokens(isDark: boolean, theme: AppThemeDefinition): ColorPaletteTokens {
  const { accent } = theme;
  const surface = isDark ? theme.dark : theme.light;
  const surfaceH = surface.h;
  const surfaceSat = theme.nearAchromatic ? clamp(surface.s, 0, 6) : surface.s;
  const achromatic = !!theme.nearAchromatic;

  const bgL = surface.bg;
  const cardL = surface.card;
  const mutedL = isDark
    ? clamp(bgL + 7, bgL + 3, 20)
    : clamp(bgL - 3, 90, 96);
  const borderL = isDark
    ? clamp(bgL + 13, bgL + 8, 28)
    : clamp(bgL - 11, 78, 90);

  const fgL = isDark ? 98 : 8;
  const mutedFgL = isDark ? 70 : 40;

  const primaryL = isDark ? accent.darkL : accent.lightL;
  const primarySat = achromatic ? clamp(accent.s, 0, 10) : accent.s;
  const primary = hsl(accent.h, primarySat, primaryL);
  const primaryFg = isDark
    ? hsl(surfaceH, 12, 6)
    : achromatic
      ? hsl(surfaceH, 4, 98)
      : '0 0% 100%';

  // Analogous (+30°) and cool (−30°) companions
  const analogH = accent.h + 30;
  const coolH = accent.h - 30;
  const analogSat = achromatic ? 6 : clamp(accent.s - 18, 22, 72);
  const coolSat = achromatic ? 5 : clamp(accent.s - 24, 18, 64);

  // Secondary = soft analogous wash (second colour in the theme)
  const secondaryL = isDark
    ? clamp(bgL + 8, 12, 22)
    : clamp(bgL - 1, 90, 97);
  const secondarySat = achromatic ? clamp(surfaceSat + 1, 0, 8) : clamp(analogSat * 0.55, 14, 36);

  // Accent = primary-tinted interactive chrome (hover / selected)
  const accentSurfaceL = isDark
    ? clamp(bgL + 10, 14, 26)
    : clamp(bgL - 4, 88, 95);
  const accentSat = achromatic
    ? clamp(surfaceSat + 2, 0, 10)
    : isDark
      ? clamp(primarySat * 0.42, 18, 40)
      : clamp(primarySat * 0.28, 16, 38);

  const chart2 = isDark
    ? hsl(analogH, clamp(analogSat + 8, 18, 90), clamp(primaryL + 4, 42, 76))
    : hsl(analogH, clamp(analogSat + 6, 20, 90), clamp(primaryL - 2, 30, 55));
  const chart3 = isDark
    ? hsl(coolH, clamp(coolSat + 6, 14, 85), clamp(primaryL - 2, 38, 70))
    : hsl(coolH, clamp(coolSat + 4, 16, 85), clamp(primaryL - 8, 28, 50));
  const chart4 = isDark
    ? hsl(accent.h + 150, clamp(primarySat - 25, 20, 80), clamp(primaryL + 2, 40, 72))
    : hsl(accent.h + 150, clamp(primarySat - 20, 22, 80), clamp(primaryL - 6, 30, 52));
  const chart5 = isDark
    ? hsl(accent.h - 150, clamp(primarySat - 35, 12, 70), clamp(primaryL - 8, 34, 65))
    : hsl(accent.h - 150, clamp(primarySat - 30, 14, 70), clamp(primaryL - 12, 26, 48));

  const ring = isDark
    ? hsl(accent.h, primarySat, clamp(primaryL + 8, 45, 82))
    : hsl(accent.h, primarySat, clamp(primaryL - 8, 28, 55));

  const cardSat = Math.max(surfaceSat - 4, achromatic ? 0 : 10);
  const mutedSat = Math.max(surfaceSat - 6, achromatic ? 0 : 8);
  const borderSat = achromatic
    ? mutedSat
    : clamp(Math.max(surfaceSat, accentSat * 0.55), 10, 32);

  // Sidebar selected row — clearly brand-tinted
  const sidebarAccentL = isDark
    ? clamp(bgL + 9, 13, 24)
    : clamp(bgL - 3, 90, 96);
  const sidebarAccentSat = achromatic
    ? clamp(surfaceSat + 2, 0, 10)
    : isDark
      ? clamp(primarySat * 0.38, 16, 36)
      : clamp(primarySat * 0.22, 14, 32);

  return {
    background: hsl(surfaceH, surfaceSat, bgL),
    foreground: hsl(surfaceH, isDark ? 6 : 14, fgL),
    card: hsl(surfaceH, cardSat, cardL),
    cardForeground: hsl(surfaceH, isDark ? 6 : 14, fgL),
    popover: hsl(surfaceH, cardSat, cardL),
    popoverForeground: hsl(surfaceH, isDark ? 6 : 14, fgL),
    primary,
    primaryForeground: primaryFg,
    secondary: hsl(analogH, secondarySat, secondaryL),
    secondaryForeground: hsl(analogH, isDark ? 8 : 18, isDark ? 96 : 14),
    muted: hsl(surfaceH, mutedSat, mutedL),
    mutedForeground: hsl(surfaceH, isDark ? 10 : 12, mutedFgL),
    accent: hsl(accent.h, accentSat, accentSurfaceL),
    accentForeground: isDark
      ? hsl(accent.h, clamp(primarySat * 0.35, 8, 40), 96)
      : hsl(accent.h, clamp(primarySat * 0.55, 20, 55), 18),
    destructive: isDark ? '350 78% 58%' : '350 80% 48%',
    destructiveForeground: '0 0% 100%',
    success: isDark ? '142 62% 46%' : '142 70% 32%',
    successForeground: isDark ? hsl(surfaceH, 12, 6) : '0 0% 100%',
    border: hsl(surfaceH, borderSat, borderL),
    input: hsl(surfaceH, borderSat, borderL),
    ring,
    glassBg: isDark
      ? hsl(surfaceH, clamp(surfaceSat + 2, 8, 28), clamp(bgL + 4, 10, 18))
      : hsl(surfaceH, clamp(surfaceSat - 8, 0, 20), 100),
    glassBgAlpha: isDark ? '0.55' : '0.62',
    glassBorderAlpha: isDark ? '0.48' : '0.82',
    glassRingAlpha: isDark ? '0.36' : '0.28',
    glassShadowAlpha: isDark ? '0.4' : '0.14',
    routeAccent: primary,
    chart1: primary,
    chart2,
    chart3,
    chart4,
    chart5,
    sidebarBackground: hsl(surfaceH, surfaceSat, bgL),
    sidebarForeground: hsl(surfaceH, isDark ? 6 : 14, fgL),
    sidebarAccent: hsl(accent.h, sidebarAccentSat, sidebarAccentL),
    sidebarAccentForeground: isDark
      ? hsl(accent.h, clamp(primarySat * 0.4, 10, 45), 96)
      : hsl(accent.h, clamp(primarySat * 0.65, 25, 60), 22),
    sidebarBorder: hsl(surfaceH, borderSat, borderL),
    sidebarRing: ring,
  };
}

export function getAppThemeTokens(id: AppThemeId, isDark: boolean): ColorPaletteTokens {
  return buildThemeTokens(isDark, APP_THEMES[id]);
}

export function appThemePreviewCss(id: AppThemeId, isDark: boolean): string {
  const tokens = buildThemeTokens(isDark, APP_THEMES[id]);
  const bg = `hsl(${tokens.background})`;
  const secondary = `hsl(${tokens.secondary})`;
  const primary = `hsl(${tokens.primary})`;
  const chart2 = `hsl(${tokens.chart2})`;
  return `linear-gradient(135deg, ${bg} 0%, ${secondary} 32%, ${primary} 68%, ${chart2} 100%)`;
}

function isAppThemeId(value: string | undefined | null): value is AppThemeId {
  return !!value && value in APP_THEMES;
}

export function normalizeAppThemeId(
  value: string | undefined | null,
): AppThemeId {
  if (isAppThemeId(value)) return value;
  if (value && LEGACY_THEME_ALIASES[value]) return LEGACY_THEME_ALIASES[value]!;
  return DEFAULT_APP_THEME_ID;
}

