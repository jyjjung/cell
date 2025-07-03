
"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Cake, BookOpen, Utensils, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: AppEvent;
}

const categoryStyles: { [key in EventCategory]: { icon: React.ElementType, colorClass: string } } = {
  [EventCategory.QT]: { icon: BookOpen, colorClass: "text-blue-500" },
  [EventCategory.Event]: { icon: CalendarDays, colorClass: "text-purple-500" },
  [EventCategory.Birthday]: { icon: Cake, colorClass: "text-pink-500" },
  [EventCategory.Snack]: { icon: Utensils, colorClass: "text-orange-500" },
};

function getCategoryStyle(category: EventCategory) {
  return categoryStyles[category] || { icon: Info, colorClass: "text-gray-500" };
}

export default function EventCard({ event }: EventCardProps) {
  const formattedDate = format(parseISO(event.date), "EEEE, MMM d");
  const { icon: Icon, colorClass } = getCategoryStyle(event.category);

  let descriptionTextForEvent: string | null = null;
  if (event.category === EventCategory.Event) {
    if (event.summary && event.summary.trim() !== '') {
      descriptionTextForEvent = event.summary;
    } else if (event.details && event.details.trim() !== '') {
      descriptionTextForEvent = event.details;
    }
  }

  return (
    <Card className="w-64 shrink-0 h-full flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">
      <CardContent className="p-4 flex flex-col flex-grow">
        <div className="flex items-start gap-3 mb-3">
            <div className={cn("p-1.5 bg-muted rounded-md", colorClass, 'bg-opacity-10')}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-grow">
                <p className="font-semibold leading-tight">{event.title}</p>
                <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
        </div>
        
        <div className="text-sm text-foreground/80 break-words flex-grow min-h-[2.5rem]">
            {event.category === EventCategory.Birthday && <p>Wishing you a wonderful day!</p>}
            {event.category === EventCategory.Event && descriptionTextForEvent && <p>{descriptionTextForEvent}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
