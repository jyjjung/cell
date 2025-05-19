
"use client";

import type { BibleReadingPlan, DailyReading } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO,isToday } from 'date-fns';
import { BookOpenCheck, CalendarX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BiblePlanDisplayProps {
  plan: BibleReadingPlan | null;
  showPlanDetails?: boolean;
  isCompact?: boolean; // For compact styling
  hideTitle?: boolean; // To hide the "Today's Reading: {date}" title
}

export default function BiblePlanDisplay({
  plan,
  showPlanDetails = true,
  isCompact = false,
  hideTitle = false,
}: BiblePlanDisplayProps) {
  const [todaysReading, setTodaysReading] = useState<DailyReading | null>(null);

  useEffect(() => {
    if (plan?.dailyReadings) {
      const foundReading = plan.dailyReadings.find(reading => {
        try {
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
      <Card className="mt-0"> {/* This card is a specific message, compact view might not apply or apply differently */}
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
        <CardHeader className={cn(
          "flex flex-row items-center space-x-2",
          isCompact ? "p-3" : "p-4"
        )}>
          <CalendarX className="h-6 w-6 text-muted-foreground shrink-0" />
          <CardTitle className={cn("text-2xl", isCompact ? "text-lg font-medium" : "")}>
            No Reading for Today
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-0 shadow-lg">
      <CardHeader className={cn(
        isCompact ? "p-3 pb-2" : "pb-3"
      )}>
        <div className="flex items-start space-x-2">
           <BookOpenCheck className={cn(
            "h-6 w-6 mt-1 shrink-0", // Added mt-1 for potential better alignment if title is hidden
            isCompact ? "text-muted-foreground" : "text-primary"
          )} />
          <div className="flex-grow">
            {!hideTitle && (
              <CardTitle className={cn(
                "text-2xl",
                isCompact ? "text-lg mb-1" : "mb-0" 
              )}>
                Today's Reading: {format(parseISO(todaysReading.date), "MMMM d, yyyy")}
              </CardTitle>
            )}
            {showPlanDetails && plan && ( // This will be false on homepage due to props
              <CardDescription className={cn(isCompact ? "text-xs" : "")}>
                Plan: "{plan.planDescription}" | Generated: {format(parseISO(plan.generatedDate), "PPP p")}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(
        isCompact ? "p-3 pt-1" : "pt-0" // Adjusted compact padding
      )}>
        {todaysReading.passages.length > 0 ? (
          <ul className={cn(
            "space-y-1.5", 
            isCompact ? "text-base" : "text-lg"
          )}>
            {todaysReading.passages.map((passage, index) => (
              <li key={index} className={cn(
                "bg-background/60 border rounded-md shadow-sm",
                isCompact ? "p-2 text-sm" : "p-3"
              )}>
                {passage}
              </li>
            ))}
          </ul>
        ) : (
           <p className={cn("text-muted-foreground", isCompact ? "text-sm" : "")}>No specific passages assigned for today.</p>
        )}
      </CardContent>
    </Card>
  );
}
