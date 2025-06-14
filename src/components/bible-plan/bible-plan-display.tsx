
"use client";

import type { DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { format, parseISO, isToday, isValid } from 'date-fns';
import { CalendarX, CheckSquare, CheckCircle2, BookOpen, BookHeart, Loader2, Info } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import type { AppUser } from '@/types';

interface BiblePlanDisplayProps {
  readingToDisplay: DailyReading | null;
  displayTitle: string; 
  currentUser?: AppUser | null;
  completedPassages: string[];
  togglePassageCompletion: (passageDisplayText: string) => Promise<void>;
  onToggleAllToday?: (passageTexts: string[], markComplete: boolean) => void; 
  allPassageTextsForDay?: string[]; 
  loading?: boolean;
  planAvailable?: boolean; 
  planDescription?: string; // Keep for non-homepage uses
  generatedDate?: string; // Keep for non-homepage uses
  hidePlanMeta?: boolean; // New prop
}

export default function BiblePlanDisplay({
  readingToDisplay,
  displayTitle,
  currentUser,
  completedPassages,
  togglePassageCompletion,
  onToggleAllToday,
  allPassageTextsForDay = [],
  loading = false,
  planAvailable = false,
  planDescription,
  generatedDate,
  hidePlanMeta = false, // Default to false
}: BiblePlanDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [isPassageViewerOpen, setIsPassageViewerOpen] = useState(false);
  const [selectedPassageRef, setSelectedPassageRef] = useState<string | null>(null);
  
  const { markMultiplePassages } = useUserBibleChecklist();


  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showIndividualCheckboxes = !!currentUser && !!togglePassageCompletion;

  const validPassagesForThisReading = useMemo(() => {
    return readingToDisplay?.passages.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '' && !p.displayText.startsWith("Error:")) || [];
  }, [readingToDisplay]);

  const isAllPassagesForThisReadingComplete = useMemo(() => {
    if (!allPassageTextsForDay || allPassageTextsForDay.length === 0) return false;
    const validTextsFromProp = allPassageTextsForDay.filter(text => text && !text.startsWith("Error:"));
    if (validTextsFromProp.length === 0) return false;
    return validTextsFromProp.every(text => completedPassages.includes(text));
  }, [allPassageTextsForDay, completedPassages]);

  const handleMasterCheckboxChange = (checked: boolean) => {
    if (onToggleAllToday && allPassageTextsForDay.length > 0) {
      const validPassageTextsToToggle = allPassageTextsForDay.filter(text => text && !text.startsWith("Error:"));
      if (validPassageTextsToToggle.length > 0) {
        onToggleAllToday(validPassageTextsToToggle, checked);
      }
    }
  };

  let parsedDayDate: Date | null = null;
  if (readingToDisplay?.date) {
    try {
      parsedDayDate = parseISO(readingToDisplay.date);
      if (!isValid(parsedDayDate)) throw new Error("Invalid date after parsing for today's reading");
    } catch (e) {
      console.error(`[BiblePlanDisplay] Invalid date for reading display: ${readingToDisplay.date}`, e);
      parsedDayDate = null;
    }
  }
  
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
    return null;
  }

  if (loading) {
    return (
      <Card className="mt-0 shadow-lg bg-card/80">
        <CardHeader className="p-2">
          <div className="flex items-center space-x-3">
            <BookHeart className="h-7 w-7 text-accent" />
            <h2 className="text-xl font-bold tracking-tight">{displayTitle}</h2>
          </div>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p className="text-muted-foreground">Loading readings...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!planAvailable && displayTitle.includes("Today")) { 
     return (
      <Card className="mt-0 shadow-lg bg-card/80">
        <CardHeader className="p-2">
          <div className="flex items-center space-x-3">
            <Info className="h-7 w-7 text-muted-foreground" />
            <h2 className="text-xl font-bold tracking-tight">{displayTitle}</h2>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No Bible reading plan has been set by the admin yet.</p>
        </CardContent>
      </Card>
    );
  }


  if (!readingToDisplay) {
    return (
      <Card className="mt-0 shadow-lg bg-card/80">
        <CardHeader className="p-2 flex flex-row items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
                <BookHeart className="h-7 w-7 text-accent" />
                <h2 className="text-xl font-bold tracking-tight">{displayTitle}</h2>
            </div>
        </CardHeader>
        <CardContent className="p-3 pt-2 border-t mt-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <CalendarX className="h-4 w-4 shrink-0" />
            <p>No reading scheduled for this time.</p>
          </div>
          {!hidePlanMeta && planDescription && (
            <CardDescription className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              Current Plan: "{planDescription}"
              {generatedDate && generatedDate !== "Unknown Generation Date" && isValid(parseISO(generatedDate)) && ` | Generated: ${format(parseISO(generatedDate), "MMM d, yyyy")}`}
            </CardDescription>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-0 shadow-lg bg-card/80">
        <CardHeader className="p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-2 border-b">
           <div className="flex items-center space-x-3">
            <BookHeart className="h-7 w-7 text-accent" />
            <h2 className="text-xl font-bold tracking-tight">{displayTitle}</h2>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto">
            <h3 className="text-sm font-semibold flex items-center self-start sm:self-end">
              {parsedDayDate ? format(parsedDayDate, "EEE, MMM d, yyyy") : "Reading Date"}
              {isAllPassagesForThisReadingComplete && validPassagesForThisReading.length > 0 && <CheckCircle2 className="ml-2 h-4 w-4 text-green-500 shrink-0" />}
            </h3>
            {showIndividualCheckboxes && onToggleAllToday && validPassagesForThisReading.length > 0 && (
              <div className="flex items-center space-x-1.5 shrink-0 self-start sm:self-end">
                <Checkbox
                  id={`master-checkbox-${displayTitle.replace(/\s+/g, '-')}`}
                  checked={isAllPassagesForThisReadingComplete}
                  onCheckedChange={(checked) => handleMasterCheckboxChange(Boolean(checked))}
                  aria-label={`Mark all passages for ${displayTitle} as complete`}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor={`master-checkbox-${displayTitle.replace(/\s+/g, '-')}`} className="text-xs text-muted-foreground cursor-pointer">
                  Mark All
                </Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 space-y-1.5">
          {validPassagesForThisReading.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {validPassagesForThisReading.map((passage, index) => {
                if (!passage || !passage.displayText || typeof passage.displayText !== 'string' || passage.displayText.trim() === '') {
                   console.warn(`[BiblePlanDisplay] RENDERING: Skipping invalid passage in map. Passage:`, passage ? JSON.parse(JSON.stringify(passage)) : "null/undefined passage");
                   return (
                      <li key={`error-passage-${index}`} className="p-1.5 text-xs italic text-destructive font-semibold">
                          Error: Invalid passage data for display.
                      </li>
                   );
                }

                const bookIdPart = (typeof passage.book === 'string' && passage.book.trim() !== '') ? passage.book.trim().replace(/\s+/g, '-') : `unknown-book-${index}`;
                const chapterIdPart = (passage.chapter !== undefined && (typeof passage.chapter === 'number' || (typeof passage.chapter === 'string' && String(passage.chapter).trim() !== ''))) ? String(passage.chapter) : `unknown-chapter-${index}`;
                const passageIdPart = `passage-${displayTitle.replace(/\s+/g, '-')}-${bookIdPart}-${chapterIdPart}-${index}`;

                const isChecked = completedPassages.includes(passage.displayText);
                const isPassageValid = !passage.displayText.startsWith("Error:");

                return (
                  <li key={passageIdPart} className="bg-background/50 border rounded-md flex items-center space-x-2 transition-colors hover:bg-muted/40 p-1.5 text-xs">
                    {showIndividualCheckboxes && (
                      <Checkbox
                        id={passageIdPart}
                        checked={isChecked}
                        onCheckedChange={() => togglePassageCompletion && togglePassageCompletion(passage.displayText)}
                        aria-label={`Mark ${passage.displayText} as read`}
                        className="h-3.5 w-3.5"
                        disabled={!isPassageValid}
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
                      {isPassageValid ? (
                        <Button
                          variant="link"
                          className={cn(
                            "p-0 h-auto text-xs font-normal text-left justify-start hover:no-underline",
                             isChecked ? "text-muted-foreground hover:text-muted-foreground/80" : "text-foreground hover:text-primary"
                          )}
                          onClick={() => handlePassageClick(passage.displayText)}
                          title={`View ${passage.displayText}`}
                        >
                          {passage.displayText}
                        </Button>
                      ) : (
                        <span className="text-destructive italic font-semibold">{passage.displayText || "Error: Passage Data Invalid"}</span>
                      )}
                    </Label>
                  </li>
                );
              })}
            </ul>
          ) : (
             <p className="text-muted-foreground text-xs p-1.5">No specific passages assigned for this reading.</p>
          )}
           {!hidePlanMeta && planDescription && (
            <CardDescription className="text-xs pt-2 border-t mt-2 text-muted-foreground">
              Plan: "{planDescription}"
              {generatedDate && generatedDate !== "Unknown Generation Date" && isValid(parseISO(generatedDate)) && ` | Generated: ${format(parseISO(generatedDate), "MMM d, yyyy")}`}
            </CardDescription>
          )}
        </CardContent>
      </Card>
      <BiblePassageViewerDialog
        isOpen={isPassageViewerOpen}
        onOpenChange={setIsPassageViewerOpen}
        passageReference={selectedPassageRef}
        completedPassages={completedPassages}
        markMultiplePassages={markMultiplePassages}
      />
    </>
  );
}
