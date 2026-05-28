export type AppLocale = 'en' | 'ko';

const LOCALE_MAP: Record<AppLocale, string> = {
  en: 'en-US',
  ko: 'ko-KR',
};

export function getAppLocale(preferredLanguage?: string | null): AppLocale {
  return preferredLanguage === 'ko' ? 'ko' : 'en';
}

export function formatAppDateTime(
  value: Date | null | undefined,
  locale: AppLocale = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return 'Not yet';
  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  return new Intl.DateTimeFormat(LOCALE_MAP[locale], options ?? defaults).format(value);
}

export function formatAppDate(
  value: Date | null | undefined,
  locale: AppLocale = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return 'Not yet';
  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Intl.DateTimeFormat(LOCALE_MAP[locale], options ?? defaults).format(value);
}

const STATUS_LABELS: Record<string, Record<AppLocale, string>> = {
  completed: { en: 'Completed', ko: '완료' },
  'in-progress': { en: 'In Progress', ko: '진행 중' },
  pending: { en: 'Pending', ko: '대기 중' },
};

export function getStatusLabel(status: string, locale: AppLocale = 'en'): string {
  return STATUS_LABELS[status]?.[locale] ?? STATUS_LABELS.pending[locale];
}
