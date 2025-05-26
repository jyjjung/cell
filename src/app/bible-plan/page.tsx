
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import type { DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, startOfDay, getISOWeek, isValid } from 'date-fns';
import { BookOpenCheck, Loader2, ListChecks, Info, CalendarIcon, XCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import BackToTopButton from '@/components/ui/back-to-top-button';

interface GroupedWeekPlan {
  weekKey: string;
  weekLabel: string;
  days: DailyReading[];
}

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isMounted, setIsMounted] = useState(false);
  const [openAccordionValue, setOpenAccordionValue] = useState<string | string[] | undefined>(undefined);


  useEffect(() => {
    setIsMounted(true);
  }, []);

  const groupReadingsByWeekForPlan = useCallback((dailyReadings: DailyReading[] | undefined): GroupedWeekPlan[] => {
    if (!dailyReadings || dailyReadings.length === 0) return [];
    const weeksMap = new Map<string, { days: DailyReading[] }>();

    dailyReadings.forEach(reading => {
      if (!reading || !reading.date) return;
       try {
        const dateObj = parseISO(reading.date);
        if (!isValid(dateObj)) throw new Error("Invalid date");
        const weekNumber = getISOWeek(dateObj);
        const year = dateObj.getUTCFullYear();
        const weekKey = `${year}-W${weekNumber}`;

        if (!weeksMap.has(weekKey)) {
          weeksMap.set(weekKey, { days: [] });
        }
        weeksMap.get(weekKey)!.days.push({ ...reading, passages: reading.passages.map(p => ({ ...p })) });
      } catch (e) {
        console.error(`[FullBiblePlanPage] Error processing reading for date ${reading.date} in groupReadings:`, e);
      }
    });
    
    const groupedWeeks: GroupedWeekPlan[] = [];
    weeksMap.forEach((data, weekKey) => {
      data.days.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      if (data.days.length > 0) {
        const firstDayOfWeek = parseISO(data.days[0].date);
        const weekLabel = `Week of ${format(firstDayOfWeek, "MMM d, yyyy")} (W${getISOWeek(firstDayOfWeek)})`;
        groupedWeeks.push({ weekKey, weekLabel, days: data.days });
      }
    });
    return groupedWeeks.sort((a,b) => parseISO(a.days[0].date).getTime() - parseISO(b.days[0].date).getTime());
  }, []);

  const displayedWeeklyPlan = useMemo(() => {
    if (!plan?.dailyReadings) return [];
    
    let filteredDailyReadings = plan.dailyReadings;
    if (selectedDate) {
      const formattedSelectedDate = format(startOfDay(selectedDate), "yyyy-MM-dd");
      filteredDailyReadings = plan.dailyReadings.filter(reading => {
         try {
            const readingDateObj = parseISO(reading.date + 'T00:00:00Z'); 
            return format(readingDateObj, "yyyy-MM-dd") === formattedSelectedDate;
          } catch (e) { return false; }
      });
    }
    return groupReadingsByWeekForPlan(filteredDailyReadings);
  }, [plan, selectedDate, groupReadingsByWeekForPlan]);

  useEffect(() => {
    if (selectedDate && displayedWeeklyPlan.length > 0) {
      const dateObj = startOfDay(selectedDate);
      const weekNumber = getISOWeek(dateObj);
      const year = dateObj.getUTCFullYear();
      const weekKeyToOpen = `${year}-W${weekNumber}`;
      
      // Check if this weekKey exists in the currently displayed (potentially filtered) plan
      const weekExistsInDisplay = displayedWeeklyPlan.some(week => week.weekKey === weekKeyToOpen);
      if(weekExistsInDisplay){
        setOpenAccordionValue(weekKeyToOpen);
      } else {
        // If the selected date's week isn't in the display (e.g. no readings for that day),
        // try to find its week in the full, unfiltered plan to open that.
        const fullPlanWeeks = groupReadingsByWeekForPlan(plan?.dailyReadings);
        const actualWeekToOpen = fullPlanWeeks.find(week => week.weekKey === weekKeyToOpen);
        if (actualWeekToOpen) {
           // This means the filter is active and hiding the week,
           // so we should clear the filter to show all and open the correct week.
           // This is tricky. For now, just try to open if visible.
           // A better UX might clear filter and open, but that's more state.
        } else {
           setOpenAccordionValue(undefined); // Clear if selected date's week doesn't exist
        }
      }
    } else if (!selectedDate) {
      setOpenAccordionValue(undefined); // Collapse all if filter is cleared
    }
  }, [selectedDate, displayedWeeklyPlan, plan?.dailyReadings, groupReadingsByWeekForPlan]);


  const handleShowAll = () => {
    setSelectedDate(undefined);
    setOpenAccordionValue(undefined);
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
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <ListChecks className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Full Bible Reading Plan</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-6 w-6 text-destructive" />
              <CardTitle className="text-2xl">No Plan Available</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No Bible reading plan has been set by the admin yet, or the current plan is empty.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Determine which weeks to render based on filter
  const weeksToRender = selectedDate ? displayedWeeklyPlan : groupReadingsByWeekForPlan(plan.dailyReadings);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <ListChecks className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Full Bible Reading Plan</h1>
      </div>

      <div className="mb-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full sm:w-auto justify-start text-left font-normal text-xs py-1.5 h-auto", !selectedDate && "text-muted-foreground")}
              > <CalendarIcon className="mr-2 h-3 w-3" /> {selectedDate ? format(selectedDate, "PPP") : <span>Filter by date...</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus/>
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button variant="ghost" onClick={handleShowAll} className="w-full sm:w-auto text-xs py-1.5 h-auto">
              <XCircle className="mr-2 h-3 w-3" /> Show All Readings
            </Button>
          )}
        </div>
      </div>

      {weeksToRender.length === 0 && selectedDate ? (
        <Card className="shadow-sm"><CardContent className="p-6 text-center"><Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">No readings scheduled for {format(selectedDate, "MMMM d, yyyy")}.</p></CardContent></Card>
      ) : weeksToRender.length === 0 && !selectedDate ? (
         <Card className="shadow-sm"><CardContent className="p-6 text-center"><Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">No readings found in the current plan.</p></CardContent></Card>
      ) : (
        <Accordion type="multiple" value={openAccordionValue ? [openAccordionValue].flat() : undefined} onValueChange={setOpenAccordionValue} className="w-full space-y-2">
          {weeksToRender.map((week) => (
            <AccordionItem key={week.weekKey} value={week.weekKey} className="border bg-card/80 rounded-md shadow-sm">
              <AccordionTrigger asChild className="p-2 hover:bg-muted/50 rounded-t-md transition-colors">
                <div className="flex items-center justify-between w-full cursor-pointer">
                  <span className="text-sm font-semibold">{week.weekLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 accordion-chevron" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="divide-y divide-border">
                  {week.days.map((reading) => {
                     let parsedDayDate: Date | null = null;
                      try {
                        parsedDayDate = parseISO(reading.date);
                        if(!isValid(parsedDayDate)) throw new Error("Invalid date after parsing");
                      } catch(e) {
                        return <div key={`error-date-${reading.date}`} className="p-2 text-destructive text-xs">Error: Invalid date.</div>;
                      }
                    return (
                      <div key={reading.date} className="p-2.5 space-y-1.5 bg-background/30 first:rounded-t-none last:rounded-b-md">
                        <h4 className="text-xs font-medium">{format(parsedDayDate, "EEE, MMM d")}</h4>
                        {reading.passages.length > 0 ? (
                          <ul className="space-y-1.5">
                            {reading.passages.map((passage, pIndex) => {
                              const passageTextToDisplay = (passage && typeof passage.displayText === 'string' && passage.displayText.trim() !== '') ? passage.displayText : "Error: Passage text data is missing.";
                              return (
                                <li key={pIndex} className="p-1.5 bg-card/50 border rounded-md text-xs flex items-center">
                                  <BookOpenCheck className="inline-block h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                  <span className={cn(passageTextToDisplay.startsWith("Error:") && "text-destructive italic")}>{passageTextToDisplay}</span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (<p className="text-xs text-muted-foreground">No passages assigned.</p>)}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      <BackToTopButton />
    </div>
  );
}
