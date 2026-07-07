"use client";

import { useMemo, useCallback } from 'react';
import { format, startOfToday } from 'date-fns';
import { Loader2, BookOpenText } from 'lucide-react';
import Link from 'next/link';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { useAuth } from '@/contexts/auth-context';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parseQtPassageForNavigation } from '@/lib/bible-navigation';
import { translations } from '@/lib/translations';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export default function TodayQtWidget() {
  const { currentUser, loadingAuth } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { roster, loading: rosterLoading } = useQTRoster();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const { openBibleReader } = useGlobalBibleReader();

  const todayStr = format(startOfToday(), 'yyyy-MM-dd');

  const todayEntry = useMemo(
    () => roster.find((entry) => entry.date === todayStr),
    [roster, todayStr],
  );

  const sharerName = useMemo(() => {
    if (!todayEntry) return null;
    const user = todayEntry.userId ? allUsers.find((u) => u.uid === todayEntry.userId) : undefined;
    if (todayEntry.personName) return formatNameString(todayEntry.personName, t.member);
    return formatUserDisplayName(user, t.member);
  }, [todayEntry, allUsers, t.member]);

  const passageIsClickable = useMemo(
    () => !!(todayEntry?.passage && parseQtPassageForNavigation(todayEntry.passage)),
    [todayEntry?.passage],
  );

  const handlePassageClick = useCallback(() => {
    if (!todayEntry?.passage) return;
    const parsed = parseQtPassageForNavigation(todayEntry.passage);
    if (parsed) openBibleReader(parsed.book, parsed.chapter);
  }, [todayEntry?.passage, openBibleReader]);

  const loading = rosterLoading || usersLoading || loadingAuth;

  return (
    <div className="space-y-2 border-b border-border/50 pb-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-eyebrow">{t.todaysQt}</p>
        <Link href="/qt" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          {t.qtRoster}
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center py-1">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground opacity-40" />
        </div>
      ) : !todayEntry ? (
        <p className="text-sm text-muted-foreground">{t.noQtToday}</p>
      ) : (
        <div className="space-y-1.5">
          {todayEntry.title && (
            <p className="text-sm font-semibold leading-snug text-foreground">{todayEntry.title}</p>
          )}
          {sharerName && (
            <p className="text-stat-label">{sharerName}</p>
          )}
          {todayEntry.passage ? (
            passageIsClickable ? (
              <button
                type="button"
                onClick={handlePassageClick}
                className={cn(
                  'group inline-flex max-w-full items-center gap-1.5 rounded-md border border-primary/10 bg-primary/5 px-2 py-0.5',
                  'text-left transition-colors hover:border-primary/25 hover:bg-primary/10',
                )}
              >
                <span className="truncate font-mono text-xs font-medium text-primary">{todayEntry.passage}</span>
                <BookOpenText className="h-3 w-3 shrink-0 text-primary/40 transition-opacity group-hover:text-primary/70" />
              </button>
            ) : (
              <span className="inline-flex max-w-full rounded-md border border-primary/10 bg-primary/5 px-2 py-0.5 font-mono text-xs font-medium text-primary">
                {todayEntry.passage}
              </span>
            )
          ) : (
            <p className="text-sm text-muted-foreground">{t.noPassageAssigned}</p>
          )}
        </div>
      )}
    </div>
  );
}
