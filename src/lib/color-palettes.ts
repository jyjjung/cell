export const SPECTRUM_HUES = [
  0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165,
  180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345,
] as const;

export type SpectrumHue = (typeof SPECTRUM_HUES)[number];
export type SpectrumPaletteId = `spectrum-${SpectrumHue}`;

export type ColorPaletteId =
  | 'monochrome'
  | 'warm-paper'
  | 'high-contrast'
  | SpectrumPaletteId
  | 'cool-slate'
  | 'azure'
  | 'forest'
  | 'rose'
  | 'amber'
  | 'lavender'
  | 'ocean'
  | 'ember'
  | 'mint'
  | 'blossom'
  | 'lunar'
  | 'verdant'
  | 'midnight';

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

export type ColorPaletteDefinition = {
  id: ColorPaletteId;
  label: string;
  description: string;
  previewLight: string;
  previewDark: string;
  light: ColorPaletteTokens;
  dark: ColorPaletteTokens;
};

type PaletteConfig = {
  id: ColorPaletteId;
  label: string;
  description: string;
  previewLight: string;
  previewDark: string;
  accentHue: number;
  accentSat: number;
  accentLight: number;
  accentLightDark: number;
  surfaceHue?: number;
  surfaceSat?: number;
  highContrast?: boolean;
};

