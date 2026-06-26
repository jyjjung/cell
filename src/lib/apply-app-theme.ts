import type { AppThemeId } from './app-themes';
import { getAppThemeTokens } from './app-themes';
import { applyColorPaletteTokens } from './apply-color-palette';

export function applyAppTheme(themeId: AppThemeId, isDark: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.appTheme = themeId;
  applyColorPaletteTokens(getAppThemeTokens(themeId, isDark), themeId);
}

export function clearAppliedAppTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  delete root.dataset.appTheme;
}
