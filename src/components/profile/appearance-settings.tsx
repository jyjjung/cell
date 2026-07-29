"use client";

import { useTheme } from 'next-themes';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_THEME_LIST, appThemePreviewCss, type AppThemeId } from '@/lib/app-themes';
import { useColorPalette } from '@/contexts/color-palette-context';
import { useTypography } from '@/contexts/typography-context';
import {
  FONT_FAMILY_GROUPS,
  FONT_SIZE_OPTIONS,
  type FontFamilyChoice,
} from '@/lib/typography-preferences';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type AppearanceSettingsProps = {
  labels: {
    theme: string;
    themeDesc: string;
    typography: string;
    websiteFont: string;
    websiteFontSize: string;
    bibleFontSize: string;
  };
};

function OptionToggle<T extends string>({
  options,
  value,
  onChange,
  getLabel,
  columns = 4,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  getLabel?: (option: { id: T; label: string }) => string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        'grid w-full gap-1 rounded-lg border border-input bg-background p-1',
        columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4',
      )}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            'min-h-9 rounded-md px-1 py-2 text-[length:var(--app-ui-font-xs)] font-semibold leading-tight text-center transition-colors',
            value === option.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
          )}
          aria-pressed={value === option.id}
        >
          {getLabel ? getLabel(option) : option.label}
        </button>
      ))}
    </div>
  );
}

function FontSelect({
  value,
  onChange,
}: {
  value: FontFamilyChoice;
  onChange: (font: FontFamilyChoice) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as FontFamilyChoice)}>
      <SelectTrigger className="w-full rounded-xl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl max-h-72">
        {FONT_FAMILY_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.fonts.map((font) => (
              <SelectItem key={font.id} value={font.id}>
                {font.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function SettingRow({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="setting-row">
      <div className="min-w-0 shrink-0 sm:max-w-[45%]">
        <p className="text-[length:var(--app-ui-font-sm)] font-medium">{label}</p>
        {description ? (
          <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground mt-1 leading-snug">{description}</p>
        ) : null}
      </div>
      <div className="w-full min-w-0 sm:w-auto sm:max-w-[55%] sm:flex sm:justify-end">{children}</div>
    </div>
  );
}

export function AppearanceSettings({ labels }: AppearanceSettingsProps) {
  const { resolvedTheme } = useTheme();
  const { themeId, setThemeId } = useColorPalette();
  const { typography, setTypography } = useTypography();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="stack-gap min-w-0">
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

      <section className="stack-gap-sm min-w-0">
        <p className="text-[length:var(--app-ui-font-sm)] font-medium">{labels.typography}</p>
        <div className="stack-gap-sm">
          <SettingRow label={labels.websiteFont}>
            <FontSelect
              value={typography.appFontFamily}
              onChange={(appFontFamily) => setTypography({ appFontFamily })}
            />
          </SettingRow>
          <SettingRow label={labels.websiteFontSize}>
            <OptionToggle
              options={FONT_SIZE_OPTIONS}
              value={typography.appFontSize}
              onChange={(appFontSize) => setTypography({ appFontSize })}
            />
          </SettingRow>
          <SettingRow label={labels.bibleFontSize}>
            <OptionToggle
              options={FONT_SIZE_OPTIONS}
              value={typography.bibleFontSize}
              onChange={(bibleFontSize) => setTypography({ bibleFontSize })}
            />
          </SettingRow>
        </div>
      </section>
    </div>
  );
}
