
"use client";

import type { DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { format, parseISO, isToday, isValid, isBefore, startOfDay } from 'date-fns';
import { CalendarX, CheckSquare, CheckCircle, BookOpen, BookHeart, Loader2, Info, Check, ChevronDown } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { makePassageKey } from '@/hooks/use-user-bible-checklist';
import type { AppUser } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';

interface BiblePlanDisplayProps {
  readingToDisplay: DailyReading | null;
  displayTitle?: string;
  currentUser?: AppUser | null;
  completedPassages: string[];
  togglePassageCompletion: (passageDisplayText: string, date?: string) => Promise<void>;
  onToggleAllToday?: (passageTexts: string[], markComplete: boolean) => void;
  allPassageTextsForDay?: string[];
  loading?: boolean;
  planAvailable?: boolean;
  planDescription?: string;
  generatedDate?: string;
  hidePlanMeta?: boolean;
  defaultOpen?: boolean;
  isStandalone?: boolean; // New prop
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
  defaultOpen = false,
  isStandalone = false, // Default to not standalone
}: BiblePlanDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isTogglingDay, setIsTogglingDay] = useState(false);
  
  const { openBibleReader } = useGlobalBibleReader();

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
    const date = readingToDisplay?.date;
    return validTextsFromProp.every(text => {
      if (date) {
        return completedPassages.includes(makePassageKey(date, text)) || completedPassages.includes(text);
      }
      return completedPassages.includes(text);
    });
  }, [allPassageTextsForDay, completedPassages, readingToDisplay?.date]);
  
  let parsedDayDate: Date | null = null;
  if (readingToDisplay?.date) {
    try {
      parsedDayDate = parseISO(readingToDisplay.date);
      if (!isValid(parsedDayDate)) throw new Error("Invalid date after parsing for today's reading");
    } catch (e) {
      console.error(`[BiblePlanDisplay] Invalid date for reading display: '${readingToDisplay.date}'`, e);
      parsedDayDate = null;
    }
  }

  const isCurrentDay = parsedDayDate ? isToday(parsedDayDate) : false;
  const isOverdueDay = parsedDayDate ? !isAllPassagesForThisReadingComplete && isBefore(parsedDayDate, startOfDay(new Date())) : false;


  const handlePassageClick = (passageDisplayText: string | undefined) => {
    if (passageDisplayText && typeof passageDisplayText === 'string' && !passageDisplayText.toLowerCase().includes("error:")) {
      const parsed = parsePassageReferenceForNavigation(passageDisplayText);
      if (parsed) {
        openBibleReader(parsed.book, parsed.chapter);
      } else {
        console.error("Failed to parse passage:", passageDisplayText);
      }
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
      <div className="p-8 bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-xl text-center">
        <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No Bible reading plan has been set by the admin yet.</p>
      </div>
    );
  }

  if (!readingToDisplay) {
    return (
      <div className="p-6 bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-md flex items-center justify-between">
         <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <CalendarX className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
                <p className="text-base font-bold tracking-tight">No reading scheduled</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Sabbath Rest</p>
            </div>
         </div>
      </div>
    );
  }

  const CardContentComponent = (
    <div className="p-4 pt-2">
       <div 
          className="space-y-1"
        >
          {validPassagesForThisReading.length > 0 ? (
            <ul 
              className="space-y-2 text-sm">
              {validPassagesForThisReading.map((passage, index) => {
                const passageIdPart = `passage-${readingToDisplay.date}-${index}`;
                const date = readingToDisplay.date;
                const isChecked = date
                  ? completedPassages.includes(makePassageKey(date, passage.displayText)) || completedPassages.includes(passage.displayText)
                  : completedPassages.includes(passage.displayText);
                const isPassageValid = !passage.displayText.startsWith("Error:");

                return (
                  <li
                    key={passageIdPart}
                    className="flex items-center space-x-3 p-2 rounded-md min-w-0 transition-colors bg-background/30"
                  >
                    {showIndividualCheckboxes && (
                      <Checkbox
                        id={passageIdPart}
                        checked={isChecked}
                        onCheckedChange={() => togglePassageCompletion(passage.displayText, readingToDisplay.date)}
                        aria-label={`Mark '${passage.displayText}' as read`}
                        className="h-5 w-5"
                        disabled={!isPassageValid || isTogglingDay}
                      />
                    )}
                    <Label
                      htmlFor={showIndividualCheckboxes ? passageIdPart : undefined}
                      className={cn(
                        "flex-grow font-medium min-w-0",
                        "text-base",
                        showIndividualCheckboxes && "cursor-pointer",
                        isChecked && "line-through text-muted-foreground"
                      )}
                    >
                      {isPassageValid ? (
                        <Button
                          variant="link"
                          className={cn(
                            "p-0 h-auto font-medium text-left justify-start hover:no-underline truncate",
                            "text-base",
                            isChecked ? "text-muted-foreground hover:text-muted-foreground/80" : "text-foreground hover:text-primary"
                          )}
                          onClick={() => handlePassageClick(passage.displayText)}
                          title={`View '${passage.displayText}'`}
                          disabled={isTogglingDay}
                        >
                          <span className="truncate">{passage.displayText}</span>
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
            <p className="text-muted-foreground text-sm p-2">No specific passages assigned for this reading.</p>
          )}
          {!hidePlanMeta && planDescription && (
            <CardDescription className="text-xs pt-2 border-t mt-2 text-muted-foreground">
              Plan: "{planDescription}"
              {generatedDate && generatedDate !== "Unknown Generation Date" && isValid(parseISO(generatedDate)) && ` | Generated: '${format(parseISO(generatedDate), "MMM d, yyyy")}'`}
            </CardDescription>
          )}
        </div>
    </div>
  );

  const HeaderComponent = (
    <div className="flex justify-between items-center w-full group py-1">
      <div className="text-left">
        {parsedDayDate && (
          <>
            <p className={cn(
                "text-[11px] font-bold uppercase tracking-wider mb-1 transition-colors",
                isAllPassagesForThisReadingComplete ? "text-success" :
                isCurrentDay ? "text-primary" :
                isOverdueDay ? "text-destructive" :
                "text-muted-foreground/80"
            )}>
                {format(parsedDayDate, "EEEE")}
            </p>
             <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {format(parsedDayDate, "MMMM d")}
             </p>
          </>
        )}
      </div>
    </div>
  );

  const CardWrapper = ({ children }: {children: React.ReactNode}) => (
    <div 
        className={cn(
            "relative hover:shadow-xl transition-all duration-300 rounded-[2rem] border overflow-hidden backdrop-blur-xl", 
            isAllPassagesForThisReadingComplete ? "bg-success/5 border-success/30 shadow-success/10" :
            isCurrentDay ? "bg-primary/5 border-primary/30 shadow-primary/10" :
            isOverdueDay ? "bg-destructive/5 border-destructive/30 shadow-destructive/10" : "bg-card/40 border-border/50 shadow-lg"
        )}
    >
      {children}
    </div>
  );

  return (
    <>
      {isStandalone ? (
        <CardWrapper>
          <CardHeader className="p-4">
            {HeaderComponent}
          </CardHeader>
          <div className="border-t">
            {CardContentComponent}
          </div>
        </CardWrapper>
      ) : (
        <AccordionItem value={readingToDisplay.date || 'bible-reading-item'} className="border-b-0 mb-4 last:mb-0">
           <div className={cn(
              "relative hover:shadow-xl transition-all duration-300 rounded-[2rem] border overflow-hidden backdrop-blur-xl", 
              isAllPassagesForThisReadingComplete ? "bg-success/5 border-success/30 shadow-success/10" :
              isCurrentDay ? "bg-primary/5 border-primary/30 shadow-primary/10" :
              isOverdueDay ? "bg-destructive/5 border-destructive/30 shadow-destructive/10" : "bg-card/40 border-border/50 shadow-lg hover:border-primary/20"
          )}>
            <AccordionTrigger className="px-8 py-6 w-full group rounded-t-[2rem] transition-colors [&[data-state=open]]:bg-black/5 dark:[&[data-state=open]]:bg-white/5 hover:no-underline">
              {HeaderComponent}
            </AccordionTrigger>
            <AccordionContent>
              {CardContentComponent}
            </AccordionContent>
          </div>
        </AccordionItem>
      )}
    </>
  );
}
