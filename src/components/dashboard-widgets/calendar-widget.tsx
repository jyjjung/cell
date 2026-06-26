"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  addMonths,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  startOfMonth,
  startOfToday,
  subMonths,
} from "date-fns";
import { expandEventsToOccurrenceRows, parseDay } from "@/lib/event-occurrences";
import type { AppEvent, CleaningRosterEntry, QTRosterEntry } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";

interface CalendarWidgetProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events: AppEvent[];
  cleaningRoster: CleaningRosterEntry[];
  qtRoster: QTRosterEntry[];
  myDutyDateKeys?: Set<string>;
}

type DayActivity = { event: boolean; cleaning: boolean; qt: boolean; myDuty: boolean };

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export default function CalendarWidget({
  selectedDate,
  onDateSelect,
  events,
  cleaningRoster,
  qtRoster,
  myDutyDateKeys,
}: CalendarWidgetProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const [month, setMonth] = useState<Date>(startOfMonth(selectedDate));
  const today = startOfToday();

  useEffect(() => {
    setMonth((prev) =>
      prev.getMonth() === selectedDate.getMonth() && prev.getFullYear() === selectedDate.getFullYear()
        ? prev
        : startOfMonth(selectedDate)
    );
  }, [selectedDate]);

  const activityByDate = useMemo(() => {
    const map = new Map<string, DayActivity>();
    const touch = (date: Date, key: keyof DayActivity) => {
      const k = dateKey(date);
      const cur = map.get(k) ?? { event: false, cleaning: false, qt: false, myDuty: false };
      cur[key] = true;
      map.set(k, cur);
    };

    const rangeStart = startOfMonth(subMonths(month, 1));
    const rangeEnd = endOfMonth(addMonths(month, 1));

    expandEventsToOccurrenceRows(events, { from: rangeStart, until: rangeEnd }).forEach((row) => {
      if (!isBefore(row.occurrenceDate, today)) touch(row.occurrenceDate, "event");
    });

    cleaningRoster.forEach((r) => {
      const d = parseDay(r.date);
      if (!isBefore(d, today)) touch(d, "cleaning");
    });

    qtRoster.forEach((r) => {
      const d = parseDay(r.date);
      if (!isBefore(d, today)) touch(d, "qt");
    });

    myDutyDateKeys?.forEach((key) => {
      const d = parseDay(key);
      if (!isBefore(d, today)) touch(d, "myDuty");
    });

    return map;
  }, [events, cleaningRoster, qtRoster, myDutyDateKeys, month, today]);

  const modifiers = useMemo(
    () => ({
      hasEvent: (date: Date) => activityByDate.get(dateKey(date))?.event ?? false,
      hasCleaning: (date: Date) => activityByDate.get(dateKey(date))?.cleaning ?? false,
      hasQT: (date: Date) => activityByDate.get(dateKey(date))?.qt ?? false,
      hasMyDuty: (date: Date) => activityByDate.get(dateKey(date))?.myDuty ?? false,
    }),
    [activityByDate]
  );

  return (
    <div>
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        selected={selectedDate}
        onSelect={(date) => date && onDateSelect(date)}
        modifiers={modifiers}
        showOutsideDays
        className="w-full border-none p-2 sm:p-3"
        classNames={{
          months: "w-full",
          month: "w-full space-y-2",
          caption: "relative mb-2 flex items-center justify-center px-8",
          caption_label: "text-sm font-semibold text-foreground",
          nav: "flex items-center gap-1",
          nav_button:
            "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          nav_button_previous: "absolute left-0",
          nav_button_next: "absolute right-0",
          table: "w-full border-collapse",
          head_row: "grid grid-cols-7",
          head_cell: "py-1 text-center text-micro-label",
          row: "mt-0.5 grid grid-cols-7",
          cell: "relative p-0 text-center focus-within:z-10",
          day: "hidden",
          day_selected: "hidden",
          day_today: "hidden",
          day_outside: "hidden",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
          Day: ({ date, displayMonth, ...props }) => {
            const isSelected = isSameDay(date, selectedDate);
            const isOutside = date.getMonth() !== displayMonth.getMonth();
            const isToday = isSameDay(date, today);
            const activity = activityByDate.get(dateKey(date));
            const hasEvent = activity?.event;
            const hasCleaning = activity?.cleaning;
            const hasQT = activity?.qt;
            const hasMyDuty = activity?.myDuty;
            const hasDots = hasEvent || hasCleaning || hasQT || hasMyDuty;

            return (
              <button
                {...props}
                type="button"
                onClick={() => onDateSelect(date)}
                className={cn(
                  "relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-md text-xs font-medium transition-colors sm:h-10 sm:w-10",
                  isSelected && "bg-primary text-primary-foreground shadow-sm",
                  !isSelected && isToday && "bg-primary/10 text-primary ring-1 ring-primary/30",
                  !isSelected && !isToday && "hover:bg-muted/60",
                  isOutside && "text-muted-foreground/40"
                )}
              >
                <span className="leading-none">{format(date, "d")}</span>
                {hasDots && (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {hasEvent && (
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isSelected ? "bg-primary-foreground/90" : "bg-orange-500"
                        )}
                      />
                    )}
                    {hasCleaning && (
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isSelected ? "bg-primary-foreground/90" : "bg-emerald-500"
                        )}
                      />
                    )}
                    {hasQT && (
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isSelected ? "bg-primary-foreground/90" : "bg-sky-500"
                        )}
                      />
                    )}
                    {hasMyDuty && (
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isSelected ? "bg-primary-foreground/90" : "bg-violet-500"
                        )}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          },
        }}
      />

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border/40 px-3 py-2 text-micro-label">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          {t.legendEvent}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {t.legendCleaning}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          {t.legendQt}
        </span>
        {myDutyDateKeys && myDutyDateKeys.size > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {t.legendMyDuty}
          </span>
        )}
      </div>
    </div>
  );
}