function buildTokens(isDark: boolean, config: PaletteConfig): ColorPaletteTokens {
  const {
    accentHue,
    accentSat,
    accentLight,
    accentLightDark,
    surfaceHue = 240,
    surfaceSat = 5,
    highContrast = false,
  } = config;

  if (highContrast) {
    if (isDark) {
      return {
        background: '0 0% 0%',
        foreground: '0 0% 100%',
        card: '0 0% 6%',
        cardForeground: '0 0% 100%',
        popover: '0 0% 6%',
        popoverForeground: '0 0% 100%',
        primary: '0 0% 100%',
        primaryForeground: '0 0% 0%',
        secondary: '0 0% 14%',
        secondaryForeground: '0 0% 100%',
        muted: '0 0% 14%',
        mutedForeground: '0 0% 75%',
        accent: '0 0% 18%',
        accentForeground: '0 0% 100%',
        destructive: '350 90% 55%',
        destructiveForeground: '0 0% 100%',
        success: '142 70% 45%',
        successForeground: '0 0% 0%',
        border: '0 0% 28%',
        input: '0 0% 28%',
        ring: '0 0% 100%',
        glassBg: '0 0% 8%',
        glassBgAlpha: '0.72',
        glassBorderAlpha: '0.85',
        glassRingAlpha: '0.6',
        glassShadowAlpha: '0.5',
        routeAccent: `${accentHue} ${accentSat}% ${accentLightDark}%`,
        chart1: '0 0% 100%',
        chart2: '0 0% 80%',
        chart3: '0 0% 60%',
        chart4: '0 0% 45%',
        chart5: '0 0% 30%',
        sidebarBackground: '0 0% 0%',
        sidebarForeground: '0 0% 100%',
        sidebarAccent: '0 0% 14%',
        sidebarAccentForeground: '0 0% 100%',
        sidebarBorder: '0 0% 28%',
        sidebarRing: '0 0% 100%',
      };
    }

    return {
      background: '0 0% 100%',
      foreground: '0 0% 0%',
      card: '0 0% 100%',
      cardForeground: '0 0% 0%',
      popover: '0 0% 100%',
      popoverForeground: '0 0% 0%',
      primary: '0 0% 0%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 94%',
      secondaryForeground: '0 0% 0%',
      muted: '0 0% 94%',
      mutedForeground: '0 0% 30%',
      accent: '0 0% 90%',
      accentForeground: '0 0% 0%',
      destructive: '350 90% 42%',
      destructiveForeground: '0 0% 100%',
      success: '142 75% 28%',
      successForeground: '0 0% 100%',
      border: '0 0% 72%',
      input: '0 0% 72%',
      ring: '0 0% 0%',
      glassBg: '0 0% 100%',
      glassBgAlpha: '0.78',
      glassBorderAlpha: '0.95',
      glassRingAlpha: '0.5',
      glassShadowAlpha: '0.18',
      routeAccent: `${accentHue} ${accentSat}% ${accentLight}%`,
      chart1: '0 0% 0%',
      chart2: '0 0% 25%',
      chart3: '0 0% 40%',
      chart4: '0 0% 55%',
      chart5: '0 0% 70%',
      sidebarBackground: '0 0% 100%',
      sidebarForeground: '0 0% 0%',
      sidebarAccent: '0 0% 94%',
      sidebarAccentForeground: '0 0% 0%',
      sidebarBorder: '0 0% 72%',
      sidebarRing: '0 0% 0%',
    };
  }

  const bgLight = isDark ? 4 : 98;
  const cardLight = isDark ? 6 : 100;
  const secondaryLight = isDark ? 14 : 96;
  const mutedLight = isDark ? 14 : 96;
  const accentSurfaceLight = isDark ? 18 : 90;
  const borderLight = isDark ? 16 : 88;
  const mutedFgLight = isDark ? 64 : 34;
  const primary = isDark
    ? `${accentHue} ${Math.min(accentSat + 10, 100)}% ${accentLightDark}%`
    : `${accentHue} ${accentSat}% ${accentLight}%`;
  const primaryFg = isDark ? `${surfaceHue} 10% 4%` : '0 0% 100%';

  return {
    background: `${surfaceHue} ${surfaceSat}% ${bgLight}%`,
    foreground: isDark ? '0 0% 98%' : `${surfaceHue} 10% 4%`,
    card: `${surfaceHue} ${Math.max(surfaceSat - 2, 0)}% ${cardLight}%`,
    cardForeground: isDark ? '0 0% 98%' : `${surfaceHue} 10% 4%`,
    popover: `${surfaceHue} ${Math.max(surfaceSat - 2, 0)}% ${cardLight}%`,
    popoverForeground: isDark ? '0 0% 98%' : `${surfaceHue} 10% 4%`,
    primary,
    primaryForeground: primaryFg,
    secondary: `${surfaceHue} ${Math.max(surfaceSat - 1, 0)}% ${secondaryLight}%`,
    secondaryForeground: isDark ? '0 0% 98%' : `${surfaceHue} 6% 10%`,
    muted: `${surfaceHue} ${Math.max(surfaceSat - 1, 0)}% ${mutedLight}%`,
    mutedForeground: `${surfaceHue} 5% ${mutedFgLight}%`,
    accent: `${surfaceHue} ${Math.max(surfaceSat - 1, 0)}% ${accentSurfaceLight}%`,
    accentForeground: isDark ? '0 0% 98%' : `${surfaceHue} 6% 10%`,
    destructive: isDark ? '350 80% 60%' : '350 82% 55%',
    destructiveForeground: '0 0% 100%',
    success: isDark ? '142 65% 48%' : '142 72% 34%',
    successForeground: isDark ? `${surfaceHue} 10% 4%` : '0 0% 100%',
    border: `${surfaceHue} ${Math.max(surfaceSat - 1, 0)}% ${borderLight}%`,
    input: `${surfaceHue} ${Math.max(surfaceSat - 1, 0)}% ${borderLight}%`,
    ring: isDark ? `${accentHue} ${accentSat}% ${Math.min(accentLightDark + 15, 85)}%` : `${accentHue} ${accentSat}% ${Math.max(accentLight - 30, 20)}%`,
    glassBg: isDark ? `${surfaceHue} 10% 10%` : '0 0% 100%',
    glassBgAlpha: isDark ? '0.48' : '0.52',
    glassBorderAlpha: isDark ? '0.52' : '0.88',
    glassRingAlpha: isDark ? '0.4' : '0.3',
    glassShadowAlpha: isDark ? '0.42' : '0.2',
    routeAccent: primary,
    chart1: primary,
    chart2: isDark ? `${accentHue} ${accentSat - 20}% ${accentLightDark + 10}%` : `${accentHue} ${accentSat - 15}% ${accentLight - 15}%`,
    chart3: isDark ? `${accentHue} ${accentSat - 30}% ${accentLightDark - 5}%` : `${accentHue} ${accentSat - 25}% ${accentLight - 25}%`,
    chart4: isDark ? `${accentHue} ${accentSat - 40}% ${accentLightDark - 20}%` : `${accentHue} ${accentSat - 35}% ${accentLight - 35}%`,
    chart5: isDark ? `${accentHue} ${accentSat - 50}% ${accentLightDark - 35}%` : `${accentHue} ${accentSat - 45}% ${accentLight - 45}%`,
    sidebarBackground: `${surfaceHue} ${surfaceSat}% ${bgLight}%`,
    sidebarForeground: isDark ? '0 0% 98%' : `${surfaceHue} 10% 4%`,
    sidebarAccent: `${surfaceHue} ${Math.max(surfaceSat - 1, 0)}% ${secondaryLight}%`,
    sidebarAccentForeground: isDark ? '0 0% 98%' : `${surfaceHue} 6% 10%`,
    sidebarBorder: `${surfaceHue} ${Math.max(surfaceSat - 1, 0)}% ${borderLight}%`,
    sidebarRing: isDark ? `${accentHue} ${accentSat}% ${Math.min(accentLightDark + 15, 85)}%` : `${accentHue} ${accentSat}% ${Math.max(accentLight - 30, 20)}%`,
  };
}

