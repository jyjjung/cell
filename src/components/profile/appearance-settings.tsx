"use client";

import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  COLOR_PALETTE_LIST,
  COLOR_PALETTES,
  type BackgroundMode,
} from '@/lib/color-palettes';
import { useColorPalette } from '@/contexts/color-palette-context';
import { useTypography } from '@/contexts/typography-context';
import { Switch } from '@/components/ui/switch';
import {
  FONT_FAMILY_GROUPS,
  FONT_SIZE_OPTIONS,
  type FontFamilyChoice,
  type FontSizeChoice,
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
    colors: string;
    background: string;
    scenic: string;
    minimal: string;
    gradient: string;
    typography: string;
    websiteFont: string;
    websiteFontSize: string;
    bibleFont: string;
    bibleFontSize: string;
    glassEffects: string;
    glassEffectsDesc: string;
  };
};

const BACKGROUND_MODES: { id: BackgroundMode; labelKey: 'scenic' | 'minimal' | 'gradient' }[] = [
  { id: 'scenic', labelKey: 'scenic' },
  { id: 'minimal', labelKey: 'minimal' },
  { id: 'gradient', labelKey: 'gradient' },
];

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
        'grid w-full gap-1 rounded-xl border border-border/60 p-1 bg-background/30',
        columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4'
      )}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            'min-h-[var(--app-control-height-sm)] rounded-lg px-1 py-2 text-[length:var(--app-ui-font-xs)] font-semibold leading-tight text-center transition-colors',
            value === option.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
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
    <div className="glass-thin flex flex-col gap-3 app-card-sm rounded-2xl sm:flex-row sm:items-start sm:justify-between">
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
  const {
    paletteId,
    backgroundMode,
    glassEnabled,
    setPaletteId,
    setBackgroundMode,
    setGlassEnabled,
  } = useColorPalette();
  const { typography, setTypography } = useTypography();
  const isDark = resolvedTheme === 'dark';
  const activePalette = COLOR_PALETTES[paletteId];

  return (
    <div className="stack-gap-lg min-w-0">
      <section className="stack-gap min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[length:var(--app-ui-font-sm)] font-medium">{labels.colors}</p>
          <p className="text-[length:var(--app-ui-font-xs)] text-muted-foreground truncate">{activePalette.label}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE_LIST.map((palette) => {
            const selected = paletteId === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => setPaletteId(palette.id)}
                title={palette.label}
                aria-label={palette.label}
                aria-pressed={selected}
                className={cn(
                  'h-9 w-9 rounded-full border-2 transition-all shrink-0',
                  selected
                    ? 'border-primary scale-110 shadow-sm'
                    : 'border-border/50 hover:border-border hover:scale-105'
                )}
                style={{
                  background: isDark ? palette.previewDark : palette.previewLight,
                }}
              />
            );
          })}
        </div>
      </section>

      <section className="stack-gap-sm min-w-0">
        <p className="text-[length:var(--app-ui-font-sm)] font-medium">{labels.background}</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/60 p-1 bg-background/30">
          {BACKGROUND_MODES.map(({ id, labelKey }) => {
            const selected = backgroundMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setBackgroundMode(id)}
                className={cn(
                  'rounded-lg px-1.5 py-2 text-[length:var(--app-ui-font-xs)] font-semibold leading-tight text-center transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={selected}
              >
                {labels[labelKey]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="stack-gap-sm min-w-0">
        <SettingRow label={labels.glassEffects} description={labels.glassEffectsDesc}>
          <Switch checked={glassEnabled} onCheckedChange={setGlassEnabled} aria-label={labels.glassEffects} />
        </SettingRow>
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
          <SettingRow label={labels.bibleFont}>
            <FontSelect
              value={typography.bibleFontFamily}
              onChange={(bibleFontFamily) => setTypography({ bibleFontFamily })}
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
