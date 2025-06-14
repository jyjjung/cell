
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

function getCategoryIcon(category: EventCategory, isCompact?: boolean) {
  const iconSize = isCompact ? "h-4 w-4" : "h-5 w-5";
  switch (category) {
    case EventCategory.QT:
      return <BookOpen className={cn(iconSize, "text-primary")} />;
    case EventCategory.Event:
      return <CalendarDays className={cn(iconSize, "text-accent")} />;
    case EventCategory.Birthday:
      return <Cake className={cn(iconSize, "text-pink-500")} />;
    case EventCategory.Snack:
      return <Utensils className={cn(iconSize, "text-orange-500")} />;
    default:
      return <Info className={cn(iconSize, "text-gray-500")} />;
  }
}

export default function EventCard({ event, isCompact = false }: EventCardProps) {
  const formattedDate = format(parseISO(event.date), isCompact ? "MMM d, yy" : "MMMM d, yyyy");
  // Prioritize summary, fallback to details. Ensure it's not undefined for display.
  const displayDescription = (event.summary && event.summary.trim() !== '') ? event.summary : (event.details || '');

  if (isCompact) {
    return (
      <div className="h-full flex flex-col bg-card rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-grow">
            <CardTitle className="text-base leading-tight mb-1">{event.title}</CardTitle>
            <Badge variant={
                event.category === EventCategory.Event ? "default"
              : event.category === EventCategory.QT ? "secondary"
              : "outline"
            } className="capitalize text-xs px-1.5 py-0.5 h-auto">
              {event.category}
            </Badge>
          </div>
          <div className="p-1.5 bg-muted rounded-full shrink-0">
            {getCategoryIcon(event.category, isCompact)}
          </div>
        </div>
        <CardDescription className="text-xs mt-1.5">{formattedDate}</CardDescription>
        {displayDescription && displayDescription.trim() !== '' && (
          <p className="mt-1.5 text-xs text-foreground/70 line-clamp-2">{displayDescription}</p>
        )}
      </div>
    );
  }

  // Non-compact view
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
        {/* In non-compact view, show full details */}
        {event.details && event.details.trim() !== '' && (
          <p className="mt-2 text-sm text-foreground/80">{event.details}</p>
        )}
         {/* Optionally display summary here too if it exists and differs from details */}
        {event.summary && event.summary.trim() !== '' && event.summary !== event.details && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground">Summary:</p>
            <p className="text-xs text-muted-foreground">{event.summary}</p>
          </div>
        )}
      </CardContent>
    </div>
  );
}
