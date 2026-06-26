"use client";

import type { DailyReading } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { format, parseISO, isToday, isValid, isBefore, startOfDay } from 'date-fns';
import { CalendarX, Info, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { makePassageKey } from '@/hooks/use-user-bible-checklist';
import type { AppUser } from '@/types';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/lib/translations';

interface BiblePlanDisplayProps {
  readingToDisplay: DailyReading | null;
  displayTitle?: string;
  currentUser?: AppUser | null;
  completedPassages: string[];
  togglePassageCompletion: (passageDisplayText: string, date?: string) => Promise<void>;
  markMultiplePassages?: (passageKeys: string[], markAsComplete: boolean) => Promise<void>;
  allPassageTextsForDay?: string[];
  loading?: boolean;
  planAvailable?: boolean;
  planDescription?: string;
  generatedDate?: string;
  hidePlanMeta?: boolean;
  defaultOpen?: boolean;
  isStandalone?: boolean;
}

const spring = { type: 'spring' as const, stiffness: 500, damping: 35 };

export default function BiblePlanDisplay({
  readingToDisplay,
  displayTitle,
  currentUser,
  completedPassages,
  togglePassageCompletion,
  markMultiplePassages,
  allPassageTextsForDay = [],
  loading = false,
  planAvailable = false,
  planDescription,
  generatedDate,
  hidePlanMeta = false,
  isStandalone = false,
}: BiblePlanDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMarkingDay, setIsMarkingDay] = useState(false);
  const { openBibleReader } = useGlobalBibleReader();
  const t = translations[currentUser?.preferredLanguage || 'en'];

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

  const handleMarkDay = async () => {
    if (!markMultiplePassages || !readingToDisplay?.date || validPassagesForThisReading.length === 0) return;
    const keys = validPassagesForThisReading.map((passage) =>
      makePassageKey(readingToDisplay.date, passage.displayText),
    );
    setIsMarkingDay(true);
    try {
      await markMultiplePassages(keys, !isAllPassagesForThisReadingComplete);
    } finally {
      setIsMarkingDay(false);
    }
  };

  const MarkDayButton = showIndividualCheckboxes && markMultiplePassages && validPassagesForThisReading.length > 0 ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 shrink-0 rounded-lg text-xs"
      onClick={() => void handleMarkDay()}
      disabled={isMarkingDay}
    >
      {isMarkingDay ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
      {isAllPassagesForThisReadingComplete ? t.markDayAsUnread : t.markDayAsRead}
    </Button>
  ) : null;

  const surfaceClass = cn(
    'ui-card space-y-3',
    isAllPassagesForThisReadingComplete && 'ring-1 ring-success/25',
    isCurrentDay && !isAllPassagesForThisReadingComplete && 'ring-1 ring-blue-500/25',
    isOverdueDay && 'ring-1 ring-destructive/25',
  );

  if (!isMounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="ui-card space-y-3 animate-pulse">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="space-y-2 pt-1">
          <div className="h-8 w-full rounded bg-muted" />
          <div className="h-8 w-5/6 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!planAvailable && displayTitle?.includes("Today")) {
    return (
      <div className="ui-card p-6 text-center">
        <Info className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No reading plan set yet.</p>
      </div>
    );
  }

  if (!readingToDisplay) {
    return (
      <div className="ui-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">No reading today</p>
            <p className="text-xs text-muted-foreground">Rest day</p>
          </div>
        </div>
      </div>
    );
  }

  const HeaderComponent = (
    <div className="text-left">
      {parsedDayDate && (
        <>
          <p className={cn(
            'text-eyebrow',
            isAllPassagesForThisReadingComplete ? 'text-success' :
            isCurrentDay ? 'text-blue-600 dark:text-blue-400' :
            isOverdueDay ? 'text-destructive' :
            undefined,
          )}>
            {format(parsedDayDate, 'EEEE')}
          </p>
          <p className="text-section-title mt-0.5">
            {format(parsedDayDate, 'MMMM d')}
          </p>
        </>
      )}
    </div>
  );

  const PassageList = (
    <div className="space-y-0.5">
      {validPassagesForThisReading.length > 0 ? (
        <AnimatePresence mode="popLayout">
          {validPassagesForThisReading.map((passage, index) => {
            const passageIdPart = `passage-${readingToDisplay.date}-${index}`;
            const date = readingToDisplay.date;
            const isChecked = date
              ? completedPassages.includes(makePassageKey(date, passage.displayText)) || completedPassages.includes(passage.displayText)
              : completedPassages.includes(passage.displayText);
            const isPassageValid = !passage.displayText.startsWith('Error:');

            return (
              <motion.div
                key={passageIdPart}
                layout
                transition={spring}
                className={cn('flex items-center gap-3 rounded-lg py-2', isChecked && 'opacity-45')}
              >
                {showIndividualCheckboxes && (
                  <Checkbox
                    id={passageIdPart}
                    checked={isChecked}
                    onCheckedChange={() => togglePassageCompletion(passage.displayText, readingToDisplay.date)}
                    aria-label={`Mark '${passage.displayText}' as read`}
                    className="h-4 w-4 shrink-0"
                    disabled={!isPassageValid}
                  />
                )}
                {isPassageValid ? (
                  <button
                    type="button"
                    onClick={() => handlePassageClick(passage.displayText)}
                    className={cn(
                      'flex-1 text-left text-sm font-medium',
                      isChecked && 'line-through text-muted-foreground',
                    )}
                  >
                    {passage.displayText}
                  </button>
                ) : (
                  <span className="flex-1 text-sm font-medium text-destructive italic">
                    {passage.displayText || 'Error: Passage Data Invalid'}
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      ) : (
        <p className="text-sm text-muted-foreground">No specific passages assigned for this reading.</p>
      )}
      {!hidePlanMeta && planDescription && (
        <p className="border-t border-border/50 pt-3 text-xs text-muted-foreground">
          Plan: &quot;{planDescription}&quot;
          {generatedDate && generatedDate !== 'Unknown Generation Date' && isValid(parseISO(generatedDate)) && ` | Generated: '${format(parseISO(generatedDate), 'MMM d, yyyy')}'`}
        </p>
      )}
    </div>
  );

  if (isStandalone) {
    return (
      <div className={surfaceClass}>
        <div className="flex items-start justify-between gap-3">
          {HeaderComponent}
          {MarkDayButton}
        </div>
        {PassageList}
      </div>
    );
  }

  return (
    <AccordionItem value={readingToDisplay.date || 'bible-reading-item'} className="mb-3 border-b-0 last:mb-0">
      <div className={cn(surfaceClass, 'overflow-hidden p-0')}>
        <AccordionTrigger className="w-full px-4 py-3 hover:no-underline [&[data-state=open]]:bg-muted/30">
          {HeaderComponent}
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {MarkDayButton ? <div className="mb-2 flex justify-end">{MarkDayButton}</div> : null}
          {PassageList}
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}
