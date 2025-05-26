
"use client";

import type { BibleReadingPlan, DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format, parseISO, isToday } from 'date-fns';
import { BookOpenCheck, CalendarX, CheckSquare } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface BiblePlanDisplayProps {
  plan: BibleReadingPlan | null;
  showPlanDetails?: boolean;
  hideTitle?: boolean;
  isCompact?: boolean; // Retained for potential future use if needed, but mostly compact by default now
  completedPassages?: string[];
  togglePassageCompletion?: (displayText: string) => void;
  currentUser?: any;
  onToggleAllToday?: (passageTexts: string[], markComplete: boolean) => void;
  allTodaysPassageTexts?: string[];
}

export default function BiblePlanDisplay({
  plan,
  showPlanDetails = true,
  hideTitle = false,
  isCompact = true, // Compact by default
  completedPassages = [],
  togglePassageCompletion,
  currentUser,
  onToggleAllToday,
  allTodaysPassageTexts = [],
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

  const isAllTodaysPassagesComplete = useMemo(() => {
    if (!allTodaysPassageTexts || allTodaysPassageTexts.length === 0) return false;
    return allTodaysPassageTexts.every(text => completedPassages.includes(text));
  }, [allTodaysPassageTexts, completedPassages]);

  const handleMasterCheckboxChange = (checked: boolean) => {
    if (onToggleAllToday && allTodaysPassageTexts.length > 0) {
      onToggleAllToday(allTodaysPassageTexts, checked);
    }
  };


  if (!plan) {
    return (
      <Card className="mt-0 shadow-lg">
        <CardContent className={cn("text-center text-muted-foreground", isCompact ? "p-3 text-xs" : "p-4 text-sm")}>
          <BookOpenCheck className={cn("mx-auto mb-2 opacity-50", isCompact ? "h-8 w-8" : "h-10 w-10")} />
          No Bible reading plan has been set by the admin yet.
        </CardContent>
      </Card>
    );
  }

  if (!todaysReading) {
     return (
      <Card className="mt-0 shadow-lg">
        <CardHeader className={cn("flex flex-row items-center space-x-2", isCompact ? "p-2.5" : "p-3")}>
          <CalendarX className={cn("shrink-0", isCompact ? "h-4 w-4 text-muted-foreground" : "h-5 w-5 text-muted-foreground")} />
          <CardTitle className={cn("font-medium", isCompact ? "text-sm" : "text-base")}>
            No Reading for Today
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-0 shadow-lg">
      <CardHeader className={cn("pb-2", isCompact ? "p-2.5" : "p-3")}>
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
             {!hideTitle && (
               <BookOpenCheck className={cn("shrink-0 text-primary", isCompact ? "h-4 w-4 mt-0.5" : "h-5 w-5 mt-0.5")} />
             )}
            <div className="flex-grow">
              {!hideTitle && (
                <CardTitle className={cn("mb-0.5", isCompact ? "text-base" : "text-lg")}>
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
          {/* Master Checkbox for Today's Reading */}
          {showIndividualCheckboxes && onToggleAllToday && allTodaysPassageTexts.length > 0 && (
            <div className="flex items-center space-x-1.5 shrink-0">
              <Checkbox
                id="today-master-checkbox"
                checked={isAllTodaysPassagesComplete}
                onCheckedChange={(checked) => handleMasterCheckboxChange(Boolean(checked))}
                aria-label="Mark all today's passages as complete"
                className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")}
              />
              <Label htmlFor="today-master-checkbox" className={cn("text-muted-foreground cursor-pointer", isCompact ? "text-xs" : "text-sm")}>
                All Today
              </Label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("pt-1", isCompact ? "p-2.5" : "p-3")}>
        {todaysReading.passages && todaysReading.passages.length > 0 ? (
          <ul className={cn("space-y-1.5", isCompact ? "text-sm" : "text-sm")}>
            {todaysReading.passages.map((passage, index) => {
              if (!passage) {
                console.warn(`[BiblePlanDisplay] RENDERING: Passage object is null/undefined at index ${index} for today.`);
                return ( <li key={`error-passage-${index}`} className={cn("text-destructive font-semibold italic bg-destructive/10 rounded-md", isCompact ? "p-1.5 text-xs" : "p-2 text-sm")}> Error: Corrupt passage data. </li>);
              }
              const currentPassageDisplayText = (typeof passage.displayText === 'string') ? passage.displayText.trim() : '';
              const isPassageValid = currentPassageDisplayText !== '' && !currentPassageDisplayText.startsWith("Error:");

              let passageIdPart = `passage-${index}`;
              if (isPassageValid) {
                  const bookPart = (typeof passage.book === 'string' && passage.book) ? passage.book.replace(/\s+/g, '-') : `unknown-book`;
                  const chapterPart = passage.chapter ? String(passage.chapter) : 'unknown-chapter';
                  passageIdPart = `today-passage-${bookPart}-${chapterPart}-${index}`;
              } else {
                  console.warn(`[BiblePlanDisplay] RENDERING: displayText is invalid for passage. Date: ${todaysReading.date}, Index: ${index}. Passage:`, passage ? JSON.parse(JSON.stringify(passage)) : "null/undefined passage");
              }

              const isChecked = isPassageValid && completedPassages.includes(currentPassageDisplayText);

              return (
                <li key={passageIdPart} className={cn("bg-background/50 border rounded-md flex items-center space-x-2 transition-colors hover:bg-muted/40", isCompact ? "p-1.5 text-xs" : "p-2 text-sm")}>
                  {showIndividualCheckboxes && isPassageValid && (
                    <Checkbox
                      id={passageIdPart}
                      checked={isChecked}
                      onCheckedChange={() => togglePassageCompletion(currentPassageDisplayText)}
                      aria-label={`Mark ${currentPassageDisplayText} as read`}
                      className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")}
                    />
                  )}
                  {showIndividualCheckboxes && !isPassageValid && (
                     <Checkbox id={passageIdPart} checked={false} disabled className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} />
                  )}
                  <Label
                    htmlFor={showIndividualCheckboxes && isPassageValid ? passageIdPart : undefined}
                    className={cn(
                      "flex-grow",
                      showIndividualCheckboxes && isPassageValid && "cursor-pointer",
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
           <p className={cn("text-muted-foreground border rounded-md bg-background/50", isCompact ? "text-xs p-1.5" : "text-sm p-2")}>No specific passages assigned for today.</p>
        )}
      </CardContent>
    </Card>
  );
}
