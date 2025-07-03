
"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Cake, BookOpen, Utensils, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: AppEvent;
  isCompact?: boolean;
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

export default function EventCard({ event, isCompact = false }: EventCardProps) {
  const formattedDate = format(parseISO(event.date), isCompact ? "MMM d" : "EEEE, MMMM d, yyyy");
  const { icon: Icon, colorClass } = getCategoryStyle(event.category);

  let descriptionTextForEvent: string | null = null;
  if (event.category === EventCategory.Event) {
    if (event.summary && event.summary.trim() !== '') {
      descriptionTextForEvent = event.summary;
    } else if (event.details && event.details.trim() !== '') {
      descriptionTextForEvent = event.details;
    }
  }

  if (isCompact) {
    return (
      <Card className="h-full flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/40">
        <CardContent className="p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-2">
                <div className={cn("p-1.5 bg-muted rounded-md", colorClass, 'bg-opacity-10')}>
                    <Icon className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="capitalize text-xs px-1.5 py-0.5 h-auto border-dashed">
                    {event.category}
                </Badge>
             </div>
          </div>
          <div className="flex-grow min-w-0">
            <p className="font-semibold leading-tight">{event.title}</p>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            <p>{formattedDate}</p>
             {event.category === EventCategory.Event && descriptionTextForEvent && (
              <p className="mt-1.5 text-xs text-foreground/70 break-words flex-shrink min-h-0 line-clamp-2">
                {descriptionTextForEvent}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Non-compact view
  return (
    <Card className="h-full flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className={cn("p-1.5 bg-muted rounded-md", colorClass, 'bg-opacity-20')}>
                  <Icon className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="capitalize">
                  {event.category}
              </Badge>
           </div>
        </div>
        <CardTitle className="text-xl pt-2">{event.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <CardDescription className="text-sm">{formattedDate}</CardDescription>
        {event.category === EventCategory.Event && descriptionTextForEvent && (
          <p className="mt-2 text-sm text-foreground/80 break-words"> 
            {descriptionTextForEvent}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
