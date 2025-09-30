
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import type { DailyReading } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { format, parseISO, startOfWeek, endOfWeek, isValid } from 'date-fns';
import { Loader2, Info, ArrowLeft, CalendarDays } from 'lucide-react';
import BackToTopButton from '@/components/ui/back-to-top-button';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface WeeklyGrouping {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  readings: DailyReading[];
}

type ViewState = 
  | { view: 'all-weeks' }
  | { view: 'single-week-details'; week: WeeklyGrouping };

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const [isMounted, setIsMounted] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ view: 'all-weeks' });
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const weeklyGroupings = useMemo((): WeeklyGrouping[] => {
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
        console.error("[FullBiblePlanPage] Error processing reading for week grouping:", reading, e);
      }
    }
    
    return Array.from(weeksMap.entries())
      .map(([weekKey, readings], index) => {
        const weekStartDate = parseISO(weekKey);
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 });
        
        return {
          weekNumber: index + 1,
          startDate: weekStartDate,
          endDate: weekEndDate,
          readings,
        };
      })
      .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
  }, [plan]);
  
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


  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading page content...</p>
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading Bible reading plan...</p>
      </div>
    );
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Full Bible Reading Plan</h1>
        <Card className="mt-6 max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <Info className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-semibold">No Plan Available</h3>
              <p className="text-muted-foreground mt-2">
                No Bible reading plan has been set by the admin yet.
              </p>
            </CardContent>
        </Card>
      </div>
    );
  }

  // View for a single week's daily readings
  if (viewState.view === 'single-week-details') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setViewState({ view: 'all-weeks' })} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4"/> Back to Full Plan
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Week {viewState.week.weekNumber}</h1>
        
        <Accordion type="single" collapsible className="w-full space-y-2">
            {viewState.week.readings
                .sort((a,b) => parseISO(a.date).getTime() - b.date.getTime())
                .map(reading => (
                  <BiblePlanDisplay
                    key={reading.date}
                    readingToDisplay={reading}
                    currentUser={null}
                    completedPassages={[]}
                    togglePassageCompletion={async () => {}}
                    loading={false}
                    planAvailable={true}
                    hidePlanMeta={true}
                  />
            ))}
        </Accordion>
         <BackToTopButton />
      </div>
    );
  }
  
  // Main view listing all weeks
  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col sm:items-center sm:justify-between mb-4 gap-4">
        <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight flex items-center self-start sm:self-center"><CalendarDays className="mr-3 h-8 w-8 text-primary"/> Full Bible Reading Plan</motion.h1>
      </div>

       <motion.div 
        className="space-y-3"
        variants={containerVariants}
       >
          {weeklyGroupings.map((week) => (
            <motion.div variants={itemVariants} key={week.weekNumber} initial="hidden" whileInView="visible" exit="exit" viewport={{ once: false }}>
              <Card 
                  className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/50"
                  onClick={() => setViewState({ view: 'single-week-details', week: week })}
              >
                  <CardHeader className="p-4">
                     <div className="flex justify-between items-center">
                          <div>
                              <p className="text-sm font-semibold text-primary">WEEK {week.weekNumber}</p>
                              <CardTitle className="text-xl">{`${format(week.startDate, 'MMM d')} - ${format(week.endDate, 'MMM d, yyyy')}`}</CardTitle>
                          </div>
                     </div>
                  </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      <BackToTopButton />
    </motion.div>
  );
}
