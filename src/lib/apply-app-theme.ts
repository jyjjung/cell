import type { AppThemeId } from './app-themes';
import { DEFAULT_APP_THEME_ID } from './app-themes';
import { getAppThemeTokens } from './app-themes';
import { applyColorPaletteTokens } from './apply-color-palette';

/**
 * Apply appearance tokens on <html>. Skip when the stylesheet already matches
 * (classic + dark, no prior custom theme) so we don't mutate the DOM during
 * hydration — Sentry Replay treats those writes as hydration errors.
 */
export function applyAppTheme(themeId: AppThemeId, isDark: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const mode = isDark ? 'dark' : 'light';
  if (root.dataset.appTheme === themeId && root.dataset.appThemeMode === mode) {
    return;
  }

  const stylesheetAlreadyMatches =
    themeId === DEFAULT_APP_THEME_ID && isDark && !root.dataset.appTheme;
  if (stylesheetAlreadyMatches) {
    return;
  }

  root.dataset.appTheme = themeId;
  root.dataset.appThemeMode = mode;
  applyColorPaletteTokens(getAppThemeTokens(themeId, isDark), themeId);
}
