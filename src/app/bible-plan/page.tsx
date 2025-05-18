
"use client";

import { useState, useEffect } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import type { DailyReading } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, startOfDay } from 'date-fns';
import { BookOpenCheck, Loader2, ListChecks, Info, CalendarIcon, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [displayedReadings, setDisplayedReadings] = useState<DailyReading[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    if (plan?.dailyReadings) {
      if (selectedDate) {
        const formattedSelectedDate = format(startOfDay(selectedDate), "yyyy-MM-dd");
        setDisplayedReadings(
          plan.dailyReadings.filter(reading => {
            try {
                const readingDateObj = parseISO(reading.date + 'T00:00:00Z');
                return format(readingDateObj, "yyyy-MM-dd") === formattedSelectedDate;
            } catch (e) {
                console.error("Error parsing reading date for filtering:", reading.date, e);
                return false;
            }
          })
        );
        setIsFiltering(true);
      } else {
        setDisplayedReadings(plan.dailyReadings);
        setIsFiltering(false);
      }
    } else {
      setDisplayedReadings([]);
      setIsFiltering(false);
    }
  }, [plan, selectedDate]);

  const handleShowAll = () => {
    setSelectedDate(undefined);
  };

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
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <ListChecks className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Full Bible Reading Plan</h1>
      </div>

      <div className="mb-6 p-4 border rounded-lg bg-card shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Filter by date...</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {isFiltering && (
            <Button variant="ghost" onClick={handleShowAll} className="w-full sm:w-auto">
              <XCircle className="mr-2 h-4 w-4" /> Show All Readings
            </Button>
          )}
        </div>
      </div>

      {displayedReadings.length === 0 && isFiltering ? (
        <Card className="shadow-md">
          <CardContent className="p-6 text-center">
            <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No readings scheduled for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : 'the selected date'}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-24rem)] rounded-md"> {/* Removed border and shadow-inner */}
          <div className="p-1 md:p-4 space-y-4"> {/* Added md:p-4 for more spacing on larger screens */}
            {displayedReadings.map((reading, index) => (
              <Card key={index} className="w-full shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="p-4 md:p-6 pb-2">
                  <CardTitle className="text-xl">
                    {format(parseISO(reading.date), "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  {reading.passages.length > 0 ? (
                    <ul className="space-y-1.5">
                      {reading.passages.map((passage, pIndex) => (
                        <li key={pIndex} className="p-2.5 bg-background/60 border rounded-md text-sm">
                          <BookOpenCheck className="inline-block h-4 w-4 mr-2 text-muted-foreground" />
                          {passage}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No passages assigned for this day.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
