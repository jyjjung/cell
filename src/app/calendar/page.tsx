
"use client";

import { useState, useMemo } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { useEvents } from '@/hooks/use-events';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DayProps } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';


const categoryBackgroundColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'bg-purple-100 dark:bg-purple-500/20',
  [EventCategory.Birthday]: 'bg-pink-100 dark:bg-pink-500/20',
  [EventCategory.QT]: 'bg-blue-100 dark:bg-blue-500/20',
  [EventCategory.Snack]: 'bg-orange-100 dark:bg-orange-500/20',
};

const categoryTextColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'text-purple-800 dark:text-purple-200',
  [EventCategory.Birthday]: 'text-pink-800 dark:text-pink-200',
  [EventCategory.QT]: 'text-blue-800 dark:text-blue-200',
  [EventCategory.Snack]: 'text-orange-800 dark:text-orange-200',
};

const categoryBorderColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'border-purple-500',
  [EventCategory.Birthday]: 'border-pink-500',
  [EventCategory.QT]: 'border-blue-500',
  [EventCategory.Snack]: 'border-orange-500',
};


export default function CalendarPage() {
  const { events, loading } = useEvents();
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AppEvent[]>();
    if (!events) return map;
    events.forEach(event => {
      try {
        const eventDateStr = format(parseISO(event.date), 'yyyy-MM-dd');
        if (!map.has(eventDateStr)) {
          map.set(eventDateStr, []);
        }
        map.get(eventDateStr)!.push(event);
      } catch (e) {
        console.error("Error parsing event date for calendar:", event.date, e);
      }
    });
    // Sort events within each day
    map.forEach((dayEvents) => {
        dayEvents.sort((a,b) => a.category.localeCompare(b.category));
    });
    return map;
  }, [events]);

  function CustomDay({ date, displayMonth }: DayProps) {
    const isCurrentMonth = displayMonth.getMonth() === date.getMonth();
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateStr) || [];
    const isToday = isSameDay(date, new Date());

    return (
      <div
        className={cn(
          "relative flex h-full flex-col p-1.5 transition-colors border-t border-border",
          !isCurrentMonth && "bg-muted/30 text-muted-foreground/50",
          isSameDay(date, selectedDate || new Date(0)) && isCurrentMonth && "bg-accent"
        )}
      >
        <time
          dateTime={format(date, 'yyyy-MM-dd')}
          className={cn(
            "self-start text-xs font-semibold p-1 rounded-full",
            isToday && "flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground"
          )}
        >
          {format(date, 'd')}
        </time>
        {isCurrentMonth && dayEvents.length > 0 && (
          <div className="mt-1 flex-grow overflow-y-auto -mx-1 px-1 space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className={cn(
                  "text-[11px] p-1 rounded-md leading-tight truncate font-medium",
                  categoryBackgroundColors[event.category],
                  categoryTextColors[event.category],
                )}
              >
                {event.title}
              </div>
            ))}
             {dayEvents.length > 3 && (
              <div className="text-[10px] text-muted-foreground pl-1 pt-0.5">+ {dayEvents.length - 3} more</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateStr) || [];
  }, [selectedDate, eventsByDate]);

  const CalendarSkeleton = () => (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="w-full aspect-[1.2/1]" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <CalendarIcon className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Event Calendar</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {loading ? <CalendarSkeleton /> : (
            <Card>
              <CardContent className="p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={month}
                  onMonthChange={setMonth}
                  className="p-0"
                  classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4 w-full border-x border-b border-border",
                      table: "w-full border-collapse",
                      caption_label: "text-base font-medium",
                      head_row: "flex border-b border-border",
                      head_cell: "text-muted-foreground w-[14.28%] text-center font-normal text-[0.8rem] py-2",
                      row: "flex w-full",
                      cell: "h-32 w-[14.28%] text-sm p-0 relative focus-within:relative focus-within:z-20 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-border",
                      day: "h-full w-full p-0 font-normal",
                      day_selected: "", // We handle selection styling in CustomDay
                      day_today: "", // We handle today styling in CustomDay
                      day_outside: "", // We handle outside day styling in CustomDay
                      day_disabled: "text-muted-foreground opacity-50",
                  }}
                  components={{ Day: CustomDay }}
                />
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
              </CardTitle>
              <CardDescription>
                {selectedDayEvents.length} event(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : selectedDayEvents.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {selectedDayEvents.map(event => (
                    <div key={event.id} className={cn("p-3 rounded-lg border-l-4", categoryBorderColors[event.category])}>
                       <div className="flex items-start justify-between">
                         <p className="font-semibold">{event.title}</p>
                         <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full", categoryBackgroundColors[event.category], categoryTextColors[event.category] )}>{event.category}</div>
                       </div>
                       {event.details && <p className="text-sm text-muted-foreground mt-1">{event.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No events scheduled.</p>
              )}
            </CardContent>
            
            <Separator className="mx-6" />

            <CardHeader>
                <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {Object.values(EventCategory).map(category => (
                        <div key={category} className="flex items-center">
                            <span className={cn("w-3 h-3 mr-3 rounded-sm", categoryBackgroundColors[category])} />
                            <span className="text-sm text-muted-foreground">{category}</span>
                        </div>
                    ))}
                </div>
            </CardContent>

          </Card>
        </div>
      </div>
    </div>
  );
}
