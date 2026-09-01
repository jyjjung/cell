'use client';

import { useMemo, useCallback } from 'react';
import {
  differenceInDays,
  endOfWeek,
  format,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfToday,
  startOfWeek,
} from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import type { AppUser } from '@/types';
import { translations } from '@/lib/translations';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { makeManualPassageKey } from '@/lib/passage-keys';
import {
  calculatePlanProgressToDatePercent,
  countPlanPassageProgress,
  countPlanPassagesDueThrough,
  findNextUnreadReading,
  findTodaysReading,
  isPassageCompletedForPlan,
} from '@/lib/reading-utils';
import { parseDay } from '@/lib/event-occurrences';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ReadingCheckRow } from '@/components/bible-plan/plan-progress';
import { HomeGroupedSection } from '@/components/home/home-grouped-section';
import { Skeleton } from '@/components/ui/skeleton';
import type { DailyReading } from '@/types';

interface HomeBibleSectionProps {
  currentUser: AppUser;
}

function formatWeekRange(start: Date, end: Date, lang: string) {
  const locale = lang === 'ko' ? ko : enUS;
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, 'MMM d', { locale })} – ${format(end, 'd', { locale })}`;
  }
  return `${format(start, 'MMM d', { locale })} – ${format(end, 'MMM d', { locale })}`;
}

function getCurrentPlanWeek(dailyReadings: DailyReading[] | undefined, today: Date) {
  if (!dailyReadings?.length) return null;

  const weeksMap = new Map<string, DailyReading[]>();
  for (const reading of dailyReadings) {
    const date = parseDay(reading.date);
    if (!isValid(date)) continue;
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const bucket = weeksMap.get(weekKey);
    if (bucket) bucket.push(reading);
    else weeksMap.set(weekKey, [reading]);
  }

  const weeks = Array.from(weeksMap.entries())
    .map(([weekKey, readings]) => {
      const startDate = parseDay(weekKey);
      return {
        startDate,
        endDate: endOfWeek(startDate, { weekStartsOn: 0 }),
        readings,
      };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((week, index) => ({ ...week, weekNumber: index + 1 }));

  return (
    weeks.find((week) => isWithinInterval(today, { start: week.startDate, end: week.endDate })) ??
    weeks[weeks.length - 1] ??
    null
  );
}

export function HomeBibleSection({ currentUser }: HomeBibleSectionProps) {
  const lang = currentUser.preferredLanguage || 'en';
  const t = translations[lang];
  const locale = lang === 'ko' ? ko : enUS;
  const today = startOfToday();

  const { plan } = useBiblePlan();
  const { completedPassages, togglePassageCompletion } = useUserBibleChecklist();
  const { openBibleReader } = useGlobalBibleReader();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const go = useCallback(
    (path: string) => {
      setIsPageLoading(true);
      router.push(path);
    },
    [router, setIsPageLoading],
  );

  const readPassage = useCallback(
    (text: string) => {
      const parsed = parsePassageReferenceForNavigation(text);
      if (parsed) openBibleReader(parsed.book, parsed.chapter);
    },
    [openBibleReader],
  );

  const todaysReading = useMemo(
    () => (plan?.dailyReadings ? findTodaysReading(plan.dailyReadings) : null),
    [plan],
  );
  const nextUnread = useMemo(
    () =>
      plan?.dailyReadings ? findNextUnreadReading(plan.dailyReadings, completedPassages, today) : null,
    [plan, completedPassages, today],
  );

  const todayPassages = useMemo(
    () => todaysReading?.passages.filter((p) => p.displayText && !p.displayText.startsWith('Error:')) || [],
    [todaysReading],
  );

  const progressSoFar = useMemo(() => {
    if (!plan?.dailyReadings) {
      return { percentage: 0, dueThroughToday: 0, completed: 0 };
    }
    const dueThroughToday = countPlanPassagesDueThrough(plan.dailyReadings, today);
    const { completed } = countPlanPassageProgress(plan.dailyReadings, completedPassages);
    const percentage = calculatePlanProgressToDatePercent(
      plan.dailyReadings,
      completedPassages,
      today,
    );
    return { percentage, dueThroughToday, completed };
  }, [plan?.dailyReadings, completedPassages, today]);

  const currentWeek = useMemo(
    () => getCurrentPlanWeek(plan?.dailyReadings, today),
    [plan?.dailyReadings, today],
  );

  const daysLeft = useMemo(() => {
    if (!plan?.dailyReadings?.length) return null;
    const last = parseISO(plan.dailyReadings[plan.dailyReadings.length - 1].date);
    return isValid(last) ? Math.max(0, differenceInDays(last, startOfDay(new Date()))) : null;
  }, [plan]);

  const nextMissedPassage = useMemo(() => {
    if (!nextUnread) return null;
    const passages =
      nextUnread.passages?.filter((p) => p.displayText && !p.displayText.startsWith('Error:')) || [];
    return (
      passages.find((passage) => {
        const date = nextUnread.date;
        return !isPassageCompletedForPlan(date, passage.displayText, completedPassages, {
          dailyReadings: plan?.dailyReadings,
        });
      }) ?? null
    );
  }, [nextUnread, completedPassages, plan?.dailyReadings]);

  const dayLabel = format(today, 'EEEE', { locale }).toUpperCase();
  const dateLabel = format(today, lang === 'ko' ? 'yyyy.MM.dd' : 'dd/MM/yyyy', { locale });
  const weekLabel = currentWeek
    ? `${t.week.toUpperCase()} ${currentWeek.weekNumber} · ${formatWeekRange(currentWeek.startDate, currentWeek.endDate, lang)}`
    : null;

  const ratioLabel = progressSoFar.dueThroughToday > 0
    ? `${progressSoFar.completed.toLocaleString()}/${progressSoFar.dueThroughToday.toLocaleString()}`
    : null;

  return (
    <HomeGroupedSection id="home-bible-heading" title={t.bibleReadingHub}>
        <div className="home-bible-hero">
          <p className="home-bible-week">
            {weekLabel ?? t.bibleReadingHub}
          </p>

          <div className="home-bible-hero-main">
            <div className="home-bible-day-block">
              <p className="home-bible-day">{dayLabel}</p>
              <p className="home-bible-date">{dateLabel}</p>
              {daysLeft != null ? (
                <p className="home-bible-pace">
                  {daysLeft} {t.daysLeftLabel}
                </p>
              ) : null}
            </div>

            <div className="home-bible-ring-block">
              <ProgressRing value={progressSoFar.percentage} size={54} strokeWidth={3.5} />
              {ratioLabel ? <p className="home-bible-ratio">{ratioLabel}</p> : null}
            </div>
          </div>
        </div>

        {todayPassages.length > 0 || nextMissedPassage ? (
          <div className="reading-check-table">
            {todayPassages.map((p) => {
              const date = todaysReading?.date;
              const done = date
                ? isPassageCompletedForPlan(date, p.displayText, completedPassages, {
                    dailyReadings: plan?.dailyReadings,
                  })
                : completedPassages.includes(makeManualPassageKey(p.displayText));
              return (
                <ReadingCheckRow
                  key={p.displayText}
                  label={p.displayText}
                  done={done}
                  animate={false}
                  onToggle={() => togglePassageCompletion(p.displayText, todaysReading?.date)}
                  onRead={() => readPassage(p.displayText)}
                />
              );
            })}
            {nextMissedPassage ? (
              <ReadingCheckRow
                lead={t.missedReading}
                label={nextMissedPassage.displayText}
                animate={false}
                onToggle={() =>
                  togglePassageCompletion(nextMissedPassage.displayText, nextUnread?.date)
                }
                onRead={() => readPassage(nextMissedPassage.displayText)}
              />
            ) : null}
          </div>
        ) : (
          <p className="home-bible-empty">{t.restDayMessage}</p>
        )}

        <div className="home-bible-footer">
          <button
            type="button"
            className="home-bible-footer-link"
            onClick={() => go('/bible-checklist')}
          >
            {t.fullPlanLink}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
    </HomeGroupedSection>
  );
}

export function HomeBibleSectionSkeleton() {
  return (
    <HomeGroupedSection
      id="home-bible-heading-skeleton"
      title={<Skeleton className="h-3 w-24" />}
    >
        <div className="home-bible-hero">
          <Skeleton className="h-3 w-40" />
          <div className="home-bible-hero-main">
            <div className="space-y-2">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-[54px] w-[54px] rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
        <div className="reading-check-table">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="reading-check-row">
              <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
              <Skeleton className="h-3.5 w-44" />
            </div>
          ))}
        </div>
        <div className="home-bible-footer">
          <Skeleton className="mx-auto h-4 w-20" />
        </div>
    </HomeGroupedSection>
  );
}

