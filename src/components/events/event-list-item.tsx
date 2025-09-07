
"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Cake, Sparkles, Utensils, GlassWater } from 'lucide-react';

interface EventListItemProps {
  event: AppEvent;
}

const categoryStyles: { [key in EventCategory]: { bg: string; text: string; } } = {
  [EventCategory.Event]: { bg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-700 dark:text-purple-300" },
  [EventCategory.Birthday]: { bg: "bg-pink-100 dark:bg-pink-900/50", text: "text-pink-700 dark:text-pink-300" },
  [EventCategory.QT]: { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-700 dark:text-blue-300" },
  [EventCategory.Snack]: { bg: "bg-orange-100 dark:bg-orange-900/50", text: "text-orange-700 dark:text-orange-300" },
};


export default function EventListItem({ event }: EventListItemProps) {
  const parsedDate = parseISO(event.date);
  const dayOfWeek = format(parsedDate, "EEEE");

  const styleInfo = categoryStyles[event.category];
  
  let descriptionText = '';
  if (event.category === EventCategory.Event && event.summary) {
      descriptionText = event.summary;
  } else if (event.category === EventCategory.Event && event.details) {
      descriptionText = event.details;
  }

  return (
    <div className="flex items-center space-x-4 p-4 transition-colors hover:bg-muted/50">
       <div className={cn(
           "flex-shrink-0 w-16 h-16 flex flex-col items-center justify-center rounded-lg", 
           styleInfo.bg, 
           styleInfo.text
        )}>
         <p className="text-sm font-semibold uppercase">{format(parsedDate, "MMM")}</p>
         <p className="text-2xl font-bold">{format(parsedDate, "d")}</p>
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-card-foreground">{event.title}</p>
        <p className="text-sm text-muted-foreground">{dayOfWeek}</p>
        {descriptionText && (
          <p className="text-sm text-muted-foreground mt-1">{descriptionText}</p>
        )}
      </div>
    </div>
  );
}
