
"use client";

import type { BibleReadingPlan, DailyReading } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO,isToday, startOfDay } from 'date-fns';
import { BookOpenCheck, CalendarX } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BiblePlanDisplayProps {
  plan: BibleReadingPlan | null;
}

export default function BiblePlanDisplay({ plan }: BiblePlanDisplayProps) {
  const [todaysReading, setTodaysReading] = useState<DailyReading | null>(null);
  const [currentDateString, setCurrentDateString] = useState('');

  useEffect(() => {
    // This effect runs only on the client after hydration
    const today = startOfDay(new Date()); // Use startOfDay for consistent date comparison
    setCurrentDateString(format(today, "MMMM d, yyyy"));

    if (plan?.dailyReadings) {
      const foundReading = plan.dailyReadings.find(reading => {
        // Dates in dailyReadings are YYYY-MM-DD strings.
        // Need to parse them carefully, assuming UTC or local based on how they were created.
        // For simplicity, parsing as local time.
        try {
          const readingDate = parseISO(reading.date + 'T00:00:00'); // Assume date string is just YYYY-MM-DD
          return isToday(readingDate);
        } catch (e) {
          // if date is not parseable, for example plan was just generated and is in YYYY-MM-DD format
           try {
             const readingDate = parseISO(reading.date);
             return isToday(readingDate);
           } catch (e2) {
             console.error("Error parsing reading date:", reading.date, e2);
             return false;
           }
        }
      });
      setTodaysReading(foundReading || null);
    } else {
      setTodaysReading(null);
    }
  }, [plan]);


  if (!plan) {
    return (
      <Card className="mt-0">
        <CardContent className="p-6 text-center text-muted-foreground">
          <BookOpenCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
          No Bible reading plan has been set by the admin yet.
        </CardContent>
      </Card>
    );
  }
  
  if (!todaysReading) {
     return (
      <Card className="mt-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CalendarX className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-2xl">No Reading for Today</CardTitle>
          </div>
           <CardDescription>
            Today is {currentDateString}. There are no specific readings scheduled for today in the current plan, or the plan might not cover today.
            <br/>
            Plan generated on: {format(parseISO(plan.generatedDate), "PPP p")}. Original references: "{plan.originalReferenceInput}".
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2">
           <BookOpenCheck className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">Today's Reading: {format(parseISO(todaysReading.date), "MMMM d, yyyy")}</CardTitle>
        </div>
        <CardDescription>
          From plan covering: "{plan.originalReferenceInput}" | Generated: {format(parseISO(plan.generatedDate), "PPP p")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {todaysReading.passages.length > 0 ? (
          <ul className="space-y-2 text-lg">
            {todaysReading.passages.map((passage, index) => (
              <li key={index} className="p-3 bg-background/50 border rounded-md shadow-sm">
                {passage}
              </li>
            ))}
          </ul>
        ) : (
           <p className="text-muted-foreground">No specific passages assigned for today.</p>
        )}
      </CardContent>
    </Card>
  );
}
