"use client";

import { useState, useMemo, type ComponentProps } from 'react';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import { useEvents } from '@/hooks/use-events';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DayProps } from 'react-day-picker';

const categoryColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'bg-purple-500',
  [EventCategory.Birthday]: 'bg-pink-500',
  [EventCategory.QT]: 'bg-blue-500',
  [EventCategory.Snack]: 'bg-orange-500',
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
    return map;
  }, [events]);

  function CustomDay(props: DayProps) {
    const { date, displayMonth } = props;
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateStr);
    
    return (
      <div className={cn(
        "relative h-full w-full p-0 transition-colors rounded-md",
        isSameDay(date, selectedDate || new Date(0)) ? "bg-accent" : "hover:bg-accent/50"
      )}>
        <div className="relative w-full h-full flex flex-col items-center justify-center">
            <span>{format(date, 'd')}</span>
            {dayEvents && dayEvents.length > 0 && displayMonth.getMonth() === date.getMonth() && (
                <div className="absolute bottom-1.5 flex space-x-1">
                    {[...new Set(dayEvents.map(e => e.category))].slice(0, 4).map(category => (
                        <div key={category} className={cn("h-1.5 w-1.5 rounded-full", categoryColors[category])}></div>
                    ))}
                </div>
            )}
        </div>
      </div>
    );
  }

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return (eventsByDate.get(dateStr) || []).sort((a,b) => a.category.localeCompare(b.category));
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="md:col-span-2 lg:col-span-3">
          {loading ? <CalendarSkeleton /> : (
            <Card>
              <CardContent className="p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={month}
                  onMonthChange={setMonth}
                  className="p-3"
                  classNames={{
                      cell: "h-16 w-16 text-center text-sm p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                      day: "h-16 w-16 p-0 font-normal",
                  }}
                  components={{ Day: CustomDay }}
                />
              </CardContent>
            </Card>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground items-center">
            <span className="font-semibold">Legend:</span>
            {Object.entries(EventCategory).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", categoryColors[value])}></div>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-1 lg:col-span-2">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
              </CardTitle>
              <CardDescription>
                {selectedDayEvents.length} event(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : selectedDayEvents.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {selectedDayEvents.map(event => (
                    <div key={event.id} className={cn("p-3 rounded-lg border-l-4", categoryBorderColors[event.category])}>
                       <div className="flex items-start justify-between">
                         <p className="font-semibold">{event.title}</p>
                         <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full text-white", categoryColors[event.category])}>{event.category}</div>
                       </div>
                       {event.details && <p className="text-sm text-muted-foreground mt-1">{event.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No events scheduled.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}