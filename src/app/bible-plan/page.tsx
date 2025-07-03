
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import type { DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, startOfDay, isValid, isWithinInterval, isSameDay, startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import { BookOpenCheck, Loader2, ListChecks, Info, CalendarIcon, Clock, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import BackToTopButton from '@/components/ui/back-to-top-button';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist'; // For dialog props

type FilterMode = 'currentWeek' | 'fullPlan' | 'singleDay';

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState<FilterMode>('currentWeek');
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [isPassageViewerOpen, setIsPassageViewerOpen] = useState(false);
  const [selectedPassageRef, setSelectedPassageRef] = useState<string | null>(null);
  
  // Get functions and data from useUserBibleChecklist for the dialog.
  // These are not used for filtering on this public page but are needed for the dialog's "Mark as Done" feature if a logged-in user views this page.
  const { completedPassages, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();


  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedDailyReadings = useMemo(() => {
    if (!plan?.dailyReadings) return [];
    return [...plan.dailyReadings].sort((a, b) => {
      try {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        if (!isValid(dateA) || !isValid(dateB)) return 0;
        return dateA.getTime() - dateB.getTime();
      } catch (e) { 
         console.error("[FullBiblePlanPage] Error sorting daily readings by date:", a.date, b.date, e);
        return 0; 
      }
    });
  }, [plan]);

  const sortedAndFilteredDailyReadings = useMemo(() => {
     switch (activeTab) {
      case 'currentWeek': {
        const today = new Date();
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 }); 
        const currentWeekEnd = endOfWeek(today, { weekStartsOn: 0 });   
        return sortedDailyReadings.filter(reading => {
          try {
            const readingDateObj = parseISO(reading.date); 
            if (!isValid(readingDateObj)) return false;
            return isWithinInterval(readingDateObj, { start: startOfDay(currentWeekStart), end: endOfDay(currentWeekEnd) });
          } catch (e) { 
            console.error(`[FullBiblePlanPage] Error parsing date for current week filtering: ${reading.date}`, e);
            return false; 
          }
        });
      }
      case 'singleDay': {
        if (!selectedDate) return [];
        return sortedDailyReadings.filter(reading => {
           try {
              const readingDateObj = parseISO(reading.date);
              if (!isValid(readingDateObj)) return false;
              return isSameDay(readingDateObj, selectedDate);
            } catch (e) { 
              console.error(`[FullBiblePlanPage] Error parsing date for single day filtering: ${reading.date}`, e);
              return false; 
            }
        });
      }
      case 'fullPlan':
      default:
        return sortedDailyReadings;
    }
  }, [sortedDailyReadings, activeTab, selectedDate]);


  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setActiveTab(date ? 'singleDay' : 'currentWeek');
  };

  const handlePassageClick = (passageDisplayText: string | undefined) => { 
    if (passageDisplayText && typeof passageDisplayText === 'string' && !passageDisplayText.toLowerCase().includes("error:")) {
      setSelectedPassageRef(passageDisplayText);
      setIsPassageViewerOpen(true);
    } else {
      toast({
        title: "Invalid Passage",
        description: "Cannot view details for an invalid or error passage.",
        variant: "default"
      });
    }
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading page content...</p>
      </div>
    );
  }

  if (planLoading || loadingChecklist) { // Also consider checklist loading for dialog props
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

       <Tabs value={activeTab} onValueChange={(value) => { setSelectedDate(undefined); setActiveTab(value as FilterMode); }} className="w-full">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="currentWeek" className="flex items-center gap-2"><Clock className="h-4 w-4"/>Current Week</TabsTrigger>
              <TabsTrigger value="fullPlan" className="flex items-center gap-2"><List className="h-4 w-4"/>Full Plan</TabsTrigger>
            </TabsList>
            <Popover>
              <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", activeTab === 'singleDay' && "ring-2 ring-ring")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {activeTab === 'singleDay' && selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus/>
              </PopoverContent>
            </Popover>
        </div>

        <div className="space-y-2 mt-4">
          {sortedAndFilteredDailyReadings.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="p-6 text-center"><Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">No readings found for this filter.</p></CardContent></Card>
          ) : (
            sortedAndFilteredDailyReadings.map((reading) => {
              let parsedDayDate: Date | null = null;
                try {
                  if (!reading || !reading.date) throw new Error("Missing reading or date");
                  parsedDayDate = parseISO(reading.date);
                  if(!isValid(parsedDayDate)) throw new Error("Invalid date after parsing");
                } catch(e) {
                  console.error(`[FullBiblePlanPage] Error parsing date for display: ${reading?.date}`, e);
                  return <Card key={`error-date-${reading?.date || Math.random()}`} className="p-3 my-2 shadow-sm"><CardContent className="text-destructive text-xs">Error: Invalid date for reading entry.</CardContent></Card>;
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
                          const isPassageValid = passageTextToDisplay && !passageTextToDisplay.toLowerCase().includes("error:");
                          if (!passage || typeof passage.displayText !== 'string' || passage.displayText.trim() === '') {
                             console.warn(`[FullBiblePlanPage] RENDERING: Passage displayText is missing or invalid for date ${reading.date}, index ${pIndex}. Passage data:`, passage ? JSON.parse(JSON.stringify(passage)) : "null/undefined");
                          }
                          return (
                            <li key={pIndex} className="p-1.5 bg-background/50 border rounded-md text-xs flex items-center">
                              <BookOpen className="inline-block h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                               {isPassageValid ? (
                                  <Button
                                    variant="link"
                                    className="p-0 h-auto text-xs font-normal text-left justify-start text-foreground hover:text-primary hover:no-underline"
                                    onClick={() => handlePassageClick(passageTextToDisplay)}
                                    title={`View ${passageTextToDisplay}`}
                                  >
                                    {passageTextToDisplay}
                                  </Button>
                                ) : (
                                  <span className="text-destructive italic">{passageTextToDisplay}</span>
                                )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (<p className="text-xs text-muted-foreground">No passages assigned.</p>)}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </Tabs>
       <BiblePassageViewerDialog
        isOpen={isPassageViewerOpen}
        onOpenChange={setIsPassageViewerOpen}
        passageReference={selectedPassageRef}
        completedPassages={completedPassages} // Pass for dialog features
        markMultiplePassages={markMultiplePassages} // Pass for dialog features
      />
      <BackToTopButton />
    </div>
  );
}
