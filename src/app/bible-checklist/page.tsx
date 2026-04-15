
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import type { DailyReading, WeeklyProgress } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, Info, BookCheck, ArrowLeft, CalendarDays, BookUp, CheckCircle, LocateFixed, MoreVertical, Target, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, isWithinInterval, isValid, isBefore, isSameDay, startOfDay, differenceInDays } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import BackToTopButton from '@/components/ui/back-to-top-button';
import MarkRangeReadDialog from '@/components/bible/mark-range-read-dialog';
import ReadingHeatmap from '@/components/dashboard-widgets/reading-heatmap';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { translations } from '@/lib/translations';
import { PageHeader } from '@/components/ui/page-layout';
import BiblePlanSkeleton from '@/components/bible/bible-plan-skeleton';


type ViewState = 
  | { view: 'all-weeks' }
  | { view: 'completed-weeks-list'; weeks: WeeklyProgress[] }
  | { view: 'single-week-details'; week: WeeklyProgress };

  
export default function BibleChecklistPage() {
  const { currentUser, loadingAuth } = useAuth();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { toast } = useToast();

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
              completedCount += validPassages.filter(p => completedPassages.includes(p.displayText)).length;
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
    
    const total = plan.dailyReadings.reduce((acc, day) => acc + (day.passages?.filter(p => p.displayText && !p.displayText.startsWith("Error:")).length || 0), 0);
    
    let completed = 0;
    if (isGuest) {
       plan.dailyReadings.forEach(day => {
         const dayDate = parseDay(day.date);
         if (isValid(dayDate) && isBefore(dayDate, today)) {
           completed += day.passages?.filter(p => p.displayText && !p.displayText.startsWith("Error:")).length || 0;
         }
       });
    } else {
       completed = completedPassages.length;
    }

    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, percentage };
  }, [plan, completedPassages, loadingChecklist, isGuest, today]);

  const paceStats = useMemo(() => {
    if (!plan?.dailyReadings || plan.dailyReadings.length === 0 || isGuest) {
      return { chaptersLeft: 0, daysLeft: 0, chaptersPerDay: 0, chaptersToCatchUp: 0, catchUpPace: 0 };
    }
  
    const allPassages = plan.dailyReadings.flatMap(day => day.passages || []);
    const uniqueChaptersInPlan = new Set(allPassages.map(p => `${p.book} ${p.chapter}`));
    const totalChapters = uniqueChaptersInPlan.size;
  
    const completedChapters = new Set<string>();
    completedPassages.forEach(cp => {
      const passage = allPassages.find(p => p.displayText === cp);
      if (passage) {
        completedChapters.add(`${passage.book} ${passage.chapter}`);
      }
    });
    const completedChapterCount = completedChapters.size;
    const chaptersLeft = totalChapters - completedChapterCount;
  
    const lastReadingDate = parseDay(plan.dailyReadings[plan.dailyReadings.length - 1].date);
    const daysLeft = isValid(lastReadingDate) ? differenceInDays(lastReadingDate, today) : 0;
    const chaptersPerDay = (daysLeft > 0 && chaptersLeft > 0) ? parseFloat((chaptersLeft / daysLeft).toFixed(2)) : 0;

    const chaptersToDate = new Set<string>();
    plan.dailyReadings.forEach(day => {
        const dayDate = parseDay(day.date);
        if (isValid(dayDate) && isBefore(dayDate, today)) {
            (day.passages || []).forEach(p => chaptersToDate.add(`${p.book} ${p.chapter}`));
        }
    });

    let chaptersToCatchUp = 0;
    chaptersToDate.forEach(ch => {
        if (!completedChapters.has(ch)) {
            chaptersToCatchUp++;
        }
    });
    const catchUpPace = chaptersToCatchUp > 0 ? parseFloat((chaptersToCatchUp / 6).toFixed(2)) : 0;

    return { chaptersLeft, daysLeft, chaptersPerDay, chaptersToCatchUp, catchUpPace };
  }, [plan, completedPassages, today, isGuest]);


  const currentWeek = useMemo(() => {
    return weeklyProgressData.find(week => week.isCurrent) || null;
  }, [weeklyProgressData]);

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


  const handleJumpToCurrentWeek = () => {
    if (currentWeek) {
       setViewState({ view: 'single-week-details', week: currentWeek });
    } else {
      toast({
        title: "No Current Week",
        description: "The plan might not cover the current date.",
      });
    }
  };

  const StatCard = ({ icon: Icon, title, value, unit, description }: { icon: React.ElementType, title: string, value: string | number, unit?: string, description?: string }) => (
    <div className="p-6 bg-muted/20 border border-transparent rounded-[2rem] flex flex-col justify-between hover:border-primary/20 transition-all shadow-inner">
      <div className="flex items-center space-x-3 mb-6">
          <div className="h-12 w-12 rounded-[1.2rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{title}</p>
      </div>
      <div>
          <p className="text-2xl font-bold tracking-tight leading-none">{value} {unit && <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>}</p>
          {description && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-2">{description}</p>}
      </div>
    </div>
  );


  // ... all useMemo and useCallback hooks are defined above this point ...

  if (!isMounted || loadingAuth || planLoading || (!isGuest && loadingChecklist)) {
    return null;
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
      <div className="space-y-12">
        <PageHeader title={t.readingPlan} subtitle="Bible Journey" icon={BookOpen} accentColor="text-primary" iconBgColor="bg-primary/10" />
        <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-60">
            <Info className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-section-title">{t.noPlanAvailable}</h3>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
        {viewState.view === 'single-week-details' && (
           <div className="space-y-8">
            <PageHeader 
                title={`${t.week} ${viewState.week.weekNumber}`}
                subtitle={`${format(viewState.week.startDate, 'MMMM d')} - ${format(viewState.week.endDate, 'MMMM d, yyyy')}`}
                icon={BookOpen}
                accentColor="text-primary"
                iconBgColor="bg-primary/10"
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
                subtitle="Milestone Archive"
                icon={BookOpen}
                accentColor="text-primary"
                iconBgColor="bg-primary/10"
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
                        className="p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-success/40 bg-success/10 hover:border-success/80"
                        onClick={() => setViewState({ view: 'single-week-details', week: week })}
                    >
                      <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-semibold text-success">{t.week.toUpperCase()} {week.weekNumber}</p>
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
              <div className="space-y-12">
                  <PageHeader 
                    title={isGuest ? "Reading Plan" : "My Readings"}
                    subtitle="Spiritual Roadmap"
                    icon={BookOpen}
                    accentColor="text-primary"
                    iconBgColor="bg-primary/10"
                    action={
                        <div className="flex gap-2">
                             {currentWeek && (
                                <Button onClick={handleJumpToCurrentWeek} variant="outline" size="sm" className="rounded-xl font-bold text-xs">
                                    <LocateFixed className="mr-2 h-4 w-4" /> {t.currentWeek}
                                </Button>
                            )}
                            {!isGuest && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="rounded-xl h-9 w-9">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">More options</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-2xl border-border/50">
                                        <DropdownMenuItem className="rounded-xl font-black text-micro-label h-10 px-4" onSelect={() => setIsMarkRangeDialogOpen(true)}>
                                            <BookUp className="mr-2 h-4 w-4 text-primary" />
                                            {t.markRangeRead}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    }
                  />

                  <section className="space-y-4">
                      <div className="space-y-1 pl-1">
                        <h2 className="text-section-title">Overall Progress</h2>
                      </div>
                      <div className="p-6 bg-card/40 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-md space-y-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl -z-10 translate-x-1/2 -translate-y-1/2" />
                          <div>
                              <div className="flex items-center gap-4 mb-2">
                                  <Progress value={overallProgress.percentage} className="flex-grow h-2 bg-muted shadow-inner" />
                                  <span className="font-bold text-foreground text-xl tracking-tight">{Math.round(overallProgress.percentage)}%</span>
                              </div>
                              <p className="text-xs font-medium text-muted-foreground">
                                {isGuest 
                                    ? `The plan is ${Math.round(overallProgress.percentage)}% complete as of today.`
                                    : `${overallProgress.completed} of ${overallProgress.total} passages completed.`
                                }
                              </p>
                          </div>
                          {!isGuest && paceStats.chaptersLeft > 0 && (
                            <div className="pt-8 border-t border-border/50 space-y-10">
                                <div className="space-y-5">
                                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/80">{t.paceToFinish}</h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                      <StatCard icon={Target} title={t.chaptersLeft} value={paceStats.chaptersLeft} />
                                      <StatCard icon={CalendarDays} title={t.daysLeft} value={paceStats.daysLeft} />
                                      <StatCard icon={BookCheck} title={t.avgPerDay} value={paceStats.chaptersPerDay} unit="ch" />
                                  </div>
                                </div>
                            </div>
                          )}
                      </div>
                      <div className="mt-4">
                        <ReadingHeatmap dailyReadings={plan.dailyReadings} completedPassages={completedPassages} />
                      </div>
                  </section>
                  
                  <section className="space-y-4">
                      <div className="space-y-1 pl-1">
                        <h2 className="text-section-title">Weekly Breakdown</h2>
                      </div>
                      <div className="space-y-3">
                        {completedWeeks.length > 0 && (
                            <div 
                                key="completed-weeks-summary"
                                className="p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-success/30 bg-success/10 hover:border-success/50 hover:bg-success/20 group backdrop-blur-sm"
                                onClick={() => {
                                    setViewState({ view: 'completed-weeks-list', weeks: completedWeeks });
                                }}
                            >
                              <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-success/80 mb-1">{t.completed}</p>
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
                                    "p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border group",
                                    !isGuest && week.isCurrent ? "border-primary/40 bg-primary/10 hover:border-primary/50 hover:bg-primary/20" :
                                    !isGuest && week.isOverdue ? "border-destructive/40 bg-destructive/10 hover:border-destructive/50 hover:bg-destructive/20" : 
                                    "border-border/50 bg-card/40 backdrop-blur-sm hover:border-primary/30"
                                )}
                                onClick={() => setViewState({ view: 'single-week-details', week: week })}
                            >
                              <div className="flex justify-between items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-[11px] font-bold uppercase tracking-wider mb-1",
                                            !isGuest && week.isCurrent ? "text-primary" :
                                            !isGuest && week.isOverdue ? "text-destructive" :
                                            "text-muted-foreground/80"
                                        )}>{t.week} {week.weekNumber}</p>
                                        <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{`${format(week.startDate, 'MMM d')} - ${format(week.endDate, 'MMM d, yyyy')}`}</h3>
                                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">{week.passageSummary}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-lg font-bold">{Math.round(week.progressPercentage)}%</p>
                                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{week.completedCount} / {week.totalCount} CH</p>
                                    </div>
                              </div>
                            </div>
                        ))}
                      </div>
                  </section>
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
