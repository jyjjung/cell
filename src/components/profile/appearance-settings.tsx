"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { APP_THEME_LIST, appThemePreviewCss, type AppThemeId } from '@/lib/app-themes';
import { useColorPalette } from '@/contexts/color-palette-context';

type AppearanceSettingsProps = {
  labels: {
    colorScheme: string;
    colorSchemeDesc: string;
    light: string;
    dark: string;
    system: string;
    theme: string;
    themeDesc: string;
  };
};

const colorModes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

export function AppearanceSettings({ labels }: AppearanceSettingsProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { themeId, setThemeId } = useColorPalette();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="stack-gap-lg min-w-0">
      <section className="stack-gap-sm min-w-0">
        <div>
          <p className="text-[length:var(--app-ui-font-sm)] font-medium">{labels.colorScheme}</p>
          <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground mt-0.5 leading-snug">
            {labels.colorSchemeDesc}
          </p>
        </div>

        {mounted ? (
          <div className="grid grid-cols-3 gap-2">
            {colorModes.map(({ value, icon: Icon }) => {
              const selected = theme === value;
              const label =
                value === 'light' ? labels.light : value === 'dark' ? labels.dark : labels.system;
              return (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  onClick={() => setTheme(value)}
                  aria-pressed={selected}
                  className={cn(
                    'h-auto min-h-11 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5',
                    selected
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="text-[length:var(--app-ui-font-xs)] font-medium">{label}</span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[4.25rem] rounded-xl border border-border bg-muted/30" />
            ))}
          </div>
        )}
      </section>

      <section className="stack-gap-sm min-w-0">
        <div>
          <p className="text-[length:var(--app-ui-font-sm)] font-medium">{labels.theme}</p>
          <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground mt-0.5 leading-snug">
            {labels.themeDesc}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {APP_THEME_LIST.map((themeOption) => {
            const selected = themeId === themeOption.id;
            return (
              <Button
                key={themeOption.id}
                type="button"
                variant="ghost"
                title={themeOption.label}
                onClick={() => setThemeId(themeOption.id as AppThemeId)}
                aria-label={themeOption.label}
                aria-pressed={selected}
                className={cn(
                  'h-auto min-h-11 flex-col items-center gap-1.5 rounded-xl border p-2.5',
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
                  style={{ background: appThemePreviewCss(themeOption.id, isDark) }}
                >
                  {selected && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-foreground">{themeOption.label}</span>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
