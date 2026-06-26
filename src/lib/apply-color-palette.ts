import type { ColorPaletteId, ColorPaletteTokens } from './color-palettes';
import { getPaletteTokens } from './color-palettes';

const TOKEN_CSS_MAP: Record<keyof ColorPaletteTokens, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  success: '--success',
  successForeground: '--success-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  glassBg: '--glass-bg',
  glassBgAlpha: '--glass-bg-alpha',
  glassBorderAlpha: '--glass-border-alpha',
  glassRingAlpha: '--glass-ring-alpha',
  glassShadowAlpha: '--glass-shadow-alpha',
  routeAccent: '--route-accent',
  chart1: '--chart-1',
  chart2: '--chart-2',
  chart3: '--chart-3',
  chart4: '--chart-4',
  chart5: '--chart-5',
  sidebarBackground: '--sidebar-background',
  sidebarForeground: '--sidebar-foreground',
  sidebarAccent: '--sidebar-accent',
  sidebarAccentForeground: '--sidebar-accent-foreground',
  sidebarBorder: '--sidebar-border',
  sidebarRing: '--sidebar-ring',
};

export function applyColorPaletteTokens(tokens: ColorPaletteTokens, paletteId: string) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.palette = paletteId;

  (Object.entries(TOKEN_CSS_MAP) as [keyof ColorPaletteTokens, string][]).forEach(
    ([tokenKey, cssVar]) => {
      root.style.setProperty(cssVar, tokens[tokenKey]);
    }
  );
}

export function applyColorPalette(paletteId: ColorPaletteId, isDark: boolean) {
  applyColorPaletteTokens(getPaletteTokens(paletteId, isDark), paletteId);
}

export function clearAppliedColorPalette() {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  delete root.dataset.palette;

  (Object.values(TOKEN_CSS_MAP) as string[]).forEach((cssVar) => {
    root.style.removeProperty(cssVar);
  });
}
