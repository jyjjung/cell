"use client";

import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { useAuth } from '@/contexts/auth-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { AppEvent } from '@/types';
import { format } from 'date-fns';
import { ChevronRight, Clock, MapPin, Star } from 'lucide-react';
import Link from 'next/link';
import {
  chatCardEyebrow,
  chatCardFooter,
  chatCardLoading,
  chatCardMeta,
  chatCardShell,
  chatCardTitle,
} from './chat-card-styles';

interface EventSummaryProps {
  eventId: string;
  isSender: boolean;
}

export default function EventSummary({ eventId, isSender }: EventSummaryProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { data: event, loading } = useFirestoreDoc<AppEvent>('events', eventId);

  if (loading) {
    return <div className={chatCardLoading}>Loading…</div>;
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
        dayOfMonth: format(date, 'd'),
      };
    } catch {
      return { dayOfWeek: '???', dayOfMonth: '??' };
    }
  };

  const { dayOfWeek, dayOfMonth } = getDayInfo();

  return (
    <Link href={`/events`} className="block transition-transform active:scale-95">
      <div className={chatCardShell(isSender, 'max-w-[280px]')}>
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[10px] bg-muted">
            <span className="text-[1.375rem] font-semibold leading-none text-foreground">{dayOfMonth}</span>
            <span className={cn(chatCardEyebrow, 'mt-0.5 uppercase tracking-wide')}>{dayOfWeek}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <Star className="h-3 w-3 text-primary" />
              <span className={chatCardEyebrow}>{event.category || 'Event'}</span>
            </div>
            <h3 className={cn(chatCardTitle, 'mb-1.5')}>{event.title}</h3>

            <div className="flex flex-col gap-1 text-muted-foreground">
              {event.date && !event.allDay && event.startTime && (
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{`${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {event.details && (
          <div className="rounded-[10px] bg-muted/50 px-3 py-2">
            <p className={cn(chatCardMeta, 'line-clamp-2 leading-relaxed')}>{event.details}</p>
          </div>
        )}

        <div className={chatCardFooter}>
          <span>View calendar</span>
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}