function buildMonochromeTokens(isDark: boolean): ColorPaletteTokens {
  if (isDark) {
    return {
      background: '240 10% 4%',
      foreground: '0 0% 98%',
      card: '240 10% 6%',
      cardForeground: '0 0% 98%',
      popover: '240 10% 6%',
      popoverForeground: '0 0% 98%',
      primary: '0 0% 98%',
      primaryForeground: '240 6% 10%',
      secondary: '240 4% 14%',
      secondaryForeground: '0 0% 98%',
      muted: '240 4% 14%',
      mutedForeground: '240 5% 64%',
      accent: '240 4% 18%',
      accentForeground: '0 0% 98%',
      destructive: '350 80% 60%',
      destructiveForeground: '0 0% 100%',
      success: '142 65% 48%',
      successForeground: '240 10% 4%',
      border: '240 4% 16%',
      input: '240 4% 16%',
      ring: '240 5% 84%',
      glassBg: '240 10% 10%',
      glassBgAlpha: '0.48',
      glassBorderAlpha: '0.52',
      glassRingAlpha: '0.4',
      glassShadowAlpha: '0.42',
      routeAccent: '0 0% 98%',
      chart1: '0 0% 98%',
      chart2: '240 5% 80%',
      chart3: '240 4% 65%',
      chart4: '240 4% 50%',
      chart5: '240 5% 35%',
      sidebarBackground: '240 10% 4%',
      sidebarForeground: '0 0% 98%',
      sidebarAccent: '240 4% 14%',
      sidebarAccentForeground: '0 0% 98%',
      sidebarBorder: '240 4% 16%',
      sidebarRing: '240 5% 84%',
    };
  }

  return {
    background: '0 0% 98%',
    foreground: '240 10% 4%',
    card: '0 0% 100%',
    cardForeground: '240 10% 4%',
    popover: '0 0% 100%',
    popoverForeground: '240 10% 4%',
    primary: '240 6% 10%',
    primaryForeground: '0 0% 98%',
    secondary: '240 5% 96%',
    secondaryForeground: '240 6% 10%',
    muted: '240 5% 96%',
    mutedForeground: '240 5% 34%',
    accent: '240 5% 90%',
    accentForeground: '240 6% 10%',
    destructive: '350 82% 55%',
    destructiveForeground: '0 0% 100%',
    success: '142 72% 34%',
    successForeground: '0 0% 100%',
    border: '240 6% 88%',
    input: '240 6% 88%',
    ring: '240 6% 20%',
    glassBg: '0 0% 100%',
    glassBgAlpha: '0.52',
    glassBorderAlpha: '0.88',
    glassRingAlpha: '0.3',
    glassShadowAlpha: '0.2',
    routeAccent: '240 6% 10%',
    chart1: '240 6% 10%',
    chart2: '240 5% 25%',
    chart3: '240 4% 40%',
    chart4: '240 4% 55%',
    chart5: '240 5% 70%',
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '240 10% 4%',
    sidebarAccent: '240 5% 96%',
    sidebarAccentForeground: '240 6% 10%',
    sidebarBorder: '240 6% 88%',
    sidebarRing: '240 6% 20%',
  };
}

