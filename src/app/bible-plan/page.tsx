
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import type { DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, startOfDay, isValid } from 'date-fns';
import { BookOpenCheck, Loader2, ListChecks, Info, CalendarIcon, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import BackToTopButton from '@/components/ui/back-to-top-button';

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedAndFilteredDailyReadings = useMemo(() => {
    if (!plan?.dailyReadings) return [];
    
    let filteredReadings = [...plan.dailyReadings].sort((a, b) => {
      try {
        return parseISO(a.date).getTime() - parseISO(b.date).getTime();
      } catch (e) { return 0; }
    });

    if (selectedDate) {
      const formattedSelectedDate = format(startOfDay(selectedDate), "yyyy-MM-dd");
      filteredReadings = filteredReadings.filter(reading => {
         try {
            const readingDateObj = parseISO(reading.date + 'T00:00:00Z'); // Ensure time part for accurate comparison with startOfDay
            return format(readingDateObj, "yyyy-MM-dd") === formattedSelectedDate;
          } catch (e) { 
            console.error(`[FullBiblePlanPage] Error parsing date for filtering: ${reading.date}`, e);
            return false; 
          }
      });
    }
    return filteredReadings;
  }, [plan, selectedDate]);

  const handleShowAll = () => {
    setSelectedDate(undefined);
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
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Full Bible Reading Plan</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-6 w-6 text-destructive" />
              <CardTitle className="text-xl">No Plan Available</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No Bible reading plan has been set by the admin yet, or the current plan is empty.
            </p>
          </CardContent>
        </Card>
        <BackToTopButton />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <ListChecks className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Full Bible Reading Plan</h1>
      </div>

      <div className="mb-4 p-3 border rounded-lg bg-card shadow-sm sticky top-[calc(theme(spacing.14)+1px)] z-30"> {/* Header height + border */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

      {sortedAndFilteredDailyReadings.length === 0 && selectedDate ? (
        <Card className="shadow-sm"><CardContent className="p-6 text-center"><Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">No readings scheduled for {format(selectedDate, "MMMM d, yyyy")}.</p></CardContent></Card>
      ) : sortedAndFilteredDailyReadings.length === 0 && !selectedDate ? (
         <Card className="shadow-sm"><CardContent className="p-6 text-center"><Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">No readings found in the current plan.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {sortedAndFilteredDailyReadings.map((reading) => {
             let parsedDayDate: Date | null = null;
              try {
                parsedDayDate = parseISO(reading.date);
                if(!isValid(parsedDayDate)) throw new Error("Invalid date after parsing");
              } catch(e) {
                console.error(`[FullBiblePlanPage] Error parsing date for display: ${reading.date}`, e);
                return <Card key={`error-date-${reading.date}`} className="p-3 my-2 shadow-sm"><CardContent className="text-destructive text-xs">Error: Invalid date for reading entry.</CardContent></Card>;
              }
            return (
              <Card key={reading.date} className="bg-card/80 rounded-md shadow-sm">
                <CardHeader className="p-2 border-b">
                  <h3 className="text-sm font-semibold">{format(parsedDayDate, "EEE, MMM d, yyyy")}</h3>
                </CardHeader>
                <CardContent className="p-2 space-y-1.5">
                  {reading.passages.length > 0 ? (
                    <ul className="space-y-1.5">
                      {reading.passages.map((passage, pIndex) => {
                        const passageTextToDisplay = (passage && typeof passage.displayText === 'string' && passage.displayText.trim() !== '') ? passage.displayText : "Error: Passage text data is missing.";
                        if (!passage || typeof passage.displayText !== 'string' || passage.displayText.trim() === '') {
                           console.warn(`[FullBiblePlanPage] RENDERING: Passage displayText is missing or invalid for date ${reading.date}, index ${pIndex}. Passage data:`, passage ? JSON.parse(JSON.stringify(passage)) : "null/undefined");
                        }
                        return (
                          <li key={pIndex} className="p-1.5 bg-background/50 border rounded-md text-xs flex items-center">
                            <BookOpenCheck className="inline-block h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                            <span className={cn(passageTextToDisplay.startsWith("Error:") && "text-destructive italic")}>{passageTextToDisplay}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (<p className="text-xs text-muted-foreground">No passages assigned.</p>)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <BackToTopButton />
    </div>
  );
}
