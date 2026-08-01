"use client";

import { useMemo } from 'react';
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';
import { DailyReading } from '@/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { makePassageKey } from '@/lib/passage-keys';
import { themeHeat } from '@/lib/theme-status';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

interface ReadingHeatmapProps {
  dailyReadings: DailyReading[];
  completedPassages: string[];
  /** Minimum days so the wrapping grid can fill the card. */
  minDays?: number;
}

type DayKind = 'outside' | 'future' | 'active';

type HeatmapDay = {
  date: Date;
  key: string;
  total: number;
  complete: number;
  hasReading: boolean;
  kind: DayKind;
  outsideSide?: 'before' | 'after';
};

/** Enough cells for several filled rows on a typical phone/desktop card. */
const DEFAULT_MIN_DAYS = 180;

function heatClassForDay(day: HeatmapDay): string {
  if (day.kind === 'outside' || day.kind === 'future') return themeHeat.outside;
  if (!day.hasReading || day.complete <= 0) return themeHeat.empty;
  if (day.complete >= day.total) return themeHeat.complete;
  return themeHeat.partial;
}

function parsePlanBounds(dailyReadings: DailyReading[]): { start: Date; end: Date } | null {
  let start: Date | null = null;
  let end: Date | null = null;

  for (const day of dailyReadings) {
    const d = parseISO(day.date);
    if (!isValid(d)) continue;
    const dayStart = startOfDay(d);
    if (!start || isBefore(dayStart, start)) start = dayStart;
    if (!end || isAfter(dayStart, end)) end = dayStart;
  }

  if (!start || !end) return null;
  return { start, end };
}

export default function ReadingHeatmap({
  dailyReadings,
  completedPassages,
  minDays = DEFAULT_MIN_DAYS,
}: ReadingHeatmapProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const { days, rangeLabel } = useMemo(() => {
    const today = startOfDay(new Date());
    const planMap = new Map<string, { total: number; complete: number }>();
    const bounds = parsePlanBounds(dailyReadings);

    dailyReadings.forEach((day) => {
      const d = parseISO(day.date);
      if (!isValid(d)) return;
      const key = format(d, 'yyyy-MM-dd');

      const validPassages =
        day.passages?.filter((p) => p.displayText && !p.displayText.startsWith('Error:')) || [];
      const total = validPassages.length;
      const complete = validPassages.filter((p) =>
        completedPassages.includes(makePassageKey(day.date, p.displayText)),
      ).length;
      planMap.set(key, { total, complete });
    });

    const planStart = bounds?.start ?? today;
    const planEnd = bounds?.end ?? today;
    let rangeStart = planStart;
    let rangeEnd = isAfter(planEnd, today) ? planEnd : today;

    const span = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
    if (span < minDays) {
      const missing = minDays - span;
      const padBefore = Math.ceil(missing / 2);
      const padAfter = missing - padBefore;
      rangeStart = addDays(rangeStart, -padBefore);
      rangeEnd = addDays(rangeEnd, padAfter);
    }

    const days: HeatmapDay[] = eachDayOfInterval({
      start: rangeStart,
      end: rangeEnd,
    }).map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const stats = planMap.get(key);
      const hasReading = !!stats && stats.total > 0;
      const beforePlan = isBefore(d, planStart);
      const afterPlan = isAfter(d, planEnd);
      const isFuture = isAfter(d, today);

      let kind: DayKind = 'active';
      let outsideSide: HeatmapDay['outsideSide'];
      if (beforePlan) {
        kind = 'outside';
        outsideSide = 'before';
      } else if (afterPlan) {
        kind = 'outside';
        outsideSide = 'after';
      } else if (isFuture) {
        kind = 'future';
      }

      return {
        date: d,
        key,
        total: stats?.total || 0,
        complete: stats?.complete || 0,
        hasReading,
        kind,
        outsideSide,
      };
    });

    return {
      days,
      rangeLabel: `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`,
    };
  }, [dailyReadings, completedPassages, minDays]);

  const getTooltipLabel = (day: HeatmapDay) => {
    const dateStr = format(day.date, 'MMM d, yyyy');
    if (day.kind === 'outside') {
      return day.outsideSide === 'after'
        ? `${t.afterPlan} · ${dateStr}`
        : `${t.beforePlan} · ${dateStr}`;
    }
    if (day.kind === 'future') {
      return day.hasReading
        ? `${t.upcomingReading} · ${dateStr}`
        : `${t.noAssignedReading} · ${dateStr}`;
    }
    if (!day.hasReading) return `${t.noAssignedReading} · ${dateStr}`;
    const status =
      day.complete === day.total
        ? t.readingCompleted
        : day.complete > 0
          ? t.readingPartial
          : t.readingMissed;
    return `${status} · ${dateStr}`;
  };

  return (
    <div className="widget-surface w-full">
      <div className="panel-header">
        <h3 className="panel-title">{t.readingConsistency}</h3>
        <p className="text-micro-label">{rangeLabel}</p>
      </div>

      <TooltipProvider>
        <div
          className="grid w-full gap-[3px] sm:gap-1"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(0.7rem, 1fr))' }}
        >
          {days.map((day) => {
            const ratio = day.hasReading ? `${day.complete}/${day.total}` : '0/0';
            return (
              <Tooltip key={day.key} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "aspect-square w-full rounded-[3px] sm:rounded-[4px] transition-transform hover:scale-110 cursor-pointer z-10",
                      heatClassForDay(day),
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-medium px-3 py-1.5">
                  {getTooltipLabel(day)}{' '}
                  <span className="text-muted-foreground ml-1">({ratio})</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <div className="mt-3 flex items-center justify-end gap-2 text-micro-label">
        {t.less}
        <div className="flex gap-1">
          <div className={cn("h-3 w-3 rounded-sm", themeHeat.outside)} />
          <div className={cn("h-3 w-3 rounded-sm", themeHeat.empty)} />
          <div className={cn("h-3 w-3 rounded-sm", themeHeat.partial)} />
          <div className={cn("h-3 w-3 rounded-sm", themeHeat.complete)} />
        </div>
        {t.more}
      </div>
    </div>
  );
}