export const SPECTRUM_LABELS: Record<SpectrumHue, string> = {
  0: 'Crimson',
  15: 'Vermillion',
  30: 'Tangerine',
  45: 'Gold',
  60: 'Chartreuse',
  75: 'Lime',
  90: 'Spring',
  105: 'Mint',
  120: 'Forest',
  135: 'Jade',
  150: 'Teal',
  165: 'Cyan',
  180: 'Sky',
  195: 'Ocean',
  210: 'Azure',
  225: 'Indigo',
  240: 'Violet',
  255: 'Purple',
  270: 'Lavender',
  285: 'Orchid',
  300: 'Fuchsia',
  315: 'Magenta',
  330: 'Rose',
  345: 'Cherry',
};

function spectrumPreview(hue: number, isDark: boolean): string {
  const surface = `hsl(${hue}, ${isDark ? 22 : 16}%, ${isDark ? 6 : 97}%)`;
  const accent = `hsl(${hue}, 78%, ${isDark ? 62 : 46}%)`;
  return `linear-gradient(135deg, ${surface} 50%, ${accent} 50%)`;
}

function createSpectrumConfig(hue: SpectrumHue): PaletteConfig {
  return {
    id: `spectrum-${hue}` as SpectrumPaletteId,
    label: SPECTRUM_LABELS[hue],
    description: `${SPECTRUM_LABELS[hue]} accent and tinted surfaces.`,
    previewLight: spectrumPreview(hue, false),
    previewDark: spectrumPreview(hue, true),
    accentHue: hue,
    accentSat: 72 + (hue % 45 === 0 ? 10 : 0),
    accentLight: 46,
    accentLightDark: 62,
    surfaceHue: hue,
    surfaceSat: 14 + (hue % 18),
  };
}

const SPECIAL_PALETTE_CONFIGS: PaletteConfig[] = [
  {
    id: 'monochrome',
    label: 'Monochrome',
    description: 'Clean greyscale — the classic look.',
    previewLight: 'linear-gradient(135deg, #fafafa 50%, #171717 50%)',
    previewDark: 'linear-gradient(135deg, #0a0a0a 50%, #fafafa 50%)',
    accentHue: 240,
    accentSat: 6,
    accentLight: 10,
    accentLightDark: 98,
  },
  {
    id: 'warm-paper',
    label: 'Warm Paper',
    description: 'Cream surfaces with a soft amber accent.',
    previewLight: 'linear-gradient(135deg, #faf6ef 50%, #b45309 50%)',
    previewDark: 'linear-gradient(135deg, #1c1917 50%, #fbbf24 50%)',
    accentHue: 32,
    accentSat: 85,
    accentLight: 42,
    accentLightDark: 65,
    surfaceHue: 35,
    surfaceSat: 18,
  },
];

