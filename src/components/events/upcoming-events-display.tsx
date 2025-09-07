
"use client";

import { useMemo } from 'react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import EventListItem from './event-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, CalendarDays, Utensils, Sparkles, Cake, GlassWater } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UpcomingEventsDisplayProps {
  events: AppEvent[];
  loading: boolean;
}

interface CategoryEventGroup {
  category: EventCategory;
  events: AppEvent[];
}

const categoryDisplayOrder: EventCategory[] = [
  EventCategory.Event,
  EventCategory.Birthday,
  EventCategory.QT,
  EventCategory.Snack,
];

const categoryDetails: { [key in EventCategory]: { icon: React.ElementType, name: string } } = {
  [EventCategory.Event]: { icon: Sparkles, name: 'Events' },
  [EventCategory.Birthday]: { icon: Cake, name: 'Birthdays' },
  [EventCategory.QT]: { icon: GlassWater, name: 'QTs' },
  [EventCategory.Snack]: { icon: Utensils, name: 'Snacks' },
};


const EventListSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
    </div>
);

export default function UpcomingEventsDisplay({ events, loading }: UpcomingEventsDisplayProps) {
  const categoryGroupedEvents = useMemo((): CategoryEventGroup[] => {
    if (!events) return [];

    const categoriesMap = new Map<EventCategory, AppEvent[]>();

    for (const event of events) {
        if (!categoriesMap.has(event.category)) {
            categoriesMap.set(event.category, []);
        }
        categoriesMap.get(event.category)!.push(event);
    }
    
    return categoryDisplayOrder
        .map(category => ({
            category,
            events: categoriesMap.get(category) || []
        }))
        .filter(group => group.events.length > 0);

  }, [events]);


  if (loading) {
    return <EventListSkeleton />;
  }
  
  if (categoryGroupedEvents.length === 0) {
    return (
        <div className="text-center py-10 px-4 border border-dashed rounded-lg mt-4 flex flex-col items-center justify-center">
            <Info className="h-8 w-8 text-muted-foreground mb-2"/>
            <p className="text-muted-foreground">No upcoming dates scheduled.</p>
        </div>
    );
  }

  return (
    <div className="space-y-3">
        <Accordion type="multiple" className="w-full space-y-2" defaultValue={categoryDisplayOrder}>
            {categoryGroupedEvents.map((group) => {
                const CategoryIcon = categoryDetails[group.category].icon;
                return (
                    <AccordionItem value={group.category} key={group.category} className="border-b-0">
                        <Card className="bg-card/90 rounded-lg shadow-sm w-full transition-colors duration-200">
                            <AccordionTrigger className="p-4 hover:no-underline w-full">
                               <div className="flex items-center space-x-3">
                                    <CategoryIcon className="h-6 w-6 text-primary" />
                                    <div className="text-left">
                                         <CardTitle className="text-lg">{categoryDetails[group.category].name}</CardTitle>
                                    </div>
                               </div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="divide-y divide-border border-t">
                                    {group.events.map(event => <EventListItem key={event.id} event={event} />)}
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                );
            })}
        </Accordion>
    </div>
  );
}
