
"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Cake, BookOpen, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventListItemProps {
  event: AppEvent;
}

const categoryStyles: { [key in EventCategory]: { icon: React.ElementType, classes: string } } = {
  [EventCategory.Event]: { icon: CalendarDays, classes: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  [EventCategory.Birthday]: { icon: Cake, classes: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  [EventCategory.QT]: { icon: BookOpen, classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  [EventCategory.Snack]: { icon: Utensils, classes: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
};


export default function EventListItem({ event }: EventListItemProps) {
  const parsedDate = parseISO(event.date);
  const month = format(parsedDate, "MMM");
  const day = format(parsedDate, "d");

  const styleInfo = categoryStyles[event.category];
  
  let descriptionText = '';
  if (event.category === EventCategory.Event) {
      descriptionText = event.summary || event.details || '';
  }

  return (
    <div className="flex items-start space-x-4 p-4">
      <div className="flex-shrink-0 w-16 text-center rounded-lg bg-muted/50 p-2">
        <div className="text-sm font-bold text-primary">{month.toUpperCase()}</div>
        <div className="text-3xl font-bold text-foreground">{day}</div>
      </div>
      <div className="flex-grow pt-1">
        <div className="flex items-center space-x-3 mb-1">
          <div className={cn("flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full", styleInfo.classes)}>
            <styleInfo.icon className="h-4 w-4" />
          </div>
          <p className="font-semibold text-card-foreground">{event.title}</p>
        </div>
        <p className="text-sm text-muted-foreground ml-11">{format(parsedDate, "EEEE")}</p>
        {descriptionText && (
          <p className="text-sm text-muted-foreground mt-2 ml-11">{descriptionText}</p>
        )}
      </div>
    </div>
  );
}
