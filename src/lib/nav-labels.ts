import { translations } from '@/lib/translations';

type TranslationKey = keyof typeof translations.en;

/** Route → translation key. Keep in sync with sidebar navigation labels. */
const routeNavLabelKeys: Partial<Record<string, TranslationKey>> = {
  '/': 'home',
  '/chat': 'chat',
  '/chat/photos': 'allPhotos',
  '/chat/links': 'allLinks',
  '/bible-checklist': 'readingPlan',
  '/full-plan': 'fullPlan',
  '/memorize': 'memoryVerses',
  '/leaderboard': 'communityProgress',
  '/members': 'members',
  '/events': 'schedule',
  '/qt': 'qtRoster',
  '/cleaning-roster': 'cleaningRoster',
  '/announcements': 'announcements',
  '/notifications': 'notifications',
  '/profile': 'profile',
  '/admin': 'admin',
  '/worship': 'worshipPortal',
  '/media': 'links',
  '/docs': 'docs',
  '/prayer-requests': 'prayerRequests',
  '/feedback': 'feedback',
  '/features': 'features',
  '/apps': 'allApps',
  '/rosters': 'schedule',
};

export function getNavLabelForPath(
  pathname: string,
  lang: keyof typeof translations = 'en',
): string {
  const t = translations[lang];
  const key = routeNavLabelKeys[pathname];
  if (key) return t[key] as string;

  if (pathname.startsWith('/chat/')) return t.chat as string;
  if (pathname.startsWith('/docs/')) return t.docs as string;
  if (pathname.startsWith('/admin/')) return t.admin as string;
  if (pathname.startsWith('/members/')) return t.members as string;

  const segment = pathname.split('/').filter(Boolean).pop();
  if (!segment) return t.home as string;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
