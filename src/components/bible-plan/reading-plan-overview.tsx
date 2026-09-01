'use client';

import { PlanCombinedProgressBar, PlanPaceList } from '@/components/bible-plan/plan-progress';
import {
  ReadingPlanCompletedWeeksSummary,
  ReadingPlanWeekRow,
} from '@/components/bible-plan/reading-plan-week-row';
import {
  HomeGroupList,
  HomeGroupedSection,
} from '@/components/home/home-grouped-section';
import { translations } from '@/lib/translations';
import type { WeeklyProgress } from '@/types';

type Lang = keyof typeof translations;

type OverviewProps = {
  lang: Lang;
  overallProgress: { percentage: number; completed: number; total: number };
  progressSoFar: { percentage: number; dueThroughToday: number; completed: number };
  paceStats: {
    passagesLeft: number;
    daysLeft: number;
    passagesPerDay: number;
  };
  isGuest?: boolean;
  currentWeek: WeeklyProgress | null;
  completedWeeks: WeeklyProgress[];
  futureWeeks: WeeklyProgress[];
  onOpenWeek: (week: WeeklyProgress) => void;
  onOpenCompletedWeeks: () => void;
};

/** Reading plan overview — grouped inset lists (HIG Settings style). */
export function ReadingPlanOverview({
  lang,
  overallProgress,
  progressSoFar,
  paceStats,
  isGuest = false,
  currentWeek,
  completedWeeks,
  futureWeeks,
  onOpenWeek,
  onOpenCompletedWeeks,
}: OverviewProps) {
  const t = translations[lang];
  const behind = !isGuest && paceStats.passagesLeft > 0;
  const hasWeeks =
    currentWeek != null || completedWeeks.length > 0 || futureWeeks.length > 0;

  const paceItems = !isGuest
    ? [
        {
          label: t.progressSoFar,
          value: `${Math.round(progressSoFar.percentage)}%`,
        },
        {
          label: t.overallProgress,
          value: `${overallProgress.completed.toLocaleString()} / ${overallProgress.total.toLocaleString()}`,
        },
        { label: t.daysLeft, value: paceStats.daysLeft },
        ...(behind
          ? [
              { label: t.passagesLeft, value: paceStats.passagesLeft },
              {
                label: t.avgPerDay,
                value: paceStats.passagesPerDay,
                unit: t.passages,
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <HomeGroupedSection id="reading-plan-progress" title={t.planPace}>
        <div className="px-4 py-3">
          <PlanCombinedProgressBar
            completed={overallProgress.completed}
            dueThroughToday={progressSoFar.dueThroughToday}
            total={overallProgress.total}
            progressSoFarPercent={progressSoFar.percentage}
            progressSoFarLabel={t.progressSoFar}
            legendRead={t.planProgressLegendRead}
            legendDue={t.planProgressLegendDue}
            legendUpcoming={t.planProgressLegendUpcoming}
            showLegend={isGuest}
          />
        </div>
        {!isGuest ? <PlanPaceList items={paceItems} className="px-4" /> : null}
      </HomeGroupedSection>

      {hasWeeks ? (
        <HomeGroupedSection id="reading-plan-weeks" title={t.weeklyBreakdown}>
          <HomeGroupList>
            {currentWeek ? (
              <ReadingPlanWeekRow
                week={currentWeek}
                lang={lang}
                isGuest={isGuest}
                variant="current"
                onClick={() => onOpenWeek(currentWeek)}
              />
            ) : null}

            {completedWeeks.length > 0 ? (
              <ReadingPlanCompletedWeeksSummary
                weeks={completedWeeks}
                lang={lang}
                onClick={onOpenCompletedWeeks}
              />
            ) : null}

            {futureWeeks.map((week) => (
              <ReadingPlanWeekRow
                key={week.weekNumber}
                week={week}
                lang={lang}
                isGuest={isGuest}
                onClick={() => onOpenWeek(week)}
              />
            ))}
          </HomeGroupList>
        </HomeGroupedSection>
      ) : null}
    </div>
  );
}

/** @deprecated Use ReadingPlanOverview */
export const ReadingPlanPaceCard = ReadingPlanOverview;
