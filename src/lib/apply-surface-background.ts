import {
  getSurfaceBackgroundHsl,
  type SurfaceBackgroundId,
} from '@/lib/surface-backgrounds';

const SURFACE_CSS_VARS = ['--background', '--sidebar-background'] as const;

export function applySurfaceBackground(id: SurfaceBackgroundId, isDark: boolean) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const hsl = getSurfaceBackgroundHsl(id, isDark);

  root.dataset.surfaceBackground = id;
  SURFACE_CSS_VARS.forEach((cssVar) => root.style.setProperty(cssVar, hsl));
}

export function clearAppliedSurfaceBackground() {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  delete root.dataset.surfaceBackground;
  SURFACE_CSS_VARS.forEach((cssVar) => root.style.removeProperty(cssVar));
}
