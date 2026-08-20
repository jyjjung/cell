import { describe, expect, it } from 'vitest';
import { getAppThemeInlineScript } from './app-theme-inline-script';
import { DEFAULT_APP_THEME_ID } from './app-themes';

describe('getAppThemeInlineScript', () => {
  it('skips DOM writes for the default classic dark theme', () => {
    const script = getAppThemeInlineScript();
    expect(script).toContain(`id==="${DEFAULT_APP_THEME_ID}"&&isDark`);
    expect(script).toContain('data-app-theme');
  });
});
