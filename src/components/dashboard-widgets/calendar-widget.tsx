"use client";

import React, { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { eventOccursOnDate, parseDay } from '@/lib/event-occurrences';
import type { AppEvent, CleaningRosterEntry, QTRosterEntry } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events: AppEvent[];
  cleaningRoster: CleaningRosterEntry[];
  qtRoster: QTRosterEntry[];
}

export default function CalendarWidget({
  selectedDate,
  onDateSelect,
  events,
  cleaningRoster,
  qtRoster,
}: CalendarWidgetProps) {
  
  // Calculate which dates have which types of entries
  const modifiers = useMemo(() => {
    // This is expensive if we do it for every day in the view, 
    // but react-day-picker calls it efficiently or we can use a custom Day component
    return {
      hasEvent: (date: Date) => events.some(e => eventOccursOnDate(e, date)),
      hasCleaning: (date: Date) => cleaningRoster.some(r => isSameDay(parseDay(r.date), date)),
      hasQT: (date: Date) => qtRoster.some(r => isSameDay(parseDay(r.date), date)),
    };
  }, [events, cleaningRoster, qtRoster]);

  return (
    <Card className="p-4 rounded-[2.5rem] bg-card/30 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onDateSelect(date)}
        modifiers={modifiers}
        className="p-0 border-none w-full"
        classNames={{
          months: "w-full focus:outline-none",
          month: "w-full space-y-4",
          caption: "flex justify-center pt-1 relative items-center px-4 mb-4 min-h-[40px]",
          caption_label: "text-sm font-black uppercase font-mono tracking-[0.2em] text-foreground",
          nav: "flex items-center",
          nav_button: "h-9 w-9 bg-background/50 backdrop-blur-md border border-border/40 p-0 flex items-center justify-center rounded-2xl opacity-60 hover:opacity-100 hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-90",
          nav_button_previous: "absolute left-2 z-10",
          nav_button_next: "absolute right-2 z-10",
          table: "w-full border-collapse space-y-1",
          head_row: "grid grid-cols-7 w-full mb-4 px-1",
          head_cell: "text-muted-foreground/40 font-black text-[9px] uppercase tracking-widest text-center",
          row: "grid grid-cols-7 w-full mt-2 justify-items-center",
          cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          day: cn(
            "h-11 w-11 p-0 font-bold aria-selected:opacity-100 transition-all rounded-2xl mx-auto flex items-center justify-center relative",
            "hover:bg-primary/20 hover:text-primary active:scale-90"
          ),
          day_selected: "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary hover:text-primary-foreground",
          day_today: "bg-accent/50 text-accent-foreground",
          day_outside: "opacity-20",
          day_disabled: "text-muted-foreground opacity-50",
          day_hidden: "invisible",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
          Day: ({ date, displayMonth, ...props }) => {
            const isSelected = isSameDay(date, selectedDate);
            const isOutside = date.getMonth() !== displayMonth.getMonth();
            const hasEvent = modifiers.hasEvent(date);
            const hasCleaning = modifiers.hasCleaning(date);
            const hasQT = modifiers.hasQT(date);

            return (
              <button
                {...props}
                type="button"
                onClick={() => onDateSelect(date)}
                className={cn(
                  "h-11 w-11 rounded-2xl flex flex-col items-center justify-center relative transition-all group",
                  isSelected ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" : "hover:bg-muted/50",
                  isOutside ? "opacity-20" : "opacity-100",
                  isSameDay(date, new Date()) && !isSelected && "border border-primary/30 text-primary"
                )}
              >
                <span className="z-10 text-xs font-black">{format(date, 'd')}</span>
                
                {/* Dots container */}
                <div className="absolute bottom-2 left-0 right-0 flex gap-0.5 justify-center z-20">
                  {hasEvent && (
                    <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-orange-500")} />
                  )}
                  {hasCleaning && (
                    <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-emerald-500")} />
                  )}
                  {hasQT && (
                    <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-primary")} />
                  )}
                </div>
              </button>
            );
          }
        }}
      />
    </Card>
  );
}
