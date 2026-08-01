"use client";

import { useMemo } from 'react';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
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
  /** Week columns to show, matching GitHub’s year graph. */
  weeksToShow?: number;
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

/** GitHub contribution graphs use ~53 week columns. */
const DEFAULT_WEEKS = 53;

const CELL_CLASS =
  "size-[11px] sm:size-3 rounded-[2px] sm:rounded-[3px] transition-transform hover:scale-125 cursor-pointer z-10";

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
  weeksToShow = DEFAULT_WEEKS,
}: ReadingHeatmapProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const { columns, rangeLabel } = useMemo(() => {
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

    // GitHub-style: fixed week columns ending this week (or plan end if later).
    const rangeEnd = endOfWeek(isAfter(planEnd, today) ? planEnd : today);
    const rangeStart = startOfWeek(subWeeks(rangeEnd, weeksToShow - 1));

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((d) => {
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
      } satisfies HeatmapDay;
    });

    const nextColumns: HeatmapDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      nextColumns.push(days.slice(i, i + 7));
    }

    return {
      columns: nextColumns,
      rangeLabel: `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`,
    };
  }, [dailyReadings, completedPassages, weeksToShow]);

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

      <div className="w-full overflow-x-auto">
        <TooltipProvider>
          <div className="inline-flex min-w-full justify-between gap-[3px] sm:gap-1">
            {columns.map((col, x) => (
              <div key={x} className="flex flex-col gap-[3px] sm:gap-1">
                {col.map((day) => {
                  const ratio = day.hasReading ? `${day.complete}/${day.total}` : '0/0';
                  return (
                    <Tooltip key={day.key} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className={cn(CELL_CLASS, heatClassForDay(day))} />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs font-medium px-3 py-1.5">
                        {getTooltipLabel(day)}{' '}
                        <span className="text-muted-foreground ml-1">({ratio})</span>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </div>

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
