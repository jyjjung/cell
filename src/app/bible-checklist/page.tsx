
"use client";

import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import MarkRangeReadDialog from '@/components/bible/mark-range-read-dialog';
import ReadingHeatmap from '@/components/dashboard-widgets/reading-heatmap';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { PageLoading } from '@/components/ui/loading-spinner';
import { NavPageHeader, PageHeader, PageSection } from '@/components/ui/page-layout';
import { PlanProgressBar } from '@/components/bible-plan/plan-progress';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { parseDay } from '@/lib/event-occurrences';
import { makePassageKey } from '@/lib/passage-keys';
import { calculatePlanPaceStats, calculatePlanProgressToDatePercent, countPlanPassageProgress, countPlanPassagesDueThrough } from '@/lib/reading-utils';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { DailyReading, WeeklyProgress } from '@/types';
import { endOfWeek, format, isBefore, isValid, isWithinInterval, startOfDay, startOfWeek } from 'date-fns';
import { ArrowLeft, BookUp, CheckCircle, Info, MoreVertical } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ViewState = 
  | { view: 'all-weeks' }
  | { view: 'completed-weeks-list'; weeks: WeeklyProgress[] }
  | { view: 'single-week-details'; week: WeeklyProgress };

function PaceStatCard({
  title,
  value,
  unit,
  description,
  tone = 'primary',
}: {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  tone?: 'primary' | 'chart-2' | 'chart-3' | 'chart-4';
}) {
  const toneClass =
    tone === 'chart-2' ? 'text-chart-2' :
    tone === 'chart-3' ? 'text-chart-3' :
    tone === 'chart-4' ? 'text-chart-4' :
    'text-primary';

  return (
    <div className="ui-metric">
      <div className="mb-2">
        <p className="text-micro-label">{title}</p>
      </div>
      <div>
        <p className={cn("text-stat-value", toneClass)}>
          {value}{' '}
          {unit && <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>}
        </p>
        {description && (
          <p className="mt-1 text-micro-label">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BibleChecklistPage() {
  const { currentUser } = useAuth();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();

  const [isMounted, setIsMounted] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ view: 'all-weeks' });
  const [isMarkRangeDialogOpen, setIsMarkRangeDialogOpen] = useState(false);
  
  const isGuest = !currentUser;
  const today = useMemo(() => startOfDay(new Date()), []);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);
  
  const weeklyProgressData = useMemo((): WeeklyProgress[] => {
    if (!plan?.dailyReadings) return [];

    const generatePassageSummary = (readings: DailyReading[]): string => {
        const bookChapters: { [book: string]: number[] } = {};

        readings.forEach(reading => {
            reading.passages.forEach(passage => {
                if (passage.book && !passage.book.includes("Error")) {
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
            .filter(summary => summary)
            .join(', ');
    };

    
    const weeksMap = new Map<string, DailyReading[]>();

    for (const reading of plan.dailyReadings) {
      try {
        const date = parseDay(reading.date);
        if (!isValid(date)) continue;
        const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        if (!weeksMap.has(weekKey)) {
          weeksMap.set(weekKey, []);
        }
        weeksMap.get(weekKey)!.push(reading);
      } catch (e) {
        console.error("Error processing reading for week grouping:", reading, e);
      }
    }
    
    return Array.from(weeksMap.entries())
      .map(([weekKey, readings], index) => {
        const weekStartDate = parseDay(weekKey);
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 });

        let totalCount = 0;
        let completedCount = 0;

        readings.forEach(reading => {
            const validPassages = reading.passages?.filter(p => p.displayText && !p.displayText.startsWith("Error:")) || [];
            const numValidPassages = validPassages.length;
            totalCount += numValidPassages;
            
            if (isGuest) {
              const readingDate = parseDay(reading.date);
              if (isValid(readingDate) && isBefore(readingDate, today)) {
                  completedCount += numValidPassages;
              }
            } else {
              completedCount += validPassages.filter((p) =>
                completedPassages.includes(makePassageKey(reading.date, p.displayText))
              ).length;
            }
        });

        const isCompleted = totalCount > 0 && completedCount === totalCount;
        const isCurrent = isWithinInterval(today, { start: weekStartDate, end: weekEndDate });
        const isOverdue = !isGuest && !isCompleted && isBefore(weekEndDate, today);
        const passageSummary = generatePassageSummary(readings);


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
          passageSummary,
        };
      })
      .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
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
    if (!plan?.dailyReadings || isGuest || loadingChecklist) {
      return { percentage: 0, dueThroughToday: 0 };
    }
    const dueThroughToday = countPlanPassagesDueThrough(plan.dailyReadings, today);
    const percentage = calculatePlanProgressToDatePercent(
      plan.dailyReadings,
      completedPassages,
      today,
    );
    return { percentage, dueThroughToday };
  }, [plan, completedPassages, today, isGuest, loadingChecklist]);


  const { completedWeeks, upcomingWeeks } = useMemo(() => {
    const completed: WeeklyProgress[] = [];
    const upcoming: WeeklyProgress[] = [];
    let consecutive = true;
    weeklyProgressData.forEach(week => {
      if (week.isCompleted && consecutive) {
        completed.push(week);
      } else {
        consecutive = false;
        upcoming.push(week);
      }
    });
    return { completedWeeks: completed, upcomingWeeks: upcoming };
  }, [weeklyProgressData]);

  // ... all useMemo and useCallback hooks are defined above this point ...

  if (!isMounted || planLoading) {
    return <PageLoading />;
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
      <div className="space-y-12">
        <div className="p-10 text-center bg-muted rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-60">
            <Info className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-section-title">{t.noPlanAvailable}</h3>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="page-container">
        {viewState.view === 'single-week-details' && (
           <div className="stack-gap-sm">
            <PageHeader 
                title={`${t.week} ${viewState.week.weekNumber}`}
                action={
                    <Button variant="ghost" size="sm" onClick={() => setViewState({ view: 'all-weeks' })} className="rounded-xl font-bold text-xs text-primary">
                        <ArrowLeft className="mr-2 h-4 w-4"/> {t.backToAllWeeks}
                    </Button>
                }
            />
            
            <div className="space-y-4">
                {viewState.week.readings
                    .sort((a,b) => parseDay(a.date).getTime() - parseDay(b.date).getTime())
                    .map(reading => (
                      <BiblePlanDisplay
                        key={reading.date}
                        readingToDisplay={reading}
                        currentUser={currentUser}
                        completedPassages={completedPassages}
                        togglePassageCompletion={togglePassageCompletion}
                        markMultiplePassages={isGuest ? undefined : markMultiplePassages}
                        allPassageTextsForDay={reading.passages.map(p => p.displayText).filter(Boolean).filter(text => typeof text === 'string' && !text.startsWith("Error:")) as string[]}
                        loading={loadingChecklist}
                        planAvailable={true}
                        hidePlanMeta={true}
                        isStandalone={true}
                      />
                ))}
            </div>
            <BackToTopButton />
          </div>
        )}

        {viewState.view === 'completed-weeks-list' && (
          <div className="space-y-8">
              <PageHeader 
                title={`${t.completed} ${t.allWeeks}`}
                action={
                    <Button variant="ghost" size="sm" onClick={() => setViewState({ view: 'all-weeks' })} className="rounded-xl font-bold text-xs text-primary">
                        <ArrowLeft className="mr-2 h-4 w-4"/> {t.backToAllWeeks}
                    </Button>
                }
              />
              <div 
                className="space-y-3"
              >
                {viewState.weeks.map((week) => (
                  <div key={week.weekNumber}>
                    <div 
                        className="ui-card cursor-pointer ring-1 ring-success/35 transition-shadow hover:shadow-md"
                        onClick={() => setViewState({ view: 'single-week-details', week: week })}
                    >
                      <div className="flex justify-between items-start">
                            <div>
                                <p className="text-micro-label text-success">{t.week} {week.weekNumber}</p>
                                <h3 className="text-lg font-semibold">{`${format(week.startDate, 'MMM d')} - ${format(week.endDate, 'MMM d, yyyy')}`}</h3>
                                <p className="text-xs text-muted-foreground mt-1 truncate">{week.passageSummary}</p>
                            </div>
                            <CheckCircle className="h-6 w-6 text-success shrink-0 ml-2" />
                      </div>
                    </div>
                    </div>
                ))}
              </div>
              <BackToTopButton />
          </div>
        )}

        {viewState.view === 'all-weeks' && (
              <div className="stack-gap-sm">
                  <NavPageHeader
                    action={
                        !isGuest ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="rounded-xl h-9 w-9">
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">More options</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-2xl border-border/50">
                                    <DropdownMenuItem className="rounded-lg text-micro-label h-9 px-3" onSelect={() => setIsMarkRangeDialogOpen(true)}>
                                        <BookUp className="mr-2 h-4 w-4 text-primary" />
                                        {t.markRangeRead}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : undefined
                    }
                  />

                  <PageSection title={t.overallProgress}>
                      <PlanProgressBar
                          value={overallProgress.percentage}
                          caption={isGuest
                              ? t.planProgressGuest(Math.round(overallProgress.percentage))
                              : t.planProgressUser(overallProgress.completed, overallProgress.total)
                          }
                      />
                  </PageSection>
                      {!isGuest && (paceStats.passagesLeft > 0 || progressSoFar.dueThroughToday > 0) && (
                        <div className="ui-metric-grid">
                          <PaceStatCard
                            title={t.progressSoFar}
                            value={`${Math.round(progressSoFar.percentage)}%`}
                            description={t.progressBasedOn.replace(
                              '{count}',
                              String(progressSoFar.dueThroughToday),
                            )}
                            tone="chart-4"
                          />
                          {paceStats.passagesLeft > 0 && (
                            <>
                              <PaceStatCard title={t.passagesLeft} value={paceStats.passagesLeft} tone="primary" />
                              <PaceStatCard title={t.daysLeft} value={paceStats.daysLeft} tone="chart-2" />
                              <PaceStatCard title={t.avgPerDay} value={paceStats.passagesPerDay} unit="passages" tone="chart-3" />
                            </>
                          )}
                        </div>
                      )}
                      <ReadingHeatmap dailyReadings={plan.dailyReadings} completedPassages={completedPassages} />
                  
                  <PageSection title={t.weeklyBreakdown}>
                      <div className="space-y-3">
                        {completedWeeks.length > 0 && (
                            <div 
                                key="completed-weeks-summary"
                                className="ui-card cursor-pointer ring-1 ring-success/35 transition-shadow hover:shadow-md"
                                onClick={() => {
                                    setViewState({ view: 'completed-weeks-list', weeks: completedWeeks });
                                }}
                            >
                              <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-micro-label text-success mb-1">{t.completed}</p>
                                        <h3 className="text-lg font-bold">{`${t.week} ${completedWeeks[0].weekNumber} - ${completedWeeks[completedWeeks.length - 1].weekNumber}`}</h3>
                                    </div>
                                    <CheckCircle className="h-6 w-6 text-success group-hover:scale-110 transition-transform" />
                              </div>
                            </div>
                        )}

                        {upcomingWeeks.map((week) => (
                            <div 
                                key={week.weekNumber}
                                className={cn(
                                    "ui-card cursor-pointer transition-shadow hover:shadow-md",
                                    !isGuest && week.isCurrent ? "ring-1 ring-primary/35 bg-accent/50" :
                                    !isGuest && week.isOverdue ? "ring-1 ring-destructive/35 bg-destructive/5" :
                                    "ring-1 ring-border/60 hover:bg-secondary/40"
                                )}
                                onClick={() => setViewState({ view: 'single-week-details', week: week })}
                            >
                              <div className="flex justify-between items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-micro-label mb-1",
                                            !isGuest && week.isCurrent ? "text-primary" :
                                            !isGuest && week.isOverdue ? "text-destructive" :
                                            "text-chart-2"
                                        )}>{t.week} {week.weekNumber}</p>
                                        <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{`${format(week.startDate, 'MMM d')} - ${format(week.endDate, 'MMM d, yyyy')}`}</h3>
                                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">{week.passageSummary}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn(
                                          "text-lg font-bold",
                                          !isGuest && week.isCurrent ? "text-primary" :
                                          !isGuest && week.isOverdue ? "text-destructive" :
                                          week.progressPercentage > 0 ? "text-chart-3" : "text-foreground"
                                        )}>{Math.round(week.progressPercentage)}%</p>
                                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{week.completedCount} / {week.totalCount} CH</p>
                                    </div>
                              </div>
                            </div>
                        ))}
                      </div>
                  </PageSection>
                  <BackToTopButton />
              </div>
        )}

    </div>
    {!isGuest && (
      <MarkRangeReadDialog isOpen={isMarkRangeDialogOpen} onOpenChange={setIsMarkRangeDialogOpen} />
    )}
    </>
  );
}
