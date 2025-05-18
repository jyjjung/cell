"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Cake, BookOpen, Utensils, Info } from 'lucide-react'; // Using Utensils for Snacks

interface EventCardProps {
  event: AppEvent;
}

function getCategoryIcon(category: EventCategory) {
  switch (category) {
    case EventCategory.QT:
      return <BookOpen className="h-5 w-5 text-primary" />;
    case EventCategory.Event:
      return <CalendarDays className="h-5 w-5 text-accent" />;
    case EventCategory.Birthday:
      return <Cake className="h-5 w-5 text-pink-500" />;
    case EventCategory.Snack:
      return <Utensils className="h-5 w-5 text-orange-500" />; // Utensils as Cookie might not be there
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
}

export default function EventCard({ event }: EventCardProps) {
  const formattedDate = format(parseISO(event.date), "MMMM d, yyyy");

  return (
    <div className="h-full flex flex-col bg-card rounded-lg shadow-md overflow-hidden transition-all hover:shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant={
              event.category === EventCategory.Event ? "default" 
            : event.category === EventCategory.QT ? "secondary"
            : "outline"
          } className="capitalize">
            {event.category}
          </Badge>
          <div className="p-2 bg-muted rounded-full">
            {getCategoryIcon(event.category)}
          </div>
        </div>
        <CardTitle className="text-xl pt-2">{event.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <CardDescription className="text-sm">{formattedDate}</CardDescription>
        {event.details && <p className="mt-2 text-sm text-foreground/80">{event.details}</p>}
      </CardContent>
    </div>
  );
}
