
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import type { DailyReading } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, LibraryBig, Info, BookCheck, ArrowLeft, CalendarDays } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useToast } from '@/hooks/use-toast';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isValid } from 'date-fns';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';


interface WeeklyProgress {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  readings: DailyReading[];
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
}


export default function BibleChecklistPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { setIsPageLoading } = usePageLoading();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyProgress | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, isMounted, setIsPageLoading]);
  
  const weeklyProgressData = useMemo((): WeeklyProgress[] => {
    if (!plan?.dailyReadings) return [];

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

        return {
          weekNumber: index + 1,
          startDate: weekStartDate,
          endDate: weekEndDate,
          readings,
          completedCount,
          totalCount,
          progressPercentage: totalCount > 0 ? (completedCount / totalCount) * 100 : 0
        };
      })
      .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
  }, [plan, completedPassages]);

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

  if (!isMounted || loadingAuth || (!loadingAuth && !currentUser && isMounted)) {
    return (<div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-xl text-muted-foreground">Loading authentication...</p></div>);
  }
  if (planLoading || loadingChecklist) {
    return <PageSkeleton />;
  }
  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (<div className="space-y-8"><h1 className="text-3xl font-bold tracking-tight">My Reading Checklist</h1><Card className="mt-6 max-w-lg mx-auto"><CardContent className="p-8 text-center"><Info className="mx-auto h-12 w-12 text-destructive mb-4" /><h3 className="text-xl font-semibold">No Plan Available</h3><p className="text-muted-foreground mt-2">No Bible reading plan has been set by the admin.</p></CardContent></Card></div>);
  }

  // View for selected week
  if (selectedWeek) {
     const allPassageTextsForWeek = selectedWeek.readings.flatMap(day => 
        day.passages.map(p => p.displayText).filter(text => text && !text.startsWith("Error:"))
      );

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => setSelectedWeek(null)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4"/> Back to All Weeks
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Week {selectedWeek.weekNumber}</h1>
            <h2 className="text-lg text-muted-foreground -mt-4">{`${format(selectedWeek.startDate, 'MMM d')} - ${format(selectedWeek.endDate, 'MMM d, yyyy')}`}</h2>
            
            <div className="space-y-4">
                {selectedWeek.readings
                    .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                    .map(reading => (
                        <BiblePlanDisplay
                            key={reading.date}
                            readingToDisplay={reading}
                            currentUser={currentUser}
                            completedPassages={completedPassages}
                            togglePassageCompletion={togglePassageCompletion}
                            onToggleAllToday={markMultiplePassages}
                            allPassageTextsForDay={reading.passages.map(p => p.displayText).filter(Boolean).filter(text => typeof text === 'string' && !text.startsWith("Error:")) as string[]}
                            loading={loadingChecklist}
                            planAvailable={true}
                            hidePlanMeta={true}
                        />
                ))}
            </div>
        </div>
    )
  }

  // Main view listing all weeks
  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h1 className="text-3xl font-bold tracking-tight flex items-center"><CalendarDays className="mr-3 h-8 w-8 text-primary"/> My Reading Plan</h1>
        </div>
        
        <div className="space-y-3">
            {weeklyProgressData.map((week) => (
                <Card 
                    key={week.weekNumber}
                    className="shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
                    onClick={() => setSelectedWeek(week)}
                >
                    <CardHeader className="p-4">
                       <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-primary">WEEK {week.weekNumber}</p>
                                <CardTitle className="text-xl">{`${format(week.startDate, 'MMM d')} - ${format(week.endDate, 'MMM d, yyyy')}`}</CardTitle>
                            </div>
                             <div className="flex items-center gap-4 w-full sm:w-auto max-w-[200px]">
                                <Progress value={week.progressPercentage} className="w-full" />
                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                    {Math.round(week.progressPercentage)}%
                                </span>
                            </div>
                       </div>
                    </CardHeader>
                </Card>
            ))}
        </div>
    </div>
  );
}
