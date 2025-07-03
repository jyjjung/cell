
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AppEvent } from '@/types';
import EventCard from './event-card';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventListProps {
  eventsToDisplay: AppEvent[];
}

export default function EventList({ eventsToDisplay }: EventListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const isScrollable = el.scrollWidth > el.clientWidth;
      const isNotAtEnd = el.scrollLeft < el.scrollWidth - el.clientWidth - 1; // 1px buffer for precision
      setShowScrollHint(isScrollable && isNotAtEnd);
    } else {
      setShowScrollHint(false);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      checkScrollability();
      window.addEventListener('resize', checkScrollability);
      // For cases where content loads after initial render
      const observer = new MutationObserver(checkScrollability);
      observer.observe(el, { childList: true, subtree: true });

      return () => {
        window.removeEventListener('resize', checkScrollability);
        observer.disconnect();
      };
    }
  }, [checkScrollability, eventsToDisplay]);

  if (eventsToDisplay.length === 0) {
    return (
      <div className="text-center py-6 px-4 border border-dashed rounded-lg mt-2">
        <p className="text-muted-foreground text-sm">No upcoming dates for this category.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={scrollContainerRef} 
        onScroll={checkScrollability}
        className="overflow-x-auto -mx-4 scrollbar-hide"
      >
        <div className="flex gap-4 px-4 pb-4">
          {eventsToDisplay.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
      <div
        className={cn(
          "absolute top-0 right-0 h-full w-16 flex items-center justify-end pointer-events-none transition-opacity duration-300",
          showScrollHint ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      >
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
        <div className="relative mr-2 w-8 h-8 rounded-full bg-background/50 backdrop-blur-sm border flex items-center justify-center">
            <ChevronRight className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </div>
  );
}
