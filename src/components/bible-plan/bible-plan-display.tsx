
"use client";

import type { BibleReadingPlan, DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox'; // Added
import { Label } from '@/components/ui/label'; // Added
import { format, parseISO, isToday } from 'date-fns';
import { BookOpenCheck, CalendarX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BiblePlanDisplayProps {
  plan: BibleReadingPlan | null;
  showPlanDetails?: boolean; // Keeps existing prop for other uses
  hideTitle?: boolean;
  // Props for homepage checklist interaction
  completedPassages?: string[];
  togglePassageCompletion?: (displayText: string) => void;
  currentUser?: any; // Simplified, useAuth().currentUser would be better if context is available here
}

export default function BiblePlanDisplay({
  plan,
  showPlanDetails = true, // Default remains true
  hideTitle = false,
  completedPassages = [], // Default to empty array
  togglePassageCompletion,
  currentUser,
}: BiblePlanDisplayProps) {
  const [todaysReading, setTodaysReading] = useState<DailyReading | null>(null);

  useEffect(() => {
    if (plan?.dailyReadings) {
      const foundReading = plan.dailyReadings.find(reading => {
        try {
          if (!reading || !reading.date) return false;
          const readingDate = parseISO(reading.date + 'T00:00:00Z'); 
          return isToday(readingDate);
        } catch (e) {
           console.error("Error parsing reading date for today's display:", reading?.date, e);
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
      <Card className="mt-0 shadow-lg">
        <CardContent className="p-3 text-center text-muted-foreground text-sm">
          <BookOpenCheck className="mx-auto h-10 w-10 mb-2 opacity-50" />
          No Bible reading plan has been set by the admin yet.
        </CardContent>
      </Card>
    );
  }
  
  if (!todaysReading) {
     return (
      <Card className="mt-0 shadow-lg">
        <CardHeader className="p-3 flex flex-row items-center space-x-2">
          <CalendarX className="h-5 w-5 text-muted-foreground shrink-0" />
          <CardTitle className="text-lg font-medium">
            No Reading for Today
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const showCheckboxes = !!currentUser && !!togglePassageCompletion;

  return (
    <Card className="mt-0 shadow-lg">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start space-x-2">
           {!hideTitle && ( // Icon only shown if title is shown
             <BookOpenCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
           )}
          <div className="flex-grow">
            {!hideTitle && (
              <CardTitle className="text-lg mb-1">
                Today's Reading: {todaysReading.date ? format(parseISO(todaysReading.date), "MMMM d, yyyy") : "Invalid Date"}
              </CardTitle>
            )}
            {showPlanDetails && plan.planDescription && (
              <CardDescription className="text-xs">
                Plan: "{plan.planDescription}" | Generated: {plan.generatedDate ? format(parseISO(plan.generatedDate), "PPP p") : "Unknown"}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {todaysReading.passages && todaysReading.passages.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {todaysReading.passages.map((passage, index) => {
              if (!passage) {
                console.warn(`[BiblePlanDisplay] RENDERING: Passage object is null/undefined at index ${index} for today.`);
                return ( <li key={`error-passage-${index}`} className="text-destructive font-semibold p-2 bg-destructive/10 rounded-md"> Error: Corrupt passage data. </li>);
              }
              const currentPassageDisplayText = (typeof passage.displayText === 'string') ? passage.displayText.trim() : '';
              const isPassageValid = currentPassageDisplayText !== '';
              const passageId = `today-passage-${index}-${passage.book}-${passage.chapter}`;
              const isChecked = isPassageValid && completedPassages.includes(currentPassageDisplayText);

              if(!isPassageValid){
                console.warn(`[BiblePlanDisplay] RENDERING: displayText is invalid for passage. Passage:`, passage ? JSON.parse(JSON.stringify(passage)) : "null/undefined passage");
              }

              return (
                <li key={passageId} className="bg-background/50 border rounded-md flex items-center space-x-2 transition-colors hover:bg-muted/40 p-2 text-sm">
                  {showCheckboxes && isPassageValid && (
                    <Checkbox 
                      id={passageId} 
                      checked={isChecked} 
                      onCheckedChange={() => togglePassageCompletion(currentPassageDisplayText)} 
                      aria-label={`Mark ${currentPassageDisplayText} as read`}
                      className="h-3.5 w-3.5"
                    />
                  )}
                  {showCheckboxes && !isPassageValid && (
                     <Checkbox id={passageId} checked={false} disabled className="h-3.5 w-3.5" />
                  )}
                  <Label 
                    htmlFor={showCheckboxes && isPassageValid ? passageId : undefined} 
                    className={cn(
                      "flex-grow", 
                      showCheckboxes && isPassageValid && "cursor-pointer", 
                      isChecked && "line-through text-muted-foreground",
                      !isPassageValid && "text-destructive font-semibold italic"
                    )}
                  >
                    {isPassageValid ? currentPassageDisplayText : "Error: Passage Data Invalid"}
                  </Label>
                </li>
              );
            })}
          </ul>
        ) : (
           <p className="text-muted-foreground text-sm p-2 bg-background/50 border rounded-md">No specific passages assigned for today.</p>
        )}
      </CardContent>
    </Card>
  );
}
