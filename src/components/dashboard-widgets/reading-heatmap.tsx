"use client";

import { useMemo } from 'react';
import { format, parseISO, isValid, subDays } from 'date-fns';
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
  daysToShow?: number;
}

type HeatmapDay = {
  date: Date;
  key: string;
  total: number;
  complete: number;
  hasReading: boolean;
};

function heatClassForDay(day: HeatmapDay): string {
  if (!day.hasReading || day.complete <= 0) return themeHeat.empty;
  if (day.complete >= day.total) return themeHeat.complete;
  return themeHeat.partial;
}

export default function ReadingHeatmap({ dailyReadings, completedPassages, daysToShow = 90 }: ReadingHeatmapProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const { columns } = useMemo(() => {
    const today = new Date();
    const planMap = new Map<string, { total: number; complete: number }>();

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

    const heatmapData: HeatmapDay[] = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      const stats = planMap.get(key);
      heatmapData.push({
        date: d,
        key,
        total: stats?.total || 0,
        complete: stats?.complete || 0,
        hasReading: !!stats && stats.total > 0,
      });
    }

    const nextColumns: (HeatmapDay | null)[][] = [];
    let currentCol: (HeatmapDay | null)[] = [];

    const firstDay = heatmapData[0]?.date.getDay() || 0;
    for (let i = 0; i < firstDay; i++) currentCol.push(null);

    heatmapData.forEach((day) => {
      currentCol.push(day);
      if (currentCol.length === 7) {
        nextColumns.push(currentCol);
        currentCol = [];
      }
    });

    if (currentCol.length > 0) {
      while (currentCol.length < 7) currentCol.push(null);
      nextColumns.push(currentCol);
    }

    return { columns: nextColumns };
  }, [dailyReadings, completedPassages, daysToShow]);

  const getTooltipLabel = (day: HeatmapDay) => {
    const dateStr = format(day.date, 'MMM d, yyyy');
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
        <p className="text-micro-label">{t.lastNDays(daysToShow)}</p>
      </div>

      <div className="flex w-full gap-[3px] sm:gap-1">
        <TooltipProvider>
          {columns.map((col, x) => (
            <div key={x} className="flex min-w-0 flex-1 flex-col gap-[3px] sm:gap-1">
              {col.map((day, y) => {
                if (!day) {
                  return <div key={y} className="aspect-square w-full rounded-[3px] sm:rounded-[4px] invisible" />;
                }

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
          ))}
        </TooltipProvider>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-micro-label">
        {t.less}
        <div className="flex gap-1">
          <div className={cn("h-3 w-3 rounded-sm", themeHeat.empty)} />
          <div className={cn("h-3 w-3 rounded-sm", themeHeat.partial)} />
          <div className={cn("h-3 w-3 rounded-sm", themeHeat.complete)} />
        </div>
        {t.more}
      </div>
    </div>
  );
}
