
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface BiblePlanDisplayProps {
  readingToDisplay: DailyReading | null;
  displayTitle?: string;
  currentUser?: AppUser | null;
  completedPassages: string[];
  togglePassageCompletion: (passageDisplayText: string) => Promise<void>;
  onToggleAllToday?: (passageTexts: string[], markComplete: boolean) => void;
  allPassageTextsForDay?: string[];
  loading?: boolean;
  planAvailable?: boolean;
  planDescription?: string;
  generatedDate?: string;
  hidePlanMeta?: boolean;
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
  hidePlanMeta = false,
}: BiblePlanDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const [isTogglingDay, setIsTogglingDay] = useState(false);

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

  const passageSummary = useMemo(() => {
    return validPassagesForThisReading.map(p => p.displayText).join(', ');
  }, [validPassagesForThisReading]);

  const isAllPassagesForThisReadingComplete = useMemo(() => {
    if (!allPassageTextsForDay || allPassageTextsForDay.length === 0) return false;
    const validTextsFromProp = allPassageTextsForDay.filter(text => text && !text.startsWith("Error:"));
    if (validTextsFromProp.length === 0) return false;
    return validTextsFromProp.every(text => completedPassages.includes(text));
  }, [allPassageTextsForDay, completedPassages]);

  const handleMarkDayComplete = async () => {
    if (onToggleAllToday && allPassageTextsForDay.length > 0) {
      const validPassageTextsToToggle = allPassageTextsForDay.filter(text => text && !text.startsWith("Error:"));
      if (validPassageTextsToToggle.length > 0) {
        setIsTogglingDay(true);
        try {
          await onToggleAllToday(validPassageTextsToToggle, true);
          let dayDateFormatted = "this day";
          if (parsedDayDate) dayDateFormatted = format(parsedDayDate, "MMM d");
          toast({ title: "Day Marked Complete", description: `All passages for ${dayDateFormatted} marked as read.` });
        } catch (error: any) {
          toast({ title: "Error", description: `Could not mark day complete: ${error.message}`, variant: "destructive" });
        } finally {
          setIsTogglingDay(false);
        }
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
      <Card className="bg-card/80 rounded-md shadow-sm">
        <CardHeader className="p-3">
           <div className="h-4 bg-muted rounded w-3/4 animate-pulse mb-1"></div>
           <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-1.5">
            <div className="h-5 bg-muted rounded w-full animate-pulse"></div>
            <div className="h-5 bg-muted rounded w-5/6 animate-pulse"></div>
            <div className="h-5 bg-muted rounded w-full animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!planAvailable && displayTitle?.includes("Today")) { 
     return (
      <Card>
        <CardHeader className="p-4">
           {displayTitle && (
            <div className="flex items-center space-x-3 mb-2">
              <Info className="h-6 w-6 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight">{displayTitle}</h2>
            </div>
           )}
        </CardHeader>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">No Bible reading plan has been set by the admin yet.</p>
        </CardContent>
      </Card>
    );
  }

  if (!readingToDisplay) {
    return (
      <Card>
        <CardHeader className="p-4">
             <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CalendarX className="h-4 w-4 shrink-0" />
                <p>No reading scheduled for today.</p>
            </div>
        </CardHeader>
        {!hidePlanMeta && planDescription && (
            <CardContent className="p-4 pt-0">
                <CardDescription className="text-xs text-muted-foreground">
                Current Plan: "{planDescription}"
                {generatedDate && generatedDate !== "Unknown Generation Date" && isValid(parseISO(generatedDate)) && ` | Generated: ${format(parseISO(generatedDate), "MMM d, yyyy")}`}
                </CardDescription>
            </CardContent>
        )}
      </Card>
    );
  }

  return (
    <>
      <AccordionItem value={readingToDisplay.date} className="border-b-0">
         <Card className="bg-card/90 rounded-lg shadow-sm w-full">
            <AccordionTrigger className="p-3 hover:no-underline w-full">
              <div className="flex justify-between items-center w-full">
                  <div className="text-left">
                      {parsedDayDate && (
                          <p className="text-sm font-semibold text-primary">{format(parsedDayDate, "EEEE").toUpperCase()}</p>
                      )}
                      <p className="text-sm text-muted-foreground font-normal truncate max-w-[200px] sm:max-w-xs">{passageSummary}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAllPassagesForThisReadingComplete && validPassagesForThisReading.length > 0 && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                    {currentUser && onToggleAllToday && validPassagesForThisReading.length > 0 && !isAllPassagesForThisReadingComplete && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleMarkDayComplete(); }}
                            disabled={isTogglingDay}
                            className="h-auto py-1 px-2 text-xs"
                        >
                            {isTogglingDay ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckSquare className="mr-2 h-3 w-3" />}
                            Mark as Read
                        </Button>
                    )}
                  </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-3 pt-0 space-y-1">
                {validPassagesForThisReading.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {validPassagesForThisReading.map((passage, index) => {
                      const passageIdPart = `passage-${readingToDisplay.date}-${index}`;
                      const isChecked = completedPassages.includes(passage.displayText);
                      const isPassageValid = !passage.displayText.startsWith("Error:");

                      return (
                        <li key={passageIdPart} className="bg-background/70 border rounded-md flex items-center space-x-2 p-2 transition-colors hover:bg-muted/40">
                          {showIndividualCheckboxes && (
                            <Checkbox
                              id={passageIdPart}
                              checked={isChecked}
                              onCheckedChange={() => togglePassageCompletion && togglePassageCompletion(passage.displayText)}
                              aria-label={`Mark ${passage.displayText} as read`}
                              className="h-4 w-4"
                              disabled={!isPassageValid || isTogglingDay}
                            />
                          )}
                          <Label
                            htmlFor={showIndividualCheckboxes ? passageIdPart : undefined}
                            className={cn(
                              "flex-grow font-medium",
                              "text-xs",
                              showIndividualCheckboxes && "cursor-pointer",
                              isChecked && "line-through text-muted-foreground"
                            )}
                          >
                            {isPassageValid ? (
                              <Button
                                variant="link"
                                className={cn(
                                  "p-0 h-auto font-medium text-left justify-start hover:no-underline",
                                  "text-xs",
                                  isChecked ? "text-muted-foreground hover:text-muted-foreground/80" : "text-foreground hover:text-primary"
                                )}
                                onClick={() => handlePassageClick(passage.displayText)}
                                title={`View ${passage.displayText}`}
                                disabled={isTogglingDay}
                              >
                                {passage.displayText}
                              </Button>
                            ) : (
                              <span className="text-destructive italic font-semibold text-xs">{passage.displayText || "Error: Passage Data Invalid"}</span>
                            )}
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs p-2">No specific passages assigned for this reading.</p>
                )}
                {!hidePlanMeta && planDescription && (
                  <CardDescription className="text-xs pt-2 border-t mt-2 text-muted-foreground">
                    Plan: "{planDescription}"
                    {generatedDate && generatedDate !== "Unknown Generation Date" && isValid(parseISO(generatedDate)) && ` | Generated: ${format(parseISO(generatedDate), "MMM d, yyyy")}`}
                  </CardDescription>
                )}
              </div>
            </AccordionContent>
          </Card>
      </AccordionItem>
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
