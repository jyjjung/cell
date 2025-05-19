
"use client";

import type { BibleReadingPlan, DailyReading } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO,isToday } from 'date-fns';
import { BookOpenCheck, CalendarX } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BiblePlanDisplayProps {
  plan: BibleReadingPlan | null;
}

export default function BiblePlanDisplay({ plan }: BiblePlanDisplayProps) {
  const [todaysReading, setTodaysReading] = useState<DailyReading | null>(null);

  useEffect(() => {
    if (plan?.dailyReadings) {
      const foundReading = plan.dailyReadings.find(reading => {
        try {
          // Ensure date string is treated as UTC midnight to avoid timezone shifts with isToday
          const readingDate = parseISO(reading.date + 'T00:00:00Z'); 
          return isToday(readingDate);
        } catch (e) {
           console.error("Error parsing reading date for today's display:", reading.date, e);
           return false;
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
          Plan: "{plan.planDescription}" | Generated: {format(parseISO(plan.generatedDate), "PPP p")}
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
