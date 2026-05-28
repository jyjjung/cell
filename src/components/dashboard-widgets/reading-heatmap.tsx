"use client";

import { useMemo } from 'react';
import { format, parseISO, isValid, differenceInDays, subDays } from 'date-fns';
import { DailyReading } from '@/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { makePassageKey } from '@/hooks/use-user-bible-checklist';

interface ReadingHeatmapProps {
  dailyReadings: DailyReading[];
  completedPassages: string[];
  daysToShow?: number;
}

export default function ReadingHeatmap({ dailyReadings, completedPassages, daysToShow = 90 }: ReadingHeatmapProps) {
  const heatmapData = useMemo(() => {
    const today = new Date();
    const data = [];

    // Map plan to date -> count
    const planMap = new Map<string, { total: number, complete: number }>();

    dailyReadings.forEach(day => {
      const d = parseISO(day.date);
      if (!isValid(d)) return;
      const key = format(d, 'yyyy-MM-dd');

      const validPassages = day.passages?.filter(p => p.displayText && !p.displayText.startsWith('Error:')) || [];
      const total = validPassages.length;
      const complete = validPassages.filter(p =>
        completedPassages.includes(makePassageKey(day.date, p.displayText)) ||
        completedPassages.includes(p.displayText) // legacy fallback
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

  // Split into weeks (cols of 7 days)
  type HeatmapDay = { date: Date, key: string, total: number, complete: number, hasReading: boolean };
  const columns: (HeatmapDay | null)[][] = [];
  let currentCol: (HeatmapDay | null)[] = [];

  // Align to Sunday start
  const firstDay = heatmapData[0]?.date.getDay() || 0;
  for (let i = 0; i < firstDay; i++) {
    currentCol.push(null); // pad empty
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

  return (
    <div className="glass-card p-6 rounded-3xl w-full overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary/80">Reading Consistency</h3>
        <p className="text-xs text-muted-foreground font-medium">Last {daysToShow} days</p>
      </div>

      <div className="flex gap-1.5 min-w-max">
        <TooltipProvider>
          {columns.map((col, x) => (
            <div key={x} className="flex flex-col gap-1.5">
              {col.map((day, y) => {
                if (!day) return <div key={y} className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm invisible" />;

                let intensityClass = 'bg-muted/30 border border-transparent'; // no reading / missed
                if (day.hasReading) {
                  if (day.complete === day.total) {
                    intensityClass = "bg-primary border border-primary/50";
                  } else if (day.complete > 0) {
                    intensityClass = "bg-primary/40 border border-primary/20";
                  } else {
                    intensityClass = "bg-muted/50 border border-input";
                  }
                }

                const ratio = day.hasReading ? `${day.complete}/${day.total}` : '0/0';
                const label = day.hasReading
                  ? `${day.complete === day.total ? 'Completed' : day.complete > 0 ? 'Partial' : 'No'} reading on ${format(day.date, 'MMM d, yyyy')}`
                  : `No assigned reading on ${format(day.date, 'MMM d, yyyy')}`;

                return (
                  <Tooltip key={day.key} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] sm:rounded-[5px] transition-all hover:scale-125 cursor-pointer z-10", intensityClass)} />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs rounded-xl font-medium px-3 py-1.5 bg-card border-border shadow-xl">
                      {label} <span className="text-muted-foreground ml-1">({ratio})</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2 mt-4 text-[10px] uppercase font-bold text-muted-foreground tracking-wider justify-end">
        Less
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-muted/30" />
          <div className="w-3 h-3 rounded-sm bg-muted/50 border border-input" />
          <div className="w-3 h-3 rounded-sm bg-primary/40" />
          <div className="w-3 h-3 rounded-sm bg-primary" />
        </div>
        More
      </div>
    </div>
  );
}
