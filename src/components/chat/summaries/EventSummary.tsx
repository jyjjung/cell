"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight,
  Info,
  Layers,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEvents } from '@/hooks/use-events';
import { format, parseISO, isValid } from 'date-fns';
import Link from 'next/link';

interface EventSummaryProps {
  eventId: string;
  isSender: boolean;
}

export default function EventSummary({ eventId, isSender }: EventSummaryProps) {
  const { events } = useEvents();
  
  const event = useMemo(() => 
    events.find(e => e.id === eventId), 
    [events, eventId]
  );

  if (!event) return (
    <div className="p-4 bg-muted/20 border border-white/5 rounded-2xl text-[11px] font-bold opacity-30">
        Loading Event Summary...
    </div>
  );

  const getDayInfo = () => {
    try {
      if (!event.date) return { dayOfWeek: '???', dayOfMonth: '??' };
      const date = new Date(event.date);
      if (isNaN(date.getTime())) throw new Error();
      return {
        dayOfWeek: format(date, 'EEE').toUpperCase(),
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
        "flex flex-col gap-4 p-5 rounded-[1.8rem] border shadow-2xl transition-all duration-300 w-full min-w-[280px] sm:min-w-[320px]",
        isSender 
          ? "bg-[#007AFF]/10 border-[#007AFF]/20 text-white" 
          : "bg-[#3B3B3D]/30 border-white/5 text-white backdrop-blur-2xl"
      )}>
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-[1.5rem] bg-card border border-white/10 flex flex-col items-center justify-center shrink-0 shadow-lg">
             <span className="text-[11px] font-black text-primary tracking-widest uppercase">{dayOfWeek}</span>
             <span className="text-[28px] font-black text-white p-0 -mt-1">{dayOfMonth}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">{event.category || 'Event'}</span>
            </div>
            <h3 className="text-[17px] font-black leading-tight text-white mb-2 truncate">{event.title}</h3>
            
            <div className="flex flex-col gap-1.5 opacity-70">
              <div className="flex items-center gap-2 text-[12px] font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{event.startTime ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}` : 'All Day'}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-[12px] font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {event.details && (
            <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                <p className="text-[11px] font-medium leading-relaxed opacity-60 line-clamp-2">{event.details}</p>
            </div>
        )}

        <div className="flex items-center justify-between mt-1 group-hover:translate-x-2 transition-transform duration-300">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#007AFF] group-hover:text-white transition-colors">
            See Calendar
          </span>
          <ChevronRight className="w-4 h-4 text-[#007AFF] opacity-40 group-hover:opacity-100 group-hover:text-white transition-all" strokeWidth={3} />
        </div>
      </div>
    </Link>
  );
}
