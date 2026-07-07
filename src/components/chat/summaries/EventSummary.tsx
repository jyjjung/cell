"use client";

import React, { useMemo } from 'react';
import { 
  Clock, 
  MapPin, 
  ChevronRight,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import type { AppEvent } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

interface EventSummaryProps {
  eventId: string;
  isSender: boolean;
}

export default function EventSummary({ eventId, isSender }: EventSummaryProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { data: event, loading } = useFirestoreDoc<AppEvent>('events', eventId);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-micro-label font-medium text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!event) {
    return <DeletedContentNotice label={t.deletedContentEvent} />;
  }

  const getDayInfo = () => {
    try {
      if (!event.date) return { dayOfWeek: '???', dayOfMonth: '??' };
      const date = new Date(event.date);
      if (isNaN(date.getTime())) throw new Error();
      return {
        dayOfWeek: format(date, 'EEE'),
        dayOfMonth: format(date, 'd')
      };
    } catch {
      return { dayOfWeek: '???', dayOfMonth: '??' };
    }
  };

  const { dayOfWeek, dayOfMonth } = getDayInfo();

  return (
    <Link href={`/events`} className="block transition-transform active:scale-95">
      <div className={cn(
        "group flex w-full max-w-full flex-col gap-4 rounded-2xl border p-4 shadow-sm transition-all duration-200",
        isSender 
          ? "border-primary/30 bg-primary/5 text-foreground" 
          : "border-border/60 bg-card text-foreground"
      )}>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/40">
             <span className="text-micro-label">{dayOfWeek}</span>
             <span className="text-2xl font-semibold leading-none text-foreground">{dayOfMonth}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
                <Star className="h-3 w-3 text-primary" />
                <span className="text-micro-label">{event.category || 'Event'}</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{event.title}</h3>
            
            <div className="flex flex-col gap-1.5 text-muted-foreground">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{event.startTime ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}` : 'All day'}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {event.details && (
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{event.details}</p>
            </div>
        )}

        <div className="mt-1 flex items-center justify-between">
          <span className="text-micro-label transition-colors group-hover:text-foreground">
            View calendar
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}
