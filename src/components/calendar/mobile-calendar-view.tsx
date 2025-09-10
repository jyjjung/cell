
"use client";

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import CalendarKey from '@/components/calendar/calendar-key';
import type { AppEvent } from '@/types';
import { categoryBackgroundColors, categoryTextColors, categoryBorderColors } from '@/lib/color-utils';
import { CalendarIcon } from 'lucide-react';

interface MobileCalendarViewProps {
  selectedDate: Date | undefined;
  onSelectedDateChange: Dispatch<SetStateAction<Date | undefined>>;
  eventsByDate: Map<string, AppEvent[]>;
  selectedDayEvents: AppEvent[];
}

export default function MobileCalendarView({
  selectedDate,
  onSelectedDateChange,
  eventsByDate,
  selectedDayEvents,
}: MobileCalendarViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{selectedDate ? format(selectedDate, "PPP") : "No date selected"}</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <CalendarIcon className="h-4 w-4" />
              <span className="sr-only">Open calendar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onSelectedDateChange}
              initialFocus
              modifiers={{
                hasEvents: Array.from(eventsByDate.keys()).map(dateStr => new Date(dateStr))
              }}
              modifiersClassNames={{
                hasEvents: "font-bold text-primary"
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <Card>
        <CardContent className="p-2 space-y-2">
            {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map(event => (
                    <div key={event.id} className={cn("p-2 rounded-md border-l-4", categoryBorderColors[event.category])}>
                        <div className="flex items-start justify-between">
                            <p className="font-semibold text-sm">{event.title}</p>
                            <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", categoryBackgroundColors[event.category], categoryTextColors[event.category])}>
                                {event.category}
                            </div>
                        </div>
                        {event.details && <p className="text-xs text-muted-foreground mt-1">{event.details}</p>}
                    </div>
                ))
            ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No events scheduled.</p>
            )}
        </CardContent>
      </Card>
      
      <CalendarKey />
    </div>
  );
}
