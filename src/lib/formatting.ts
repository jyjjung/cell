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

type NameLike = {
  firstName?: string | null;
  lastName?: string | null;
} | null | undefined;

/** Compact label: "Jane D." when last name exists, otherwise first name only. */
export function formatUserDisplayName(person: NameLike, fallback = 'Someone'): string {
  if (!person?.firstName?.trim()) return fallback;
  const first = person.firstName.trim();
  const last = person.lastName?.trim();
  if (!last) return first;
  const initial = last[0]?.toUpperCase();
  return initial ? `${first} ${initial}.` : first;
}

/** Parse a full name string into "First L." format. */
export function formatNameString(rawName: string | null | undefined, fallback = ''): string {
  if (!rawName?.trim()) return fallback;
  const parts = rawName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export function formatUserListDisplayNames(
  people: Array<NameLike>,
  separator = ', ',
): string {
  return people
    .map((person) => formatUserDisplayName(person, ''))
    .filter(Boolean)
    .join(separator);
}
