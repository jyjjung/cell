
"use client";

import type { BibleReadingPlan, DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format, parseISO, isToday } from 'date-fns';
import { BookOpenCheck, CalendarX, CheckSquare, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface BiblePlanDisplayProps {
  plan: BibleReadingPlan | null;
  showPlanDetails?: boolean;
  hideTitle?: boolean;
  currentUser?: any; // Consider using AppUser type here
  completedPassages?: string[];
  togglePassageCompletion?: (displayText: string) => void;
  onToggleAllToday?: (passageTexts: string[], markComplete: boolean) => void;
  allTodaysPassageTexts?: string[];
}

export default function BiblePlanDisplay({
  plan,
  showPlanDetails = true,
  hideTitle = false,
  currentUser,
  completedPassages = [],
  togglePassageCompletion,
  onToggleAllToday,
  allTodaysPassageTexts = [],
}: BiblePlanDisplayProps) {
  const [todaysReading, setTodaysReading] = useState<DailyReading | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (plan?.dailyReadings) {
      const foundReading = plan.dailyReadings.find(reading => {
        try {
          if (!reading || !reading.date) return false;
          const readingDate = parseISO(reading.date); 
          return isToday(readingDate);
        } catch (e) {
           console.error("[BiblePlanDisplay] Error parsing reading date for today's display:", reading?.date, e);
           return false;
        }
      });
      setTodaysReading(foundReading || null);
    } else {
      setTodaysReading(null);
    }
  }, [plan]);

  const showIndividualCheckboxes = !!currentUser && !!togglePassageCompletion;

  const validPassagesForToday = useMemo(() => {
    return todaysReading?.passages.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '' && !p.displayText.startsWith("Error:")) || [];
  }, [todaysReading]);

  const isAllTodaysPassagesComplete = useMemo(() => {
    if (!allTodaysPassageTexts || allTodaysPassageTexts.length === 0) return false;
    // Ensure we only consider valid passages for completion status
    const validTextsFromProp = allTodaysPassageTexts.filter(text => text && !text.startsWith("Error:"));
    if (validTextsFromProp.length === 0) return false; // If no valid passages in prop, can't be complete
    return validTextsFromProp.every(text => completedPassages.includes(text));
  }, [allTodaysPassageTexts, completedPassages]);

  const handleMasterCheckboxChange = (checked: boolean) => {
    if (onToggleAllToday && allTodaysPassageTexts.length > 0) {
      const validPassageTextsToToggle = allTodaysPassageTexts.filter(text => text && !text.startsWith("Error:"));
      if (validPassageTextsToToggle.length > 0) {
        onToggleAllToday(validPassageTextsToToggle, checked);
      }
    }
  };
  
  let parsedTodaysDate: Date | null = null;
  if (todaysReading?.date) {
    try {
      parsedTodaysDate = parseISO(todaysReading.date);
      if(!isValid(parsedTodaysDate)) throw new Error("Invalid date after parsing for today's reading");
    } catch(e) {
      console.error(`[BiblePlanDisplay] Invalid date for today's reading display: ${todaysReading.date}`, e);
      parsedTodaysDate = null; // Ensure it's null if parsing fails
    }
  }

  if (!isMounted) {
    return null; 
  }

  if (!plan && !hideTitle) { // Only show this if not used in a context where title is hidden (like homepage)
    return (
      <Card className="mt-0 shadow-lg">
        <CardContent className="p-3 text-center text-xs text-muted-foreground">
          <BookOpenCheck className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No Bible reading plan has been set by the admin yet.
        </CardContent>
      </Card>
    );
  }
  
  if (!todaysReading && !hideTitle) { // Only show this if not used in a context where title is hidden
     return (
      <Card className="mt-0 shadow-lg">
        <CardHeader className="p-2 flex flex-row items-center space-x-2">
          <CalendarX className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            No Reading for Today
          </p>
        </CardHeader>
         {showPlanDetails && plan && plan.planDescription && (
          <CardContent className="p-2 pt-0 border-t mt-2">
            <CardDescription className="text-xs text-muted-foreground">
              Plan: "{plan.planDescription}"
              {plan.generatedDate && plan.generatedDate !== "Unknown Generation Date" && ` | Generated: ${format(parseISO(plan.generatedDate), "MMM d, yyyy p")}`}
            </CardDescription>
          </CardContent>
        )}
      </Card>
    );
  }
  
  // Simplified display for homepage if no reading or plan (title is hidden there)
  if (!plan || !todaysReading) {
    return (
         <Card className="mt-0 shadow-lg bg-card/80">
            <CardHeader className="p-2 flex flex-row items-center space-x-2">
                <CalendarX className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                    No Reading for Today
                </p>
            </CardHeader>
        </Card>
    );
  }


  return (
    <Card className="mt-0 shadow-lg bg-card/80">
      <CardHeader className="p-2 flex flex-row items-center justify-between space-x-2 border-b">
        <h3 className="text-sm font-semibold flex items-center">
          {parsedTodaysDate ? format(parsedTodaysDate, "EEE, MMM d, yyyy") : "Today's Reading"}
          {isAllTodaysPassagesComplete && validPassagesForToday.length > 0 && <CheckCircle2 className="ml-2 h-4 w-4 text-green-500 shrink-0" />}
        </h3>
        {showIndividualCheckboxes && onToggleAllToday && validPassagesForToday.length > 0 && (
            <div className="flex items-center space-x-1.5 shrink-0">
              <Checkbox
                id="today-master-checkbox-homepage"
                checked={isAllTodaysPassagesComplete}
                onCheckedChange={(checked) => handleMasterCheckboxChange(Boolean(checked))}
                aria-label="Mark all today's passages as complete"
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="today-master-checkbox-homepage" className="text-xs text-muted-foreground cursor-pointer">
                All
              </Label>
            </div>
          )}
      </CardHeader>
      <CardContent className="p-2 space-y-1.5">
        {validPassagesForToday.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {validPassagesForToday.map((passage, index) => {
              if (!passage || !passage.displayText || passage.displayText.startsWith("Error:")) {
                 console.warn(`[BiblePlanDisplay] RENDERING: Skipping invalid passage in map. Passage:`, passage ? JSON.parse(JSON.stringify(passage)) : "null/undefined passage");
                 return (
                    <li key={`error-passage-${index}`} className="p-1.5 text-xs italic text-destructive font-semibold">
                        Error: Invalid passage data for display.
                    </li>
                 );
              }
              
              const passageIdPart = `homepage-today-passage-${passage.book?.replace(/\s+/g, '-') || `unknown-book`}-${passage.chapter || 'unknown-chapter'}-${index}`;
              const isChecked = completedPassages.includes(passage.displayText);

              return (
                <li key={passageIdPart} className="bg-background/50 border rounded-md flex items-center space-x-2 transition-colors hover:bg-muted/40 p-1.5 text-xs">
                  {showIndividualCheckboxes && (
                    <Checkbox
                      id={passageIdPart}
                      checked={isChecked}
                      onCheckedChange={() => togglePassageCompletion && togglePassageCompletion(passage.displayText)}
                      aria-label={`Mark ${passage.displayText} as read`}
                      className="h-3.5 w-3.5"
                    />
                  )}
                  <Label
                    htmlFor={showIndividualCheckboxes ? passageIdPart : undefined}
                    className={cn(
                      "flex-grow",
                      showIndividualCheckboxes && "cursor-pointer",
                      isChecked && "line-through text-muted-foreground"
                    )}
                  >
                    {passage.displayText}
                  </Label>
                </li>
              );
            })}
          </ul>
        ) : (
           <p className="text-muted-foreground text-xs p-1.5">No specific passages assigned for today.</p>
        )}
         {showPlanDetails && plan.planDescription && (
          <CardDescription className="text-xs pt-2 border-t mt-2 text-muted-foreground">
            Plan: "{plan.planDescription}"
            {plan.generatedDate && plan.generatedDate !== "Unknown Generation Date" && ` | Generated: ${format(parseISO(plan.generatedDate), "MMM d, yyyy p")}`}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}

function isValid(date: any) {
  return date instanceof Date && !isNaN(date.getTime());
}

