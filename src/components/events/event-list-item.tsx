
"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Cake, Sparkles, Utensils, GlassWater } from 'lucide-react';

interface EventListItemProps {
  event: AppEvent;
}

const categoryStyles: { [key in EventCategory]: { bg: string; text: string; icon: React.ElementType } } = {
  [EventCategory.Event]: { bg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-700 dark:text-purple-300", icon: Sparkles },
  [EventCategory.Birthday]: { bg: "bg-pink-100 dark:bg-pink-900/50", text: "text-pink-700 dark:text-pink-300", icon: Cake },
  [EventCategory.QT]: { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-700 dark:text-blue-300", icon: GlassWater },
  [EventCategory.Snack]: { bg: "bg-orange-100 dark:bg-orange-900/50", text: "text-orange-700 dark:text-orange-300", icon: Utensils },
};


export default function EventListItem({ event }: EventListItemProps) {
  const parsedDate = parseISO(event.date);
  const month = format(parsedDate, "MMM");
  const day = format(parsedDate, "d");

  const styleInfo = categoryStyles[event.category];
  
  let descriptionText = '';
  if (event.category === EventCategory.Event && event.summary) {
      descriptionText = event.summary;
  } else if (event.category === EventCategory.Event && event.details) {
      descriptionText = event.details;
  }

  return (
    <div className="flex items-start space-x-4 p-4 transition-colors hover:bg-muted/50">
      <div className={cn("flex-shrink-0 w-16 text-center rounded-lg p-2 transition-colors", styleInfo.bg)}>
        <div className={cn("text-sm font-bold transition-colors", styleInfo.text)}>{month.toUpperCase()}</div>
        <div className={cn("text-3xl font-bold transition-colors", styleInfo.text)}>{day}</div>
      </div>
      <div className="flex-grow pt-1">
        <p className="font-semibold text-card-foreground">{event.title}</p>
        <p className="text-sm text-muted-foreground">{format(parsedDate, "EEEE")}</p>
        {descriptionText && (
          <p className="text-sm text-muted-foreground mt-2">{descriptionText}</p>
        )}
      </div>
    </div>
  );
}