/** Legacy palette IDs kept so saved preferences still resolve. */
const LEGACY_PALETTE_CONFIGS: PaletteConfig[] = [
  {
    id: 'cool-slate',
    label: 'Cool Slate',
    description: 'Blue-grey surfaces with a muted slate accent.',
    previewLight: 'linear-gradient(135deg, #f1f5f9 50%, #475569 50%)',
    previewDark: 'linear-gradient(135deg, #0f172a 50%, #94a3b8 50%)',
    accentHue: 215,
    accentSat: 20,
    accentLight: 38,
    accentLightDark: 72,
    surfaceHue: 215,
    surfaceSat: 22,
  },
  {
    id: 'azure',
    label: 'Azure',
    description: 'Electric blue accents on obsidian and alabaster.',
    previewLight: 'linear-gradient(135deg, #f0f4fa 50%, #2563eb 50%)',
    previewDark: 'linear-gradient(135deg, #030712 50%, #3b82f6 50%)',
    accentHue: 214,
    accentSat: 90,
    accentLight: 52,
    accentLightDark: 65,
    surfaceHue: 224,
    surfaceSat: 35,
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Earthy greens tuned for reading and reflection.',
    previewLight: 'linear-gradient(135deg, #f0fdf4 50%, #15803d 50%)',
    previewDark: 'linear-gradient(135deg, #052e16 50%, #34d399 50%)',
    accentHue: 142,
    accentSat: 65,
    accentLight: 34,
    accentLightDark: 55,
    surfaceHue: 150,
    surfaceSat: 18,
  },
  {
    id: 'rose',
    label: 'Rose',
    description: 'Soft rose pink with warm undertones.',
    previewLight: 'linear-gradient(135deg, #fff1f2 50%, #e11d48 50%)',
    previewDark: 'linear-gradient(135deg, #1a0a0f 50%, #fb7185 50%)',
    accentHue: 350,
    accentSat: 75,
    accentLight: 48,
    accentLightDark: 68,
    surfaceHue: 350,
    surfaceSat: 15,
  },
  {
    id: 'amber',
    label: 'Amber',
    description: 'Golden warmth for events and schedules.',
    previewLight: 'linear-gradient(135deg, #fffbeb 50%, #d97706 50%)',
    previewDark: 'linear-gradient(135deg, #1c1408 50%, #fbbf24 50%)',
    accentHue: 38,
    accentSat: 92,
    accentLight: 45,
    accentLightDark: 62,
    surfaceHue: 40,
    surfaceSat: 20,
  },
  {
    id: 'lavender',
    label: 'Lavender',
    description: 'Calm purple tones for a relaxed feel.',
    previewLight: 'linear-gradient(135deg, #faf5ff 50%, #7c3aed 50%)',
    previewDark: 'linear-gradient(135deg, #130820 50%, #a78bfa 50%)',
    accentHue: 270,
    accentSat: 70,
    accentLight: 52,
    accentLightDark: 72,
    surfaceHue: 270,
    surfaceSat: 18,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Cyan and sky blues like open water.',
    previewLight: 'linear-gradient(135deg, #ecfeff 50%, #0891b2 50%)',
    previewDark: 'linear-gradient(135deg, #042f2e 50%, #22d3ee 50%)',
    accentHue: 190,
    accentSat: 80,
    accentLight: 40,
    accentLightDark: 58,
    surfaceHue: 195,
    surfaceSat: 25,
  },
  {
    id: 'ember',
    label: 'Ember',
    description: 'Fiery orange-red warmth.',
    previewLight: 'linear-gradient(135deg, #fff7ed 50%, #ea580c 50%)',
    previewDark: 'linear-gradient(135deg, #1a0a04 50%, #f97316 50%)',
    accentHue: 24,
    accentSat: 90,
    accentLight: 48,
    accentLightDark: 62,
    surfaceHue: 25,
    surfaceSat: 18,
  },
  {
    id: 'mint',
    label: 'Mint',
    description: 'Fresh mint-teal with a crisp finish.',
    previewLight: 'linear-gradient(135deg, #f0fdfa 50%, #0d9488 50%)',
    previewDark: 'linear-gradient(135deg, #042f2e 50%, #2dd4bf 50%)',
    accentHue: 168,
    accentSat: 70,
    accentLight: 38,
    accentLightDark: 55,
    surfaceHue: 170,
    surfaceSat: 20,
  },
  {
    id: 'blossom',
    label: 'Blossom',
    description: 'Cherry blossom pink with soft bloom.',
    previewLight: 'linear-gradient(135deg, #fdf2f8 50%, #db2777 50%)',
    previewDark: 'linear-gradient(135deg, #1a0510 50%, #f472b6 50%)',
    accentHue: 330,
    accentSat: 75,
    accentLight: 50,
    accentLightDark: 70,
    surfaceHue: 330,
    surfaceSat: 15,
  },
  {
    id: 'lunar',
    label: 'Lunar',
    description: 'Silver moonlight on cool neutral surfaces.',
    previewLight: 'linear-gradient(135deg, #f8fafc 50%, #64748b 50%)',
    previewDark: 'linear-gradient(135deg, #0b1120 50%, #e2e8f0 50%)',
    accentHue: 220,
    accentSat: 15,
    accentLight: 45,
    accentLightDark: 85,
    surfaceHue: 220,
    surfaceSat: 18,
  },
  {
    id: 'verdant',
    label: 'Verdant',
    description: 'Vibrant spring green energy.',
    previewLight: 'linear-gradient(135deg, #ecfdf5 50%, #16a34a 50%)',
    previewDark: 'linear-gradient(135deg, #052e16 50%, #4ade80 50%)',
    accentHue: 145,
    accentSat: 75,
    accentLight: 36,
    accentLightDark: 58,
    surfaceHue: 145,
    surfaceSat: 20,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep navy blues for late-night use.',
    previewLight: 'linear-gradient(135deg, #eef2ff 50%, #3730a3 50%)',
    previewDark: 'linear-gradient(135deg, #020617 50%, #6366f1 50%)',
    accentHue: 235,
    accentSat: 80,
    accentLight: 48,
    accentLightDark: 68,
    surfaceHue: 230,
    surfaceSat: 35,
  },
];

