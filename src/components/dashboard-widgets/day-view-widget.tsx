"use client";

import { useMemo } from 'react';
import { format, parseISO, startOfToday, isSameDay, isValid, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock, Calendar, ShieldCheck, BookOpenText } from 'lucide-react';
import type { AppEvent } from '@/types';
import { motion } from 'framer-motion';

interface DayViewWidgetProps {
  events: AppEvent[];
  cleaningRoster: any[];
  qtRoster: any[];
}

type DayScheduleItem = {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  type: 'event' | 'cleaning' | 'qt';
  category?: string;
};

export default function DayViewWidget({ events, cleaningRoster, qtRoster }: DayViewWidgetProps) {
  const today = startOfToday();

  const todaysItems = useMemo(() => {
    const items: DayScheduleItem[] = [];

    // Filter events for today
    events.forEach(e => {
      const d = parseISO(e.date);
      const endD = e.endDate ? parseISO(e.endDate) : d;
      
      // Check if today is within [d, endD]
      if (isValid(d) && isValid(endD) && !isSameDay(d, today) && !isSameDay(endD, today)) {
          // Check if today falls between
          if (today < d || today > endD) return;
      } else if (!isSameDay(d, today) && !isSameDay(endD, today)) {
          return;
      }

      items.push({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        allDay: e.allDay ?? true,
        type: 'event',
        category: e.category,
      });
    });

    // Add cleaning for today
    cleaningRoster.forEach(e => {
      const d = parseISO(e.date);
      if (isSameDay(d, today)) {
        items.push({
          id: e.id,
          title: 'Church Cleaning',
          allDay: true,
          type: 'cleaning',
        });
      }
    });

    // Add QT for today
    qtRoster.forEach(e => {
      const d = parseISO(e.date);
      if (isSameDay(d, today)) {
        items.push({
          id: e.id,
          title: e.personName || 'QT Sharing',
          allDay: true,
          type: 'qt',
        });
      }
    });

    // Sort: All day first, then by start time
    return items.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      if (!a.allDay && !b.allDay && a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
  }, [events, cleaningRoster, qtRoster, today]);

  if (todaysItems.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">Today's Schedule</h2>
        <div className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
          {format(today, 'MMM d')}
        </div>
      </div>

      <div className="relative pl-4 border-l-2 border-border/30 space-y-4">
        {todaysItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            {/* Dot on the timeline */}
            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary" />
            
            <div className={cn(
                "p-4 rounded-2xl border bg-card/40 backdrop-blur-sm shadow-sm flex items-start gap-4",
                item.type === 'cleaning' ? "border-emerald-500/20" : 
                item.type === 'qt' ? "border-primary/20" : "border-orange-500/20"
            )}>
              <div className={cn(
                "p-2 rounded-xl shrink-0 opacity-80",
                item.type === 'cleaning' ? "bg-emerald-500/10 text-emerald-500" : 
                item.type === 'qt' ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500"
              )}>
                {item.type === 'cleaning' ? <ShieldCheck className="h-4 w-4" /> : 
                 item.type === 'qt' ? <BookOpenText className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm truncate">{item.title}</h3>
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase shrink-0">
                    {item.allDay ? 'All Day' : (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.startTime} {item.endTime ? ` - ${item.endTime}` : ''}
                        </div>
                    )}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">
                    {item.type === 'cleaning' ? 'Service' : item.type === 'qt' ? 'Spiritual' : item.category || 'General'}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
