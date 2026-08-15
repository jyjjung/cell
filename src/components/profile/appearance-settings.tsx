"use client";

import { useTheme } from 'next-themes';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_THEME_LIST, appThemePreviewCss, type AppThemeId } from '@/lib/app-themes';
import { useColorPalette } from '@/contexts/color-palette-context';

type AppearanceSettingsProps = {
  labels: {
    theme: string;
    themeDesc: string;
  };
};

export function AppearanceSettings({ labels }: AppearanceSettingsProps) {
  const { resolvedTheme } = useTheme();
  const { themeId, setThemeId } = useColorPalette();
  const isDark = resolvedTheme === 'dark';

  return (
    <section className="stack-gap-sm min-w-0">
      <div>
        <p className="text-[length:var(--app-ui-font-sm)] font-medium">{labels.theme}</p>
        <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground mt-0.5 leading-snug">
          {labels.themeDesc}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {APP_THEME_LIST.map((theme) => {
          const selected = themeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              title={theme.label}
              onClick={() => setThemeId(theme.id as AppThemeId)}
              aria-label={theme.label}
              aria-pressed={selected}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-colors',
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:bg-muted/40',
              )}
            >
              <div
                className={cn(
                  'relative size-8 rounded-full',
                  selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                style={{ background: appThemePreviewCss(theme.id, isDark) }}
              >
                {selected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-foreground">{theme.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
