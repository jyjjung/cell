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

export default function ReadingHeatmap({ dailyReadings, completedPassages, daysToShow = 90 }: ReadingHeatmapProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const heatmapData = useMemo(() => {
    const today = new Date();
    const data = [];

    const planMap = new Map<string, { total: number, complete: number }>();

    dailyReadings.forEach(day => {
      const d = parseISO(day.date);
      if (!isValid(d)) return;
      const key = format(d, 'yyyy-MM-dd');

      const validPassages = day.passages?.filter(p => p.displayText && !p.displayText.startsWith('Error:')) || [];
      const total = validPassages.length;
      const complete = validPassages.filter(p =>
        completedPassages.includes(makePassageKey(day.date, p.displayText))
      ).length;
      planMap.set(key, { total, complete });
    });

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      const stats = planMap.get(key);
      data.push({
        date: d,
        key,
        total: stats?.total || 0,
        complete: stats?.complete || 0,
        hasReading: !!stats && stats.total > 0
      });
    }

    return data;
  }, [dailyReadings, completedPassages, daysToShow]);

  type HeatmapDay = { date: Date, key: string, total: number, complete: number, hasReading: boolean };
  const columns: (HeatmapDay | null)[][] = [];
  let currentCol: (HeatmapDay | null)[] = [];

  const firstDay = heatmapData[0]?.date.getDay() || 0;
  for (let i = 0; i < firstDay; i++) {
    currentCol.push(null);
  }

  heatmapData.forEach(day => {
    currentCol.push(day);
    if (currentCol.length === 7) {
      columns.push(currentCol);
      currentCol = [];
    }
  });

  if (currentCol.length > 0) {
    while (currentCol.length < 7) currentCol.push(null);
    columns.push(currentCol);
  }

  const getTooltipLabel = (day: HeatmapDay) => {
    const dateStr = format(day.date, 'MMM d, yyyy');
    if (!day.hasReading) return `${t.noAssignedReading} · ${dateStr}`;
    const status = day.complete === day.total
      ? t.readingCompleted
      : day.complete > 0
        ? t.readingPartial
        : t.readingMissed;
    return `${status} · ${dateStr}`;
  };

  return (
    <div className="widget-surface w-full overflow-x-auto">
      <div className="panel-header">
        <h3 className="panel-title">{t.readingConsistency}</h3>
        <p className="text-micro-label">{t.lastNDays(daysToShow)}</p>
      </div>

      <div className="flex gap-1.5 min-w-max">
        <TooltipProvider>
          {columns.map((col, x) => (
            <div key={x} className="flex flex-col gap-1.5">
              {col.map((day, y) => {
                if (!day) return <div key={y} className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm invisible" />;

                let intensityClass: string = themeHeat.empty;
                if (day.hasReading) {
                  if (day.complete === day.total) {
                    intensityClass = themeHeat.complete;
                  } else if (day.complete > 0) {
                    intensityClass = themeHeat.partial;
                  } else {
                    intensityClass = themeHeat.missed;
                  }
                }

                const ratio = day.hasReading ? `${day.complete}/${day.total}` : '0/0';

                return (
                  <Tooltip key={day.key} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] sm:rounded-[5px] transition-all hover:scale-125 cursor-pointer z-10", intensityClass)} />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs font-medium px-3 py-1.5">
                      {getTooltipLabel(day)} <span className="text-muted-foreground ml-1">({ratio})</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2 mt-3 text-micro-label justify-end">
        {t.less}
        <div className="flex gap-1">
          <div className={cn("w-3 h-3 rounded-sm", themeHeat.empty)} />
          <div className={cn("w-3 h-3 rounded-sm", themeHeat.missed)} />
          <div className={cn("w-3 h-3 rounded-sm", themeHeat.partial)} />
          <div className={cn("w-3 h-3 rounded-sm", themeHeat.complete)} />
        </div>
        {t.more}
      </div>
    </div>
  );
}
