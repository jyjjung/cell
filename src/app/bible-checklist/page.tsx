
"use client";

import { useEffect, useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import type { DailyReading } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, LibraryBig, Info, BookCheck, ArrowLeft, CalendarDays, BookUp, CheckCircle, LocateFixed } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useToast } from '@/hooks/use-toast';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isValid, isBefore } from 'date-fns';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import BackToTopButton from '@/components/ui/back-to-top-button';
import MarkRangeReadDialog from '@/components/bible/mark-range-read-dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface WeeklyProgress {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  readings: DailyReading[];
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isOverdue: boolean;
}

type ViewState = 
  | { view: 'all-weeks' }
  | { view: 'completed-weeks-list'; weeks: WeeklyProgress[] }
  | { view: 'single-week-details'; week: WeeklyProgress };


export default function BibleChecklistPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { setIsPageLoading } = usePageLoading();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ view: 'all-weeks' });
  const [isMarkRangeDialogOpen, setIsMarkRangeDialogOpen] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, isMounted, setIsPageLoading]);
  
  const weeklyProgressData = useMemo((): WeeklyProgress[] => {
    if (!plan?.dailyReadings) return [];
    
    const today = new Date();
    const weeksMap = new Map<string, DailyReading[]>();

    for (const reading of plan.dailyReadings) {
      try {
        const date = parseISO(reading.date);
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
        const weekStartDate = parseISO(weekKey);
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 });

        let totalCount = 0;
        let completedCount = 0;

        readings.forEach(reading => {
            const validPassages = reading.passages?.filter(p => p.displayText && !p.displayText.startsWith("Error:")) || [];
            totalCount += validPassages.length;
            completedCount += validPassages.filter(p => completedPassages.includes(p.displayText)).length;
        });

        const isCompleted = totalCount > 0 && completedCount === totalCount;
        const isCurrent = isWithinInterval(today, { start: weekStartDate, end: weekEndDate });
        const isOverdue = !isCompleted && isBefore(weekEndDate, today);


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
        };
      })
      .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
  }, [plan, completedPassages]);
  
  const overallProgress = useMemo(() => {
    if (!plan?.dailyReadings || loadingChecklist) {
      return { total: 0, completed: 0, percentage: 0 };
    }
    const total = plan.dailyReadings.reduce((acc, day) => acc + (day.passages?.filter(p => p.displayText && !p.displayText.startsWith("Error:")).length || 0), 0);
    const completed = completedPassages.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, percentage };
  }, [plan, completedPassages, loadingChecklist]);


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


  const PageSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-2/3 rounded-md" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
    exit: { y: -20, opacity: 0 }
  };

  const viewVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  };


  if (!isMounted || loadingAuth || (!loadingAuth && !currentUser && isMounted)) {
    return (<div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-xl text-muted-foreground">Loading authentication...</p></div>);
  }
  if (planLoading || loadingChecklist) {
    return <PageSkeleton />;
  }
  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (<div className="space-y-8"><h1 className="text-3xl font-bold tracking-tight">My Reading Checklist</h1><Card className="mt-6 max-w-lg mx-auto"><CardContent className="p-8 text-center"><Info className="mx-auto h-12 w-12 text-destructive mb-4" /><h3 className="text-xl font-semibold">No Plan Available</h3><p className="text-muted-foreground mt-2">No Bible reading plan has been set by the admin.</p></CardContent></Card></div>);
  }

  return (
    <AnimatePresence mode="wait">
      <div key={viewState.view}>
        {viewState.view === 'single-week-details' && (
           <motion.div 
            className="space-y-6"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
           >
            <Button variant="ghost" onClick={() => setViewState({ view: 'all-weeks' })} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4"/> Back to All Weeks
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Week {viewState.week.weekNumber}</h1>
            
            <Accordion type="single" collapsible className="w-full space-y-2">
                {viewState.week.readings
                    .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
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
                      />
                ))}
            </Accordion>
            <BackToTopButton />
          </motion.div>
        )}

        {viewState.view === 'completed-weeks-list' && (
          <motion.div 
            className="space-y-6"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
              <Button variant="ghost" onClick={() => setViewState({ view: 'all-weeks' })} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4"/> Back to All Weeks
              </Button>
              <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight">Completed Weeks</motion.h1>
              <motion.div 
                className="space-y-3"
                variants={containerVariants}
              >
                {viewState.weeks.map((week) => (
                  <motion.div variants={itemVariants} key={week.weekNumber} initial="hidden" whileInView="visible" exit="exit" viewport={{ once: false }}>
                    <Card 
                        className={cn(
                            "shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
                            "bg-green-100/30 dark:bg-green-900/20 border-green-500/30 hover:border-green-500/70"
                        )}
                        onClick={() => setViewState({ view: 'single-week-details', week: week })}
                    >
                        <CardHeader className="p-4">
                          <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-semibold text-primary">WEEK {week.weekNumber}</p>
                                    <CardTitle className="text-xl">{`${format(week.startDate, 'MMM d')} - ${format(week.endDate, 'MMM d, yyyy')}`}</CardTitle>
                                </div>
                                <CheckCircle className="h-6 w-6 text-green-500" />
                          </div>
                        </CardHeader>
                    </Card>
                    </motion.div>
                ))}
              </motion.div>
              <BackToTopButton />
          </motion.div>
        )}

        {viewState.view === 'all-weeks' && (
            <>
              <motion.div 
                className="space-y-6"
                variants={viewVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                  <div className="flex flex-col sm:items-center sm:justify-between mb-4 gap-4">
                      <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight flex items-center"><CalendarDays className="mr-3 h-8 w-8 text-primary"/> My Reading Plan</motion.h1>
                      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-2 self-start sm:self-center">
                        {currentWeek && (
                            <Button onClick={handleJumpToCurrentWeek} variant="outline">
                                <LocateFixed className="mr-2 h-4 w-4" /> Current
                            </Button>
                        )}
                        <Button onClick={() => setIsMarkRangeDialogOpen(true)}>
                            <BookUp className="mr-2 h-4 w-4" /> Mark Range
                        </Button>
                      </motion.div>
                  </div>

                  <motion.div variants={itemVariants}>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <Progress value={overallProgress.percentage} className="flex-grow" />
                                <span className="font-semibold text-muted-foreground">{Math.round(overallProgress.percentage)}%</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                You have completed {overallProgress.completed} of {overallProgress.total} total passages.
                            </p>
                        </CardContent>
                    </Card>
                  </motion.div>
                  
                  <motion.div 
                    className="space-y-3"
                    variants={containerVariants}
                  >
                      {completedWeeks.length > 0 && (
                        <motion.div variants={itemVariants} initial="hidden" whileInView="visible" exit="exit" viewport={{ once: false }}>
                          <Card 
                              key="completed-weeks-summary"
                              className={cn(
                                  "shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
                                  "bg-green-100/30 dark:bg-green-900/20 border-green-500/30 hover:border-green-500/70"
                              )}
                              onClick={() => {
                                  setViewState({ view: 'completed-weeks-list', weeks: completedWeeks });
                              }}
                          >
                              <CardHeader className="p-4">
                                <div className="flex justify-between items-center">
                                      <div>
                                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">COMPLETED</p>
                                          <CardTitle className="text-xl">{`Weeks ${completedWeeks[0].weekNumber} - ${completedWeeks[completedWeeks.length - 1].weekNumber}`}</CardTitle>
                                      </div>
                                      <CheckCircle className="h-8 w-8 text-green-500" />
                                </div>
                              </CardHeader>
                          </Card>
                        </motion.div>
                      )}

                      {upcomingWeeks.map((week) => (
                        <motion.div variants={itemVariants} key={week.weekNumber} initial="hidden" whileInView="visible" exit="exit" viewport={{ once: false }}>
                          <Card 
                              className={cn(
                                  "shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
                                  week.isCurrent ? "bg-blue-100/30 dark:bg-blue-900/20 border-blue-500/40 hover:border-blue-500/70" :
                                  week.isOverdue ? "bg-red-100/30 dark:bg-red-900/20 border-red-500/30 hover:border-red-500/70" : 
                                  "hover:border-primary/50"
                              )}
                              onClick={() => setViewState({ view: 'single-week-details', week: week })}
                          >
                              <CardHeader className="p-4">
                                <div className="flex justify-between items-center">
                                      <div>
                                          <p className={cn(
                                              "text-sm font-semibold",
                                              week.isCurrent ? "text-blue-600 dark:text-blue-400" :
                                              week.isOverdue ? "text-red-600 dark:text-red-400" :
                                              "text-primary"
                                          )}>WEEK {week.weekNumber}</p>
                                          <CardTitle className="text-xl">{`${format(week.startDate, 'MMM d')} - ${format(week.endDate, 'MMM d, yyyy')}`}</CardTitle>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-xl font-bold">{Math.round(week.progressPercentage)}%</p>
                                          <p className="text-xs text-muted-foreground">{week.completedCount} / {week.totalCount}</p>
                                      </div>
                                </div>
                              </CardHeader>
                          </Card>
                        </motion.div>
                      ))}
                  </motion.div>
                  <BackToTopButton />
              </motion.div>
              <MarkRangeReadDialog isOpen={isMarkRangeDialogOpen} onOpenChange={setIsMarkRangeDialogOpen} />
            </>
        )}
      </div>
    </AnimatePresence>
  );
}

    
