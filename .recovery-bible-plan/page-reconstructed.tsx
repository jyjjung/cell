"use client";

import { BibleReadingDayCard } from '@/components/bible-plan/bible-reading-day-card';
import { MarkAsReadMenu } from '@/components/bible/mark-as-read-menu';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/loading-spinner';
import { EmptyState, NavPageHeader, PageShell } from '@/components/ui/page-layout';
import { ReadingPlanOverview } from '@/components/bible-plan/reading-plan-overview';
import { ReadingPlanSubpage } from '@/components/bible-plan/reading-plan-subpage';
import { ReadingPlanWeekRow } from '@/components/bible-plan/reading-plan-week-row';
import { HomeGroupList } from '@/components/home/home-grouped-section';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { parseDay } from '@/lib/event-occurrences';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import {
  buildFirstOccurrenceByDisplayText,
  calculatePlanPaceStats,
  calculatePlanProgressToDatePercent,
  countPlanPassageProgress,
  countPlanPassagesDueThrough,
  getWeekPassageKeys,
  isPassageCompletedForPlan,
} from '@/lib/reading-utils';
import { translations } from '@/lib/translations';
import type { DailyReading, WeeklyProgress } from '@/types';
import { endOfWeek, format, isBefore, isValid, isWithinInterval, startOfDay, startOfWeek } from 'date-fns';
import { Info, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ViewState =
  | { view: 'all-weeks' }
  | { view: 'completed-weeks-list'; weeks: WeeklyProgress[] }
  | { view: 'single-week-details'; week: WeeklyProgress };

function generatePassageSummary(readings: DailyReading[]): string {
  const bookChapters: { [book: string]: number[] } = {};

  readings.forEach((reading) => {
    reading.passages.forEach((passage) => {
      if (passage.book && !passage.book.includes('Error')) {
        if (!bookChapters[passage.book]) {
          bookChapters[passage.book] = [];
        }
        if (!bookChapters[passage.book].includes(passage.chapter)) {
          bookChapters[passage.book].push(passage.chapter);
        }
      }
    });
  });

  return Object.entries(bookChapters)
    .map(([book, chapters]) => {
      if (chapters.length === 0) return '';
      chapters.sort((a, b) => a - b);
      if (chapters.length === 1) return `${book} ${chapters[0]}`;
      return `${book} ${chapters[0]}-${chapters[chapters.length - 1]}`;
    })
    .filter((summary) => summary)
    .join(', ');
}

export default function BibleChecklistPage() {
  const { currentUser } = useAuth();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } =
    useUserBibleChecklist();
  const { openBibleReader } = useGlobalBibleReader();

  const [isMounted, setIsMounted] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ view: 'all-weeks' });
  const [isMarkingWeek, setIsMarkingWeek] = useState(false);

  const isGuest = !currentUser;
  const today = useMemo(() => startOfDay(new Date()), []);
  const lang = currentUser?.preferredLanguage || 'en';
  const t = translations[lang];

  const readPassage = useCallback(
    (text: string) => {
      const parsed = parsePassageReferenceForNavigation(text);
      if (parsed) openBibleReader(parsed.book, parsed.chapter);
    },
    [openBibleReader],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const weeklyProgressData = useMemo((): WeeklyProgress[] => {
    if (!plan?.dailyReadings) return [];

    const weeksMap = new Map<string, DailyReading[]>();
    const firstOccurrenceByDisplayText = buildFirstOccurrenceByDisplayText(plan.dailyReadings);

    for (const reading of plan.dailyReadings) {
      try {
        const date = parseDay(reading.date);
        if (!isValid(date)) continue;
        const weekStart = startOfWeek(date, { weekStartsOn: 0 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        if (!weeksMap.has(weekKey)) {
          weeksMap.set(weekKey, []);
        }
        weeksMap.get(weekKey)!.push(reading);
      } catch (e) {
        console.error('Error processing reading for week grouping:', reading, e);
      }
    }

    return Array.from(weeksMap.entries())
      .map(([weekKey, readings], index) => {
        const weekStartDate = parseDay(weekKey);
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 });

        let totalCount = 0;
        let completedCount = 0;

        readings.forEach((reading) => {
          const validPassages =
            reading.passages?.filter((p) => p.displayText && !p.displayText.startsWith('Error:')) || [];
          const numValidPassages = validPassages.length;
          totalCount += numValidPassages;

          if (isGuest) {
            const readingDate = parseDay(reading.date);
            if (isValid(readingDate) && isBefore(readingDate, today)) {
              completedCount += numValidPassages;
            }
          } else {
            completedCount += validPassages.filter((p) =>
              isPassageCompletedForPlan(reading.date, p.displayText, completedPassages, {
                firstOccurrenceByDisplayText,
              }),
            ).length;
          }
        });

        const isCompleted = totalCount > 0 && completedCount === totalCount;
        const isCurrent = isWithinInterval(today, { start: weekStartDate, end: weekEndDate });
        const isOverdue = !isGuest && !isCompleted && isBefore(weekEndDate, today);

        return {
          weekNumber: index + 1,
          startDate: weekStartDate,
          endDate: weekEndDate,
          readings,
          completedCount,
          totalCount,
          progressPercentage: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
          isCompleted,
          isCurrent,
          isOverdue,
          passageSummary: generatePassageSummary(readings),
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [plan, completedPassages, isGuest, today]);

  const overallProgress = useMemo(() => {
    if (!plan?.dailyReadings || loadingChecklist) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    if (isGuest) {
      let total = 0;
      let completed = 0;
      plan.dailyReadings.forEach((day) => {
        const dayDate = parseDay(day.date);
        const validPassages =
          day.passages?.filter((p) => p.displayText && !p.displayText.startsWith('Error:')) || [];
        total += validPassages.length;
        if (isValid(dayDate) && isBefore(dayDate, today)) {
          completed += validPassages.length;
        }
      });
      const percentage = total > 0 ? (completed / total) * 100 : 0;
      return { total, completed, percentage };
    }

    const { total, completed } = countPlanPassageProgress(plan.dailyReadings, completedPassages);
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, percentage };
  }, [plan, completedPassages, loadingChecklist, isGuest, today]);

  const paceStats = useMemo(() => {
    if (!plan?.dailyReadings || isGuest) {
      return { passagesLeft: 0, daysLeft: 0, passagesPerDay: 0, passagesToCatchUp: 0, catchUpPace: 0 };
    }
    return calculatePlanPaceStats(plan.dailyReadings, completedPassages, today);
  }, [plan, completedPassages, today, isGuest]);

  const progressSoFar = useMemo(() => {
    if (!plan?.dailyReadings || loadingChecklist) {
      return { percentage: 0, dueThroughToday: 0, completed: 0 };
    }
    const dueThroughToday = countPlanPassagesDueThrough(plan.dailyReadings, today);

    if (isGuest) {
      let completed = 0;
      plan.dailyReadings.forEach((day) => {
        const dayDate = parseDay(day.date);
        const validPassages =
          day.passages?.filter((p) => p.displayText && !p.displayText.startsWith('Error:')) || [];
        if (isValid(dayDate) && isBefore(dayDate, today)) {
          completed += validPassages.length;
        }
      });
      const percentage =
        dueThroughToday > 0 ? Math.round((completed / dueThroughToday) * 100) : 0;
      return { percentage, dueThroughToday, completed };
    }

    const { completed } = countPlanPassageProgress(plan.dailyReadings, completedPassages);
    const percentage = calculatePlanProgressToDatePercent(
      plan.dailyReadings,
      completedPassages,
      today,
    );
    return { percentage, dueThroughToday, completed };
  }, [plan, completedPassages, today, isGuest, loadingChecklist]);

  const { completedWeeks, currentWeek, futureWeeks } = useMemo(() => {
    const completed: WeeklyProgress[] = [];
    const upcoming: WeeklyProgress[] = [];
    let consecutive = true;
    weeklyProgressData.forEach((week) => {
      if (week.isCompleted && consecutive) {
        completed.push(week);
      } else {
        consecutive = false;
        upcoming.push(week);
      }
    });
    const current = upcoming.find((week) => week.isCurrent) ?? null;
    const future = upcoming.filter((week) => !week.isCurrent);
    return { completedWeeks: completed, currentWeek: current, futureWeeks: future };
  }, [weeklyProgressData]);

  const activeWeekDetails = useMemo(() => {
    if (viewState.view !== 'single-week-details') return null;
    return (
      weeklyProgressData.find((week) => week.weekNumber === viewState.week.weekNumber) ?? viewState.week
    );
  }, [viewState, weeklyProgressData]);

  const openWeek = useCallback((week: WeeklyProgress) => {
    setViewState({ view: 'single-week-details', week });
  }, []);

  if (!isMounted || planLoading) {
    return <PageLoading />;
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
      <PageShell>
        <EmptyState icon={Info} title={t.noPlanAvailable} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {viewState.view === 'single-week-details' && activeWeekDetails ? (
        <ReadingPlanSubpage
          title={`${t.week} ${activeWeekDetails.weekNumber}`}
          meta={`${format(activeWeekDetails.startDate, 'MMM d')} – ${format(activeWeekDetails.endDate, 'MMM d, yyyy')}`}
          backLabel={t.back}
          onBack={() => setViewState({ view: 'all-weeks' })}
          action={
            !isGuest && activeWeekDetails.totalCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 rounded-xl text-xs font-semibold"
                disabled={isMarkingWeek}
                onClick={async () => {
                  const keys = getWeekPassageKeys(activeWeekDetails.readings);
                  if (keys.length === 0) return;
                  setIsMarkingWeek(true);
                  try {
                    await markMultiplePassages(keys, !activeWeekDetails.isCompleted);
                  } finally {
                    setIsMarkingWeek(false);
                  }
                }}
              >
                {isMarkingWeek ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                {activeWeekDetails.isCompleted ? t.markWeekAsUnread : t.markWeekAsRead}
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {activeWeekDetails.readings
              .slice()
              .sort((a, b) => parseDay(a.date).getTime() - parseDay(b.date).getTime())
              .map((reading) => {
                const parsedDate = parseDay(reading.date);
                if (!isValid(parsedDate)) return null;
                const validCount =
                  reading.passages?.filter((p) => p.displayText && !p.displayText.startsWith('Error:'))
                    .length ?? 0;

                return (
                  <BibleReadingDayCard
                    key={reading.date}
                    reading={validCount > 0 ? reading : null}
                    parsedDate={parsedDate}
                    lang={lang}
                    completedPassages={completedPassages}
                    planDailyReadings={plan.dailyReadings}
                    emptyMessage={validCount === 0 ? t.restDayMessage : undefined}
                    showCheckboxes={!isGuest}
                    onToggle={isGuest ? undefined : togglePassageCompletion}
                    onRead={readPassage}
                    markMultiplePassages={isGuest ? undefined : markMultiplePassages}
                    markDayReadLabel={t.markDayAsRead}
                    markDayUnreadLabel={t.markDayAsUnread}
                  />
                );
              })}
          </div>
          <BackToTopButton />
        </ReadingPlanSubpage>
      ) : null}

      {viewState.view === 'completed-weeks-list' ? (
        <ReadingPlanSubpage
          title={`${t.completed} ${t.allWeeks}`}
          backLabel={t.back}
          onBack={() => setViewState({ view: 'all-weeks' })}
        >
          <div className="ui-card-flat overflow-hidden">
            <HomeGroupList>
              {viewState.weeks.map((week) => (
                <ReadingPlanWeekRow
                  key={week.weekNumber}
                  week={week}
                  lang={lang}
                  isGuest={isGuest}
                  variant="completed"
                  onClick={() => openWeek(week)}
                />
              ))}
            </HomeGroupList>
          </div>
          <BackToTopButton />
        </ReadingPlanSubpage>
      ) : null}

      {viewState.view === 'all-weeks' ? (
        <>
          <NavPageHeader
            className="flex-row items-center justify-between gap-3"
            action={
              !isGuest && plan.dailyReadings ? (
                <MarkAsReadMenu lang={lang} dailyReadings={plan.dailyReadings} />
              ) : undefined
            }
          />

          <ReadingPlanOverview
            lang={lang}
            overallProgress={overallProgress}
            progressSoFar={progressSoFar}
            paceStats={paceStats}
            isGuest={isGuest}
            currentWeek={currentWeek}
            completedWeeks={completedWeeks}
            futureWeeks={futureWeeks}
            onOpenWeek={openWeek}
            onOpenCompletedWeeks={() =>
              setViewState({ view: 'completed-weeks-list', weeks: completedWeeks })
            }
          />

          <BackToTopButton />
        </>
      ) : null}
    </PageShell>
  );
}
