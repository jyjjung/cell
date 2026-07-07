"use client";

import { useMemo, useCallback } from 'react';
import { format, startOfToday } from 'date-fns';
import { Loader2, ArrowRight, BookOpenText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { useAuth } from '@/contexts/auth-context';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parseQtPassageForNavigation } from '@/lib/bible-navigation';
import { translations } from '@/lib/translations';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TodayQtWidget() {
  const { currentUser, loadingAuth } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { roster, loading: rosterLoading } = useQTRoster();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
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

  const handleGoToQt = () => {
    setIsPageLoading(true);
    router.push('/qt');
  };

  const loading = rosterLoading || usersLoading || loadingAuth;

  return (
    <div className="widget-surface relative flex h-full flex-col">
      <div className="panel-header">
        <div className="min-w-0">
          <h3 className="panel-title">{t.todaysQt}</h3>
          <p className="panel-subtitle">{t.qtSharing}</p>
        </div>
      </div>

      <div className="flex-grow">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-40" />
          </div>
        ) : !todayEntry ? (
          <div className="flex flex-col items-start gap-1 py-2">
            <p className="text-sm font-medium text-foreground">{t.noQtToday}</p>
            <p className="text-sm text-muted-foreground">{t.nothingPlannedToday}</p>
          </div>
        ) : (
          <div className="stack-gap-sm">
            {sharerName && (
              <p className="text-micro-label text-muted-foreground">{sharerName}</p>
            )}
            {todayEntry.title && (
              <p className="text-sm font-semibold leading-snug text-foreground">{todayEntry.title}</p>
            )}
            {todayEntry.passage ? (
              passageIsClickable ? (
                <button
                  type="button"
                  onClick={handlePassageClick}
                  className={cn(
                    'group inline-flex items-center gap-2 rounded-md border border-primary/10 bg-primary/5 px-2.5 py-1',
                    'text-left transition-colors hover:border-primary/25 hover:bg-primary/10',
                  )}
                >
                  <span className="font-mono text-sm font-medium text-primary">{todayEntry.passage}</span>
                  <BookOpenText className="h-3.5 w-3.5 shrink-0 text-primary/40 transition-opacity group-hover:text-primary/70" />
                </button>
              ) : (
                <div className="inline-flex rounded-md border border-primary/10 bg-primary/5 px-2.5 py-1">
                  <span className="font-mono text-sm font-medium text-primary">{todayEntry.passage}</span>
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">{t.noPassageAssigned}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <Button variant="outline" size="sm" className="w-full" onClick={handleGoToQt}>
          {t.qtRoster}
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