const PALETTE_CONFIGS: PaletteConfig[] = [
  ...SPECIAL_PALETTE_CONFIGS,
  ...SPECTRUM_HUES.map(createSpectrumConfig),
  ...LEGACY_PALETTE_CONFIGS,
  {
    id: 'high-contrast',
    label: 'High Contrast',
    description: 'Maximum readability — solid surfaces, no wallpaper.',
    previewLight: 'linear-gradient(135deg, #ffffff 50%, #000000 50%)',
    previewDark: 'linear-gradient(135deg, #000000 50%, #ffffff 50%)',
    accentHue: 214,
    accentSat: 90,
    accentLight: 52,
    accentLightDark: 65,
    highContrast: true,
  },
];

export const COLOR_PALETTE_GROUPS = [
  {
    id: 'special' as const,
    label: 'Special',
    paletteIds: ['monochrome', 'warm-paper', 'high-contrast'] as ColorPaletteId[],
  },
  {
    id: 'spectrum' as const,
    label: 'Spectrum',
    paletteIds: SPECTRUM_HUES.map((hue) => `spectrum-${hue}` as SpectrumPaletteId),
  },
];

/** Maps retired palette IDs to the nearest spectrum equivalent. */
export const LEGACY_PALETTE_MIGRATION: Record<string, ColorPaletteId> = {
  'cool-slate': 'spectrum-210',
  azure: 'spectrum-210',
  forest: 'spectrum-150',
  rose: 'spectrum-345',
  amber: 'spectrum-45',
  lavender: 'spectrum-270',
  ocean: 'spectrum-195',
  ember: 'spectrum-30',
  mint: 'spectrum-165',
  blossom: 'spectrum-330',
  lunar: 'spectrum-225',
  verdant: 'spectrum-120',
  midnight: 'spectrum-240',
};

function configToPalette(config: PaletteConfig): ColorPaletteDefinition {
  const build = config.id === 'monochrome'
    ? buildMonochromeTokens
    : (isDark: boolean) => buildTokens(isDark, config);

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    previewLight: config.previewLight,
    previewDark: config.previewDark,
    light: build(false),
    dark: build(true),
  };
}

export const COLOR_PALETTES: Record<ColorPaletteId, ColorPaletteDefinition> =
  Object.fromEntries(
    PALETTE_CONFIGS.map((config) => [config.id, configToPalette(config)])
  ) as Record<ColorPaletteId, ColorPaletteDefinition>;

export const COLOR_PALETTE_LIST = PALETTE_CONFIGS.map((config) => configToPalette(config));

export const DEFAULT_COLOR_PALETTE_ID: ColorPaletteId = 'azure';

export const COLOR_PALETTE_STORAGE_KEY = 'colorPalette';

export function isColorPaletteId(value: string | undefined | null): value is ColorPaletteId {
  return !!value && value in COLOR_PALETTES;
}

export function normalizeColorPaletteId(value: string | undefined | null): ColorPaletteId {
  if (!value) return DEFAULT_COLOR_PALETTE_ID;
  if (isColorPaletteId(value)) return value;
  return LEGACY_PALETTE_MIGRATION[value] ?? DEFAULT_COLOR_PALETTE_ID;
}

export function getPaletteTokens(id: ColorPaletteId, isDark: boolean): ColorPaletteTokens {
  const palette = COLOR_PALETTES[id];
  return isDark ? palette.dark : palette.light;
}
