'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ReadingCheckRow } from '@/components/bible-plan/plan-progress';
import { Button } from '@/components/ui/button';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { makeManualPassageKey, makePassageKey } from '@/lib/passage-keys';
import { isPassageCompletedForPlan } from '@/lib/reading-utils';
import type { DailyReading } from '@/types';

export function formatBibleDayLabels(date: Date, lang: string) {
  const locale = lang === 'ko' ? ko : enUS;
  return {
    dayLabel: format(date, 'EEEE', { locale }).toUpperCase(),
    dateLabel: format(date, lang === 'ko' ? 'yyyy.MM.dd' : 'dd/MM/yyyy', { locale }),
  };
}

interface BibleReadingDayCardProps {
  reading: DailyReading | null;
  parsedDate: Date | null;
  lang: string;
  completedPassages: string[];
  planDailyReadings?: DailyReading[] | null;
  /** Ring at top-right — omit to hide. */
  progressRing?: { value: number; ratioLabel: string };
  emptyMessage?: string;
  footer?: ReactNode;
  afterPassages?: ReactNode;
  showCheckboxes?: boolean;
  onToggle?: (passageDisplayText: string, date?: string) => void;
  onRead: (passageDisplayText: string) => void;
  markMultiplePassages?: (passageKeys: string[], markAsComplete: boolean) => Promise<void>;
  markDayReadLabel?: string;
  markDayUnreadLabel?: string;
}

/** Home + full-plan day block: day, date, optional ring, passage checklist. */
export function BibleReadingDayCard({
  reading,
  parsedDate,
  lang,
  completedPassages,
  planDailyReadings = null,
  progressRing,
  emptyMessage,
  footer,
  afterPassages,
  showCheckboxes = true,
  onToggle,
  onRead,
  markMultiplePassages,
  markDayReadLabel,
  markDayUnreadLabel,
}: BibleReadingDayCardProps) {
  const [isMarkingDay, setIsMarkingDay] = useState(false);

  const validPassages =
    reading?.passages.filter(
      (p) => p.displayText && !p.displayText.startsWith('Error:'),
    ) ?? [];

  const isDayComplete = useMemo(() => {
    if (!reading?.date || validPassages.length === 0) return false;
    return validPassages.every((passage) =>
      isPassageCompletedForPlan(reading.date, passage.displayText, completedPassages, {
        dailyReadings: planDailyReadings,
      }),
    );
  }, [reading?.date, validPassages, completedPassages, planDailyReadings]);

  const showMarkDayButton =
    showCheckboxes &&
    markMultiplePassages &&
    markDayReadLabel &&
    markDayUnreadLabel &&
    validPassages.length > 0 &&
    reading?.date;

  async function handleMarkDay() {
    if (!markMultiplePassages || !reading?.date || validPassages.length === 0) return;
    const keys = validPassages.map((passage) => makePassageKey(reading.date, passage.displayText));
    setIsMarkingDay(true);
    try {
      await markMultiplePassages(keys, !isDayComplete);
    } finally {
      setIsMarkingDay(false);
    }
  }

  const { dayLabel, dateLabel } = parsedDate
    ? formatBibleDayLabels(parsedDate, lang)
    : { dayLabel: '', dateLabel: '' };

  return (
    <div className="ui-card-flat overflow-hidden">
      {parsedDate ? (
        <div className="home-bible-hero">
          <div className="home-bible-hero-main">
            <div className="home-bible-day-block">
              <p className="home-bible-day">{dayLabel}</p>
              <p className="home-bible-date">{dateLabel}</p>
            </div>
            {progressRing ? (
              <div className="home-bible-ring-block">
                <ProgressRing value={progressRing.value} size={54} strokeWidth={3.5} />
                <p className="home-bible-ratio">{progressRing.ratioLabel}</p>
              </div>
            ) : showMarkDayButton ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-lg text-xs"
                disabled={isMarkingDay}
                onClick={() => void handleMarkDay()}
              >
                {isMarkingDay ? <ButtonSpinner size="sm" className="mr-2" /> : null}
                {isDayComplete ? markDayUnreadLabel : markDayReadLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {validPassages.length > 0 ? (
        <div className="reading-check-table">
          {validPassages.map((p) => {
            const date = reading?.date;
            const done = date
              ? isPassageCompletedForPlan(date, p.displayText, completedPassages, {
                  dailyReadings: planDailyReadings,
                })
              : completedPassages.includes(makeManualPassageKey(p.displayText));
            return (
              <ReadingCheckRow
                key={`${date}-${p.displayText}`}
                label={p.displayText}
                done={done}
                animate={false}
                onToggle={() => onToggle?.(p.displayText, date)}
                onRead={() => onRead(p.displayText)}
                disabled={!showCheckboxes || !onToggle}
              />
            );
          })}
        </div>
      ) : emptyMessage ? (
        <p className="home-bible-empty">{emptyMessage}</p>
      ) : null}

      {afterPassages}

      {footer}
    </div>
  );
}

export function dayReadingProgress(
  reading: DailyReading,
  completedPassages: string[],
  planDailyReadings: DailyReading[] | null | undefined,
) {
  const valid =
    reading.passages?.filter((p) => p.displayText && !p.displayText.startsWith('Error:')) ?? [];
  if (valid.length === 0) return { value: 0, completed: 0, total: 0 };
  const completed = valid.filter((p) =>
    isPassageCompletedForPlan(reading.date, p.displayText, completedPassages, {
      dailyReadings: planDailyReadings,
    }),
  ).length;
  return {
    value: Math.round((completed / valid.length) * 100),
    completed,
    total: valid.length,
  };
}
