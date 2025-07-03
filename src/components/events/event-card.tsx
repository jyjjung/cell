
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
    <Card className="w-64 shrink-0 flex flex-col group overflow-hidden transition-shadow duration-300 hover:shadow-xl border">
      <CardContent className="p-4 flex flex-col flex-grow">
        <div className="flex items-start gap-4">
          <div className={cn("flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg", colorClass, 'bg-opacity-10')}>
              <Icon className="h-5 w-5" />
          </div>
          <div className="flex-grow">
              <p className="font-semibold leading-tight text-card-foreground">{event.title}</p>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        
        {(event.category === EventCategory.Birthday || descriptionTextForEvent) && (
             <div className="mt-3 pt-3 border-t border-dashed">
                <p className="text-sm text-muted-foreground break-words">
                    {event.category === EventCategory.Birthday ? 'Wishing you a wonderful day!' : descriptionTextForEvent}
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
