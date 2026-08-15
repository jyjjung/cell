import { format } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';

export type NdcpcLocale = 'en' | 'ko';

export function getDateFnsLocale(locale: NdcpcLocale) {
  return locale === 'ko' ? ko : enUS;
}

export function formatAppDate(date: Date, pattern: string, locale: NdcpcLocale): string {
  const formatted = format(date, pattern, { locale: getDateFnsLocale(locale) });
  if (locale === 'ko') {
    return formatted.replace(/일요일/g, '주일');
  }
  return formatted;
}
